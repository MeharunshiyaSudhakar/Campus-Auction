const AuthService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');

class AuthController {
  /**
   * @route   POST /api/auth/register
   * @desc    Register a new student account and dispatch email OTP
   * @access  Public
   */
  static async register(req, res, next) {
    try {
      const { name, email, password, phone, campusRollNumber } = req.body;

      if (!name || !email || !password) {
        return ApiResponse.error(res, 'Name, email, and password are required', 400);
      }

      const result = await AuthService.registerUser({
        name,
        email,
        password,
        phone,
        campusRollNumber,
      });

      return ApiResponse.success(res, result, result.message, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/verify-email
   * @desc    Verify 6-digit email signup OTP and issue session token
   * @access  Public
   */
  static async verifyEmail(req, res, next) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return ApiResponse.error(res, 'Both email and 6-digit verification code are required', 400);
      }

      const result = await AuthService.verifyEmailOtp({ email, code });

      return ApiResponse.success(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/resend-otp
   * @desc    Resend 6-digit verification OTP (subject to 60s cooldown)
   * @access  Public
   */
  static async resendOtp(req, res, next) {
    try {
      const { email, purpose } = req.body;

      if (!email) {
        return ApiResponse.error(res, 'Email is required to resend verification code', 400);
      }

      const result = await AuthService.resendOtp({ email, purpose });

      return ApiResponse.success(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/login
   * @desc    Authenticate student (or dispatch login OTP if LOGIN_OTP_ENABLED)
   * @access  Public
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return ApiResponse.error(res, 'Please provide both email (or roll number) and password', 400);
      }

      const result = await AuthService.loginUser({ email, password });

      return ApiResponse.success(res, result, result.message || 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/verify-login-otp
   * @desc    Verify 6-digit login OTP and return JWT session
   * @access  Public
   */
  static async verifyLoginOtp(req, res, next) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return ApiResponse.error(res, 'Both email and 6-digit login code are required', 400);
      }

      const result = await AuthService.verifyLoginOtp({ email, code });

      return ApiResponse.success(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/auth/me
   * @desc    Get currently logged in user profile (public-safe)
   * @access  Private (JWT required)
   */
  static async getMe(req, res, next) {
    try {
      const profile = await AuthService.getUserProfile(req.user._id);
      return ApiResponse.success(res, profile, 'Profile fetched successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
