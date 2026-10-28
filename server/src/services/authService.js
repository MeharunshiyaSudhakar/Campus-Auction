const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
   */
  /**
   * Register a new student user
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

    // Create user
    const user = await User.create({
      name: (name || '').trim(),
      email: cleanEmail,
      password,
      phone: phone ? phone.trim() : '',
      campusRollNumber: cleanRoll,
    });

    const token = this.generateToken(user._id);

    return {
      user: user.toPublicProfile(),
      token,
    };
  }

  /**
   * Log in an existing user (Supports either college email OR roll number)
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
    }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      const error = new Error('Invalid email/roll number or password');
      error.statusCode = 401;
      throw error;
    }

    const token = this.generateToken(user._id);

    return {
      user: user.toPublicProfile(),
      token,
    };
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Returns public profile - zero private leak
    return user.toPublicProfile();
  }
}

module.exports = AuthService;
