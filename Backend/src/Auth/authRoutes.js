const express = require("express");
const authController = require("./authController");
const authMiddleware = require('./authMiddlewares')
// const passport = require("passport");

const router = express.Router();


router.post("/signup", authController.signup); 
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);


router.post("/login", authController.login);

//user forgets his password and reset it

router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-reset-code/:token", authController.verifyResetCode); 
router.patch("/reset-password", authController.resetPassword);

router.post("/logout", authMiddleware.protect, authController.logout);
router.post("/refresh-token", authController.refreshToken);

module.exports = router;