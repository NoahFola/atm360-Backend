import express from 'express';
import { loginUser } from '../controllers/authController.js'; // Correct ESM import

const router = express.Router();

/**
 * @route   POST /auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', loginUser);

// If we had a GET /auth/me route, we'd add it here and protect it
// router.get('/me', protect, getMe);

export default router;