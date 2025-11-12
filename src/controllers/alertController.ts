import { Request, Response } from 'express';
// Import the specific service function
import { getAtRiskAtms } from '../services/alertService.js'; 

/**
 * @desc    Get all ATMs flagged as "at-risk" (offline or high predictive risk)
 * @route   GET /api/alerts/at-risk
 * @access  Private (Admin)
 */
export const getHighRiskAtms = (req: Request, res: Response) => {
  try {
    // 1. Call the service function to get the data
    // This function already contains all the business logic
    const atRiskAtms = getAtRiskAtms();

    // 2. Send the successful response
    res.status(200).json(atRiskAtms);

  } catch (err) {
    // 3. Handle any unexpected errors from the service layer
    console.error('[API Error]: Failed to get at-risk ATMs:', (err as Error).message);
    res.status(500).json({ message: 'Internal server error while fetching at-risk ATMs.' });
  }
};

// You can add other alert-related controller functions here as you build them out
// e.g., handleGetAlertsHistory, handleCreateManualAlert, etc.