import { Request, Response } from 'express';
import db from '../db/connect.js';
import { ATM } from '../types/schema.js'; // Assuming ATM type is defined
import AtmModel from '../models/atmModel.js'; // Adjust the path as needed
import { calculateAtmFailureRisk } from '../services/failureRiskService.js'; 
import  {getAllAtmsTelemetry} from '../services/atmTelemetry.js';



export const getAllAtms = (req: Request, res: Response) => {
  try {
    console.log('Fetching all ATMs from model');
    const atms = AtmModel.findAllAtms(); // <--- THE FIX
    res.status(200).json(atms);
  } catch (err) {
    let errorMessage = 'Server error fetching ATMs';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Get all ATMs error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};

export const createAtm = (req: Request, res: Response) => {
  try {
    const {
      bankId,
      location,
      model,
      type,
      status,
      networkStatus,
      cashLevel,
      powerStatus,
      diagnostics,
      predictiveScore,
      assignedEngineerId,
      uptimeMetrics
    } = req.body;

    // Validate required fields
    if (!bankId || !location || !model || !type || !status || !networkStatus || !cashLevel || !powerStatus || !diagnostics) {
      return res.status(400).json({ 
        message: 'Missing required fields: bankId, location, model, type, status, networkStatus, cashLevel, powerStatus, diagnostics' 
      });
    }

    // Create the ATM using the model
    const atmId = AtmModel.createAtm({
      bankId,
      location,
      model,
      type,
      status,
      networkStatus,
      cashLevel,
      powerStatus,
      diagnostics,
      predictiveScore,
      assignedEngineerId,
      uptimeMetrics
    });

    // Fetch the complete created ATM to return
    const newAtm = AtmModel.findAtmById(atmId);
    
    if (!newAtm) {
      return res.status(500).json({ message: 'Failed to retrieve created ATM' });
    }

    res.status(201).json(newAtm);
    
  } catch (err) {
    let errorMessage = 'Server error creating ATM';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Create ATM error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};

// Get ATM by ID
export const getAtmById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ATM ID is required' });
    }

    const atm = AtmModel.findAtmById(id);

    if (!atm) {
      return res.status(404).json({ message: 'ATM not found' });
    }

    res.status(200).json(atm);
    
  } catch (err) {
    let errorMessage = 'Server error fetching ATM';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Get ATM by ID error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};

// Update ATM (PATCH - partial update)
export const updateAtm = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ATM ID is required' });
    }

    // Check if ATM exists
    const existingAtm = AtmModel.findAtmById(id);
    if (!existingAtm) {
      return res.status(404).json({ message: 'ATM not found' });
    }

    // For PATCH, we need to merge existing data with update data
    const updatedAtm = {
      ...existingAtm,
      ...updateData,
      // Ensure nested objects are properly merged if provided
      location: updateData.location || existingAtm.location,
      cashLevel: updateData.cashLevel || existingAtm.cashLevel,
      powerStatus: updateData.powerStatus || existingAtm.powerStatus,
      diagnostics: updateData.diagnostics || existingAtm.diagnostics,
      predictiveScore: updateData.predictiveScore || existingAtm.predictiveScore,
      uptimeMetrics: updateData.uptimeMetrics || existingAtm.uptimeMetrics
    };

    // Update the ATM
    const success = AtmModel.updateFullAtm(id, updatedAtm);
    
    if (!success) {
      return res.status(500).json({ message: 'Failed to update ATM' });
    }

    // Return the updated ATM
    const finalAtm = AtmModel.findAtmById(id);
    res.status(200).json(finalAtm);
    
  } catch (err) {
    let errorMessage = 'Server error updating ATM';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Update ATM error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};

// Delete ATM
export const deleteAtm = (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ATM ID is required' });
    }

    // Check if ATM exists
    const existingAtm = AtmModel.findAtmById(id);
    if (!existingAtm) {
      return res.status(404).json({ message: 'ATM not found' });
    }

    // Delete the ATM
    const success = AtmModel.deleteAtmById(id);
    
    if (!success) {
      return res.status(500).json({ message: 'Failed to delete ATM' });
    }

    res.status(204).send();
    
  } catch (err) {
    let errorMessage = 'Server error deleting ATM';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Delete ATM error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};

export const getAtmPredictions = (req: Request, res: Response) => {
  try {
    // 1. Get all ATMs
    const stmt = db.prepare('SELECT * FROM ATMs');
    const atms = stmt.all() as ATM[];

    // 2. Mock "AI" logic: Randomly flags 10% as "High Risk" 
    // We'll also return the existing score for others
    const predictions = atms.map((atm) => {
      // Override with random flag
      const isHighRisk = Math.random() < 0.1; // 10% chance
      const riskScore = calculateAtmFailureRisk(atm)
      
      return {
        atmId: atm.id,
        riskLevel: isHighRisk ? 'High' : (riskScore > 0.5 ? 'Medium' : 'Low'),
        // Just an example, logic can be whatever we want
      };
    });

    res.status(200).json(predictions);
  } catch (err) { 
    let errorMessage = 'Server error fetching predictions';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Get predictions error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};


export const simulateFaults = (req: Request, res: Response) => {
  try {
    // This logic randomly sets 1 or 2 'online' ATMs to 'offline'
    const stmt = db.prepare(
      "UPDATE ATMs SET status = 'OFFLINE' WHERE id IN (SELECT id FROM ATMs WHERE status = 'ONLINE' ORDER BY RANDOM() LIMIT 2)"
    );
    const info = stmt.run();

    if (info.changes === 0) {
      return res.status(200).json({
        message: 'Simulation run, but no online ATMs were available to set to offline.',
        faultsCreated: 0,
      });
    }

    res.status(200).json({
      message: 'New faults simulated successfully.',
      faultsCreated: info.changes,
    });
    
  } catch (err) {
    let errorMessage = 'Server error simulating faults';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Simulate faults error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};


export const getAtmTelemetry = (req: Request, res: Response) => {
  try {
    // Call the service function to get all ATM telemetry packets
    const telemetryPackets = getAllAtmsTelemetry();
    res.status(200).json(telemetryPackets);
  } catch (err) {
    let errorMessage = 'Server error fetching ATM telemetry';
    if (err instanceof Error) errorMessage = err.message; 
    console.error('Get ATM telemetry error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  };
};
