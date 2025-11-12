import express from 'express';
import { getHighRiskAtms } from '../controllers/alertController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
// Import the new controller functions


const router = express.Router();
router.use(protect, restrictTo('ADMIN'));

router.get('/at-risk', getHighRiskAtms);



export default router;
