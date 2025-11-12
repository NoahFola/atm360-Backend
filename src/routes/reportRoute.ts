import { Router } from 'express';
import { getKpiReport } from '../controllers/reportController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = Router();

// This is your new route: GET /api/stats/kpi
// It is protected and can only be accessed by ADMINS
router.get(
  '/kpi',
  protect,
  restrictTo('ADMIN'),
  getKpiReport
);

export default router;