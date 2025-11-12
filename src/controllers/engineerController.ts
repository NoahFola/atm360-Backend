import { Request, Response } from 'express';
import db from '../db/connect.js';
// Import your new service
import { assignNearestEngineer } from '../services/dispatchService.js';

/**
 * @desc    Get all engineers
 * @route   GET /engineers
 * @access  Private (to be secured)
 */
export const getAllEngineers = (req: Request, res: Response) => {
  try {
    const stmt = db.prepare('SELECT * FROM Engineers');
    const engineers = stmt.all();
    res.status(200).json(engineers);
  } catch (err) {
    let errorMessage = 'Server error fetching engineers';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Get all engineers error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};


/**
 * @desc    Auto-dispatch nearest engineer to a fault (Admin only)
 * @route   POST /dispatch/auto
 * @access  Private (Admin)
 */
export const autoDispatchEngineer = (req: Request, res: Response) => {
  try {
    const { ticketId, atmId, issueType } = req.body;

    if (!atmId || !issueType) {
      return res.status(400).json({ message: 'Please provide atmId and issueType' });
    }

    // Call the service logic
    const result = assignNearestEngineer(ticketId, atmId, issueType);

    // Respond with the outcome from the service
    res.status(201).json(result);

  } catch (err) {
    let errorMessage = 'Error during dispatch';
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    console.error('Dispatch error:', errorMessage);
    
    // Handle specific errors
    if (errorMessage === 'ATM not found') {
      return res.status(404).json({ message: errorMessage });
    }
    
    res.status(500).json({ message: errorMessage });
  }
};