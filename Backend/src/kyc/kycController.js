const KycJob = require('./kycJobModel');
const User   = require('../user/userModel');
const { kycQueue } = require('../core/queue');
const AppError = require('../core/AppErrors');

exports.submitKyc = async (req, res, next) => {
  try {
    // 1) Ensure all three images are present
    if (!req.files.idFront || !req.files.idBack || !req.files.selfie) {
      return next(new AppError('All three images (front, back, selfie) are required', 400));
    }

    // 2) Create the KYC job record
    const job = await KycJob.create({
      user:   req.user.id,
      images: {
        idFront: req.files.idFront[0].path,
        idBack:  req.files.idBack[0].path,
        selfie:  req.files.selfie[0].path
      },
      status: 'queued'
    });

    // 3) Link job to user document
    await User.findByIdAndUpdate(req.user.id, {
      kycStatus: 'pending',
      kycJob:    job._id
    });

    // 4) Enqueue job (fire‑and‑forget so HTTP cycle ends immediately)
    kycQueue.add({ jobId: job._id }).catch(err => {
      console.error('KYC Queue add error:', err);
    });

    // 5) Return 202 to client
    return res.status(202).json({
      status: 'success',
      data:   { jobId: job._id }
    });
  } catch (err) {
    next(err);
  }
};

exports.getKycStatus = async (req, res, next) => {
  const job = await KycJob.findById(req.params.jobId);
  if (!job || job.user.toString() !== req.user.id) {
    return next(new AppError('Job not found or not yours', 404));
  }
  res.json({ status: job.status, cid: job.cid, txHash: job.txHash });
};
