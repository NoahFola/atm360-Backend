import { User } from './schema.js';
// // --- 1. User Type (from Day 1) ---
// export interface User {
//   id: number;
//   username: string;
//   password?: string;
//   role: 'admin' | 'engineer';
// }

// --- 2. ATM Type (NEW) ---
// Based on the schema in seed.ts
export interface ATM {
  id: number;
  city: string;
  status: 'online' | 'offline' | 'maintenance';
  riskScore: number;
  lastUpdated: string; // SQLite TIMESTAMPs are often returned as strings
}

// --- 3. Ticket Type (We'll need this next) ---
export interface Ticket {
  id: number;
  atmId: number;
  engineerId: number | null; // Can be null if 'open'
  status: 'open' | 'assigned' | 'in_progress' | 'closed';
  issueType: string;
  createdAt: string;
  proofPhotoUrl: string | null;
}

// --- 4. Engineer Type (We'll also need this) ---
export interface Engineer {
  id: number;
  name: string;
  city: string;
  skills: string; // e.g., "cash_dispenser,network"
}


// --- 5. Global Express Request ---
declare global {
  namespace Express {
    export interface Request {
      user?: User; // Holds the authenticated user's data
    }
  }
}