const crypto = require('crypto');
const Otp = require('../models/Otp');
const EmailService = require('./emailService');

class OtpService {
  /**
   * Secure SHA-256 hash helper for 6-digit OTP verification codes
   */
  static hashOtp(code) {
    return crypto.createHash('sha256').update(String(code).trim()).digest('hex');
  }

  /**
   * Generate and dispatch a secure 6-digit OTP
   * Enforces 60-second cooldown between resends and 10-minute expiry
   */
  static async generateAndSendOtp({ email, userId = null, purpose = 'signup' }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      const error = new Error('Valid email address is required');
      error.statusCode = 400;
      throw error;
    }

    // 1. Enforce 60s cooldown from last request
    const latestOtp = await Otp.findOne({
      email: cleanEmail,
      purpose,
    }).sort({ createdAt: -1 });

    if (latestOtp && latestOtp.lastSentAt) {
      const elapsedMs = Date.now() - new Date(latestOtp.lastSentAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        const error = new Error(`Please wait ${remainingSeconds} seconds before requesting a new code.`);
        error.statusCode = 429;
        throw error;
      }
    }

    // 2. Generate 6-digit cryptographic code (100000 to 999999)
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Mark previous unused OTPs for this email and purpose as replaced
    await Otp.updateMany(
      { email: cleanEmail, purpose, usedAt: null },
      { $set: { usedAt: new Date() } }
    );

    // 4. Save new active OTP record
    const otpDoc = await Otp.create({
      userId,
      email: cleanEmail,
      codeHash,
      purpose,
      expiresAt,
      attempts: 0,
      lastSentAt: new Date(),
      usedAt: null,
    });

    // 5. Send Email via EmailService (SMTP or console fallback)
    await EmailService.sendOtpEmail(cleanEmail, code, purpose);

    return {
      success: true,
      email: cleanEmail,
      purpose,
      expiresInSeconds: 600,
      cooldownSeconds: 60,
    };
  }

  /**
   * Verify candidate 6-digit OTP
   * Enforces max 5 attempts, expiry, and single-use invalidation
   */
  static async verifyOtp({ email, code, purpose = 'signup' }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanEmail || !cleanCode) {
      const error = new Error('Email and 6-digit verification code are required');
      error.statusCode = 400;
      throw error;
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      const error = new Error('Verification code must be exactly 6 digits');
      error.statusCode = 400;
      throw error;
    }

    // Find latest unused OTP record
    const otp = await Otp.findOne({
      email: cleanEmail,
      purpose,
      usedAt: null,
    }).sort({ createdAt: -1 });

    if (!otp) {
      const error = new Error('No active verification code found for this email. Please request a new one.');
      error.statusCode = 400;
      throw error;
    }

    // Check expiration
    if (new Date() > new Date(otp.expiresAt)) {
      otp.usedAt = new Date();
      await otp.save();
      const error = new Error('Verification code has expired. Please request a new code.');
      error.statusCode = 400;
      throw error;
    }

    // Check maximum attempts (5 max)
    if (otp.attempts >= 5) {
      otp.usedAt = new Date(); // Lock this OTP permanently
      await otp.save();
      const error = new Error('Too many invalid attempts. This code has been locked for security. Please request a new code.');
      error.statusCode = 400;
      throw error;
    }

    // Check code match
    const candidateHash = this.hashOtp(cleanCode);
    if (candidateHash !== otp.codeHash) {
      otp.attempts += 1;
      await otp.save();
      const remaining = 5 - otp.attempts;
      const error = new Error(
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Invalid code. Maximum attempts reached. Code locked.'
      );
      error.statusCode = 400;
      throw error;
    }

    // Code is valid: Mark used immediately (single-use guarantee)
    otp.usedAt = new Date();
    await otp.save();

    return {
      success: true,
      email: cleanEmail,
      purpose,
      otp,
    };
  }
}

module.exports = OtpService;
