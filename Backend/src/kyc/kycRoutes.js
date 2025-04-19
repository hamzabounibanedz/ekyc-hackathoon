const express = require('express');
const { protect } = require('../Auth/authMiddlewares');
const { submitKyc, getKycStatus } = require('./kycController');
const { uploadKyc } = require('../core/multer');

const router = express.Router();

router.use(protect);
router.post(
  '/submit',
  uploadKyc.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack',  maxCount: 1 },
    { name: 'selfie',  maxCount: 1 }
  ]),
  submitKyc
);
router.get('/status/:jobId', getKycStatus);

module.exports = router;
