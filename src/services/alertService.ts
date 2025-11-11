import AtmModel from '../models/atmModel.js'; // Use default import for singleton
import type { ATM } from '../types/schema.js'; // Correct path

// Define the business logic threshold for what "high risk" means
const HIGH_RISK_THRESHOLD = 0.75; // 75%

/**
 * @desc    Get all ATMs that are currently "at risk".
 * "At risk" is defined as:
 * 1. The ATM status is not 'ONLINE' (e.g., 'OFFLINE', 'OUT_OF_CASH', etc.)
 * 2. The ATM is 'ONLINE' but has a high predictive failure risk.
 * @route   (Service function)
 * @access  Private
 */
export const getAtRiskAtms = (): ATM[] => {
  try {
    // 1. Get all full ATM models from the database
    const allAtms: ATM[] = AtmModel.findAllAtms();

    // 2. Filter for the at-risk ATMs
    const atRiskAtms = allAtms.filter(atm => {
      
      // Condition 1: Is the ATM currently offline for any reason?
      const isOffline = atm.status !== 'ONLINE';
      
      // Condition 2: Is the ATM 'ONLINE' but predicted to fail?
      // Use optional chaining and nullish coalescing (??) for safety
      const isHighRisk = (atm.predictiveScore?.failureRisk ?? 0) > HIGH_RISK_THRESHOLD;
      
      // Return true if either condition is met
      return isOffline || isHighRisk;
    });

    return atRiskAtms;

  } catch (err) {
    console.error('[Service Error]: Failed to get at-risk ATMs:', (err as Error).message);
    // On failure, return an empty array so the frontend doesn't break
    return [];
  }
};