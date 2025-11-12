import express from "express";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import {
  getAllTickets,
  createTicket,
  updateTicketStatus,
  uploadProofPhoto,
} from "../controllers/ticketController.js"; // Import all functions

const router = express.Router();

// All routes below this line are protected by a valid login
router.use(protect);

/**
 * @route   GET /tickets
 * @desc    List all tickets (Admin) or assigned tickets (Engineer)
 * @access  Private (Admin, Engineer)
 */
// no need for restrictTo() here, since the controller handles both roles
router.get("/", getAllTickets);

/**
 * @route   POST /tickets
 * @desc    Admin creates a new ticket
 * @access  Private (Admin only)
 */
router.post("/", restrictTo("ADMIN"), createTicket);

/**
 * @route   PATCH /tickets/:id
 * @desc    Engineer updates status ('in_progress', 'closed')
 * @access  Private (Engineer only)
 */
router.patch("/:id", restrictTo("ENGINEER"), updateTicketStatus);

/**
 * @route   POST /tickets/:id/photo
 * @desc    Engineer uploads proof-of-fix photo
 * @access  Private (Engineer only)
 */
router.post("/:id/photo", restrictTo("ENGINEER"), uploadProofPhoto);

export default router;
