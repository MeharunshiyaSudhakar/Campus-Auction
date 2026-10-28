const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OtpService = require('./otpService');

class AuthService {
  /**
   * Generate JWT Token
   */
  static generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'campus_auction_super_secret_jwt_key_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Register a new student user
   * Sets emailVerified: false and dispatches 6-digit email OTP
   */
  static async registerUser({ name, email, password, phone, campusRollNumber }) {
    if (!campusRollNumber || !campusRollNumber.trim()) {
      const error = new Error('Campus roll number is required and must be unique');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanRoll = campusRollNumber.trim().toUpperCase();

    // Check if email already registered
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      const error = new Error('A student with this college email already exists');
      error.statusCode = 409;
      throw error;
    }

    // Check if roll number already registered
    const existingRoll = await User.findOne({ campusRollNumber: cleanRoll });
    if (existingRoll) {
      const error = new Error('A student with this campus roll number is already registered');
      error.statusCode = 409;
      throw error;
    }

    // Create user with unverified email state
    const user = await User.create({
      name: (name || '').trim(),
      email: cleanEmail,
      password,
      phone: phone ? phone.trim() : '',
      campusRollNumber: cleanRoll,
      emailVerified: false,
    });

    // Generate & Dispatch 6-Digit Email OTP
    await OtpService.generateAndSendOtp({
      email: cleanEmail,
      userId: user._id,
      purpose: 'signup',
    });

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: cleanEmail,
        emailVerified: false,
      },
      otpSent: true,
      message: 'Registration successful! Verification code sent to your campus email.',
    };
  }

  /**
   * Verify email signup OTP and issue authenticated JWT session
   */
  static async verifyEmailOtp({ email, code }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    // 1. Verify OTP code
    await OtpService.verifyOtp({
      email: cleanEmail,
      code: cleanCode,
      purpose: 'signup',
    });

    // 2. Load user and set emailVerified = true
    const user = await User.findOne({ email: cleanEmail }).select('+email');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    user.emailVerified = true;
    await user.save();

    // 3. Issue JWT session
    const token = this.generateToken(user._id);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: true,
        createdAt: user.createdAt,
      },
      token,
      message: 'Email verified successfully! Welcome to Campus Auction.',
    };
  }

  /**
   * Resend 6-digit OTP code (with 60-second cooldown protection)
   */
  static async resendOtp({ email, purpose = 'signup' }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const validPurposes = ['signup', 'login'];
    const chosenPurpose = validPurposes.includes(purpose) ? purpose : 'signup';

    const result = await OtpService.generateAndSendOtp({
      email: cleanEmail,
      purpose: chosenPurpose,
    });

    return {
      success: true,
      email: cleanEmail,
      purpose: chosenPurpose,
      message: `A new verification code has been sent to ${cleanEmail}`,
      cooldownSeconds: result.cooldownSeconds,
    };
  }

  /**
   * Log in an existing user (Supports either college email OR roll number)
   * Enforces email verification and optional login OTP
   */
  static async loginUser({ email, password }) {
    const identifier = (email || '').trim();

    if (!identifier || !password) {
      const error = new Error('Please provide your college email (or roll number) and password');
      error.statusCode = 400;
      throw error;
    }

    // Support either email or roll number for convenient campus login
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { campusRollNumber: identifier.toUpperCase() },
      ],
    }).select('+password +email +emailVerified');

    if (!user || !(await user.matchPassword(password))) {
      const error = new Error('Invalid email/roll number or password');
      error.statusCode = 401;
      throw error;
    }

    // Gate: Must have verified college email
    if (user.emailVerified === false) {
      // Auto-send fresh signup verification OTP
      try {
        await OtpService.generateAndSendOtp({
          email: user.email,
          userId: user._id,
          purpose: 'signup',
        });
      } catch (e) {
        // Cooldown might still be active
      }

      const error = new Error('Please verify your college email address before logging in. A verification code has been sent to your email.');
      error.statusCode = 403;
      error.code = 'EMAIL_NOT_VERIFIED';
      error.email = user.email;
      throw error;
    }

    // Optional 2-Factor Login OTP flow
    if (process.env.LOGIN_OTP_ENABLED === 'true') {
      await OtpService.generateAndSendOtp({
        email: user.email,
        userId: user._id,
        purpose: 'login',
      });

      return {
        otpRequired: true,
        email: user.email,
        message: 'A 6-digit login verification code was sent to your email address.',
      };
    }

    const token = this.generateToken(user._id);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  /**
   * Verify Login OTP when LOGIN_OTP_ENABLED is active
   */
  static async verifyLoginOtp({ email, code }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    await OtpService.verifyOtp({
      email: cleanEmail,
      code: cleanCode,
      purpose: 'login',
    });

    const user = await User.findOne({ email: cleanEmail }).select('+email +emailVerified');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const token = this.generateToken(user._id);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      token,
      message: 'Logged in successfully.',
    };
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId) {
    const user = await User.findById(userId).select('+email +campusRollNumber');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return user.toPublicProfile();
  }
}

module.exports = AuthService;
