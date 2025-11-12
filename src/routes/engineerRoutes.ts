import express from "express";
import {
  getAllEngineers,
  autoDispatchEngineer,
} from "../controllers/engineerController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes in this file are for admins
router.use(protect, restrictTo("ADMIN"));

/**
 * @route   GET /engineers
 * @desc    List all engineers
 * @access  Private (Admin)
 */
router.get("/", getAllEngineers);

/**
 * @route   POST /engineers/dispatch/auto
 * @desc    Admin triggers auto-assignment of nearest engineer
 * @access  Private (Admin)
 */
router.post("/dispatch/auto", autoDispatchEngineer);

export default router;
