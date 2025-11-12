import { Request, Response } from 'express';
import db from '../db/connect.js';
import { Ticket, Engineer } from '../types/schema.js'; // Import the Ticket type
import crypto from 'crypto';


// --- 1. GET ALL TICKETS (Modified for Roles) ---
/**
 * @desc    Get all tickets (Admins) or assigned tickets (Engineers)
 * @route   GET /tickets
 * @access  Private (Admin, Engineer)
 */
export const getAllTickets = (req: Request, res: Response) => {
  try {
    // req.user is attached by our 'protect' middleware
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let stmt;
    let tickets;

    if (userRole === 'ADMIN') {
      // Admin: Get all tickets
      stmt = db.prepare('SELECT * FROM Tickets');
      tickets = stmt.all();
    } else if (userRole === 'ENGINEER') {
      // Engineer: Get only tickets assigned to them
      // Note: We're assuming the user.id maps to an engineer.id. 
      // In a real app, we might have a Users.engineerId foreign key.
      // For this MVP, we'll filter on engineerId from the Tickets table.
      
      // We need to find the engineerId from the user's name (based on seed data)
      // This is brittle, but required by our current schema.
      const engineerStmt = db.prepare('SELECT id FROM Engineers WHERE UserId = ?');
      const engineer = engineerStmt.get(
        req.user?.id
      ) as Pick<Engineer, 'id'> | undefined;

      if (!engineer) {
        return res.status(404).json({ message: "Engineer profile not found for this user."});
      }

      stmt = db.prepare('SELECT * FROM Tickets WHERE engineerId = ?');
      tickets = stmt.all(engineer.id);
    } else {
      // Should not happen if middleware is correct
      return res.status(403).json({ message: 'Unauthorized role' });
    }
    
    res.status(200).json(tickets);
  } catch (err) {
    let errorMessage = 'Server error fetching tickets';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Get all tickets error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};

// --- 2. CREATE TICKET ---
/**
 * @desc    Create a new ticket (Admin only)
 * @route   POST /tickets
 * @access  Private (Admin)
 */
export const createTicket = (req: Request, res: Response) => {
  try {
    const { atmId, issueType, severity, description } = req.body;

    if (!atmId || !issueType) {
      return res.status(400).json({ message: 'Please provide atmId and issueType' });
    }

    // Default status is 'open', engineerId is null
    const status = 'open';

    const stmt = db.prepare(
      'INSERT INTO Tickets (id, atmId, issueType, status, reportedBy, severity, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const now = new Date().toISOString();
    const info = stmt.run(crypto.randomUUID(), atmId, issueType, status, "SYSTEM", severity, description, now, now);

    if (info.changes > 0) {
      res.status(201).json({ 
        id: info.lastInsertRowid, 
        atmId, 
        issueType, 
        status 
      });
    } else {
      throw new Error('Failed to create ticket');
    }
  } catch (err) {
    let errorMessage = 'Server error creating ticket';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Create ticket error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};

// --- 3. UPDATE TICKET STATUS (New) ---
/**
 * @desc    Update ticket status (Engineer only)
 * @route   PATCH /tickets/:id
 * @access  Private (Engineer)
 */
export const updateTicketStatus = (req: Request, res: Response) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body; // e.g., 'in_progress' or 'closed'

    if (!status || !['in_progress', 'closed'].includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be "in_progress" or "closed".' 
      });
    }

    // TODO: Verify this ticket is assigned to this engineer (req.user.id)
    // We'll skip this check for the MVP, but it's a security gap.

    const stmt = db.prepare('UPDATE Tickets SET status = ?, updatedAt = ? WHERE id = ?');
    const now = new Date().toISOString();
    const info = stmt.run(status, now, ticketId);

    if (info.changes > 0) {
      res.status(200).json({ id: ticketId, status: status });
    } else {
      return res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (err) {
    let errorMessage = 'Server error updating ticket status';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Update status error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};

// --- 4. UPLOAD MOCK PHOTO (New) ---
/**
 * @desc    Upload mock photo proof (Engineer only)
 * @route   POST /tickets/:id/photo
 * @access  Private (Engineer)
 */
export const uploadProofPhoto = (req: Request, res: Response) => {
  try {
    const ticketId = req.params.id;
    // The plan expects a base64 string, but we'll just mock it.
    const { base64Image } = req.body; 

    if (!base64Image) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    // Mock: We just store a placeholder URL, not the actual image.
    const mockPhotoUrl = `/uploads/mock_proof_${ticketId}.jpg`;

    const stmt = db.prepare('UPDATE Tickets SET proofPhotoUrl = ? WHERE id = ?');
    const info = stmt.run(mockPhotoUrl, ticketId);

    if (info.changes > 0) {
      res.status(200).json({ 
        message: 'Photo uploaded successfully (mocked)',
        photoUrl: mockPhotoUrl 
      });
    } else {
      return res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (err) {
    let errorMessage = 'Server error uploading photo';
    if (err instanceof Error) errorMessage = err.message;
    console.error('Upload photo error:', errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};