// src/workers/kycProcessor.js
require('dotenv').config();
const { kycQueue } = require('../core/queue');


// ===== debug listeners =====
kycQueue.on('waiting',  jobId => console.log(`🐶 queued ${jobId}`));
kycQueue.on('active',   job   => console.log(`⚙️ active ${job.id}`));
kycQueue.on('completed', job   => console.log(`✅ completed ${job.id}`));
kycQueue.on('failed',    (job, err) => console.error(`❌ failed ${job.id}`, err));
kycQueue.on('error',     err   => console.error('🔴 queue error', err));
// ============
const axios    = require('axios');
const fs       = require('fs');
const path     = require('path');
const FormData = require('form-data');

const KycJob   = require('../kyc/kycJobModel');
const User     = require('../user/userModel');
const { io, activeUsers } = require('../../server');  // adjust if your server entrypoint is elsewhere

// Thresholds and service URLs
const OCR_MIN        = 0.8;
const MATCH_MIN      = 0.8;
const OCR_URL        = process.env.OCR_URL      || 'http://localhost:5001/ocr';
const MATCH_URL      = process.env.MATCH_URL    || 'http://localhost:5002/match';
const BLOCKCHAIN_URL = process.env.BLOCKCHAIN_URL || 'http://localhost:4000/blockchain/issue';

/**
 * Emit status updates to both MongoDB/User and Socket.IO
 */
async function emitUpdate(jobId, userId, status, extra = {}) {
  console.log(`Emitting update for job ${jobId}, user ${userId}, status ${status}`);
  const socketId = activeUsers.get(userId.toString());
  if (socketId) {
    console.log(`Sending kycUpdate to socket ${socketId}`);
    io.to(socketId).emit('kycUpdate', { jobId, status, ...extra });
  } else {
    console.log(`User ${userId} not connected, cannot send update`);
  }
  await KycJob.findByIdAndUpdate(jobId, { status, ...extra });
  await User.findByIdAndUpdate(userId, { kycStatus: status, ...extra });
}
// Process KYC jobs
kycQueue.process(async ({ data }) => {
  const { jobId } = data;
  const kyc = await KycJob.findById(jobId);
  if (!kyc) throw new Error(`KYC Job ${jobId} not found`);

  const userId = kyc.user.toString();

  // 1) processing
  await emitUpdate(jobId, userId, 'processing');

  // 2) OCR
  const ocrForm = new FormData();
  ocrForm.append('id_front', fs.createReadStream(path.resolve(kyc.images.idFront)));
  ocrForm.append('id_back',  fs.createReadStream(path.resolve(kyc.images.idBack)));
  const ocrRes = await axios.post(OCR_URL, ocrForm, { 
    headers: ocrForm.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity 
  });
  const { confidence } = ocrRes.data;
  if (confidence < OCR_MIN) {
    return emitUpdate(jobId, userId, 'needs_review', { ocrConfidence: confidence });
  }

  // 3) Face‑Match
  const matchForm = new FormData();
  matchForm.append('selfie',   fs.createReadStream(path.resolve(kyc.images.selfie)));
  matchForm.append('id_image', fs.createReadStream(path.resolve(kyc.images.idFront)));
  matchForm.append('user_id',  userId);
  const matchRes = await axios.post(MATCH_URL, matchForm, {
    headers: matchForm.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity 
  });
  const { matchScore } = matchRes.data;
  if (matchScore < MATCH_MIN) {
    return emitUpdate(jobId, userId, 'needs_review', { matchScore, ocrConfidence: confidence });
  }

  // 4) Blockchain issuance
  const bcRes = await axios.post(BLOCKCHAIN_URL, { userId, status: 'approved' });
  const { cid, txHash } = bcRes.data;

  // 5) final approved
  await emitUpdate(jobId, userId, 'approved', { cid, txHash, matchScore, ocrConfidence: confidence });
});
