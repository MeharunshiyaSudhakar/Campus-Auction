const AuthService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');

class AuthController {
  /**
   * @route   POST /api/auth/register
   * @desc    Register a new student account
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

      return ApiResponse.success(res, result, 'Student registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/login
   * @desc    Authenticate student and return JWT token
   * @access  Public
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return ApiResponse.error(res, 'Please provide both email and password', 400);
      }

      const result = await AuthService.loginUser({ email, password });

      return ApiResponse.success(res, result, 'Login successful', 200);
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
      return ApiResponse.success(res, profile, 'Profile retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
