import db from '../db/connect.js';
import { ATM, Engineer, Ticket } from '../types/schema.js';


/**
 * @desc    Mock AI dispatch logic to assign the nearest available engineer.
 * @param   atmId The ID of the faulty ATM
 * @param   issueType The type of issue (e.g., 'cash_dispenser_fault')
 * @returns The newly created and assigned ticket
 */
export const assignNearestEngineer = (ticketId: string, atmId: string, issueType: string) => {
  // --- 1. Get ATM details (we need its city) ---
  console.log(atmId);
  const atmStmt = db.prepare('SELECT * FROM ATMs WHERE id = ?');
  const atm = atmStmt.get(atmId) as ATM | undefined;

  if (!atm) {
    throw new Error('ATM not found');
  }
  // --- 2. Find an "available" engineer in the same city ---
  // Our mock logic is simple: find *any* engineer in the same region.
  // A real app would check skills, availability, workload, etc.
  const engineerStmt = db.prepare('SELECT * FROM Engineers WHERE region = ? LIMIT 1');
  console.log(atm.location);
  atm.location = JSON.parse(atm.location.toString())
  console.log(atm.location.region);
  const engineer = engineerStmt.get(atm.location.region) as Engineer | undefined;

  if (!engineer) {
    // No engineer found in that city. Create an 'open' ticket.
    const openTicketStmt = db.prepare(
      'INSERT INTO Tickets (atmId, issueType, status, engineerId) VALUES (?, ?, ?, ?)'
    );
    const info = openTicketStmt.run(atmId, issueType, 'open', null);
    
    return {
      id: info.lastInsertRowid,
      atmId: atmId,
      engineerId: null,
      status: 'open',
      message: 'Fault logged. No engineer available in city, ticket set to open.'
    };
  }

  // --- 3. Engineer Found: Create Ticket & Assign it ---
  const assignedTicketStmt = db.prepare(
    'UPDATE Tickets SET engineerId = ?, status = ?  WHERE id = ?'
  );
  const info = assignedTicketStmt.run(engineer.userId, 'assigned', ticketId);

  console.log(`Dispatched Engineer ${engineer.name} (ID: ${engineer.id}) to ATM ${atm.id} in ${atm.location.region}`);

  // --- 4. Return the new ticket ---
  return {
    id: info.lastInsertRowid,
    atmId: atmId,
    engineerId: engineer.id,
    status: 'assigned',
    message: `Successfully assigned Engineer ${engineer.name}`
  };
};