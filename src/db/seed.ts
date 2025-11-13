import db from './connect.js';
// import bcrypt from 'bcrypt'; // <-- REMOVED
import crypto from 'crypto'; // <-- KEPT: This is required for crypto.randomUUID()
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Type Imports (assuming types/schema.ts is at ../types/schema.ts) ---
import type { Bank, User, BankAdministrator, Engineer, CustomerProfile, ATM, Ticket, CustomerReport } from '../types/schema.js';

// --- 1. Get Path to Seed Data ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../core/seed-json-files');

// --- 2. Define Schema (Copied from your previous file) ---
const createSchemaSql = `
  -- Drop tables in reverse order of dependency
  DROP TABLE IF EXISTS Tickets;
  DROP TABLE IF EXISTS CustomerReports;
  DROP TABLE IF EXISTS ATMs;
  DROP TABLE IF EXISTS CustomerProfiles;
  DROP TABLE IF EXISTS Engineers;
  DROP TABLE IF EXISTS BankAdministrators;
  DROP TABLE IF EXISTS Users;
  DROP TABLE IF EXISTS Banks;

  -- Create tables in order of dependency
  CREATE TABLE Banks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    shortCode TEXT NOT NULL,
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'ENGINEER', 'CUSTOMER')),
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- --- FIX: Use userId as PRIMARY KEY ---
  CREATE TABLE BankAdministrators (
    id TEXT PRIMARY KEY, -- Will be the userId
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    bankId TEXT NOT NULL,
    permissions TEXT NOT NULL, -- JSON string
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (bankId) REFERENCES Banks(id)
  );

  -- --- FIX: Use userId as PRIMARY KEY ---
  CREATE TABLE Engineers (
    id TEXT PRIMARY KEY, -- Will be the userId
    name TEXT NOT NULL,
    employeeCode TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    region TEXT NOT NULL,
    specialization TEXT NOT NULL, -- JSON string
    currentStatus TEXT NOT NULL,
    performance TEXT NOT NULL, -- JSON object
    lastKnownLocation TEXT, -- JSON object or NULL
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (id) REFERENCES Users(id) ON DELETE CASCADE
  );

  -- --- FIX: Use userId as PRIMARY KEY ---
  CREATE TABLE CustomerProfiles (
    id TEXT PRIMARY KEY, -- Will be the userId
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (id) REFERENCES Users(id) ON DELETE CASCADE
  );

  CREATE TABLE ATMs (
    id TEXT PRIMARY KEY,
    bankId TEXT NOT NULL,
    location TEXT NOT NULL, -- JSON object
    model TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    lastUpdated TEXT NOT NULL,
    networkStatus TEXT NOT NULL,
    cashLevel TEXT NOT NULL, -- JSON object
    powerStatus TEXT NOT NULL, -- JSON object
    diagnostics TEXT NOT NULL, -- JSON object
    predictiveScore TEXT, -- JSON object or NULL
    assignedEngineerId TEXT,
    uptimeMetrics TEXT, -- JSON object or NULL
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (bankId) REFERENCES Banks(id)
  );

  CREATE TABLE CustomerReports (
    id TEXT PRIMARY KEY,
    atmId TEXT NOT NULL,
    customerProfileId TEXT, -- This will be the userId
    customerPhone TEXT,
    channel TEXT NOT NULL,
    issueReported TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    verified INTEGER DEFAULT 0,
    ticketId TEXT,
    FOREIGN KEY (atmId) REFERENCES ATMs(id),
    -- --- FIX: Point to CustomerProfiles(id) which is the userId ---
    FOREIGN KEY (customerProfileId) REFERENCES CustomerProfiles(id)
  );

  CREATE TABLE Tickets (
    id TEXT PRIMARY KEY,
    atmId TEXT NOT NULL,
    engineerId TEXT, -- This will be the userId
    reportedBy TEXT NOT NULL,
    issueType TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    resolution TEXT, -- JSON object or NULL
    geoValidation TEXT, -- JSON object or NULL
    sourceData TEXT, -- JSON object or NULL
    FOREIGN KEY (atmId) REFERENCES ATMs(id),
    -- --- FIX: Point to Engineers(id) which is the userId ---
    FOREIGN KEY (engineerId) REFERENCES Engineers(id)
  );
`;

// --- 3. Seed Mock Data from JSON files ---
// --- REFACTORED: This is now a simple, synchronous function ---
function seedMockData() {
  console.log('[DB Init]: Seeding mock data from JSON files...');

  // --- Helper function to read JSON files safely ---
  function readJsonFile<T>(filename: string): T {
    try {
      const filePath = path.join(dataDir, filename);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent) as T;
    } catch (err) {
      console.error(`[DB Init]: FATAL ERROR reading ${filename}:`, (err as Error).message);
      throw new Error(`Failed to read seed file ${filename}`);
    }
  }

  // --- Load all data from JSON files first ---
  const banks = readJsonFile<Bank[]>('banks.json');
  const users = readJsonFile<{ admins: User[], engineers: User[], customers: User[] }>('user.json');
  const admins = readJsonFile<BankAdministrator[]>('bank_admins.json');
  const engineers = readJsonFile<Engineer[]>('engineer.json');
  const customers = readJsonFile<CustomerProfile[]>('customer_profile.json');
  const atms = readJsonFile<ATM[]>('atms.json');
  const reports = readJsonFile<CustomerReport[]>('customer_reports.json');
  const tickets = readJsonFile<Ticket[]>('tickets.json');

  console.log('[DB Init]: All JSON files read. Inserting into database...');

  // --- Banks ---
  const insertBank = db.prepare(
    'INSERT INTO Banks (id, name, shortCode, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
  );
  for (const bank of banks) {
    const now = new Date().toISOString();
    insertBank.run(bank.id, bank.name, bank.shortCode, now, now);
  }
  console.log(`[DB Init]: Seeded ${banks.length} banks.`);

  // --- Users (Admin, Engineer, Customer) ---
  const insertUser = db.prepare(
    'INSERT INTO Users (id, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const allUsers = [...users.admins, ...users.engineers, ...users.customers];
  for (const user of allUsers) {
    const now = new Date().toISOString();
    insertUser.run(user.id, user.email, user.password, user.role, now, now);
  }
  console.log(`[DB Init]: Seeded ${allUsers.length} users (passwords are NOT hashed).`);

  // --- BankAdministrators ---
  const insertAdmin = db.prepare(
    'INSERT INTO BankAdministrators (id, name, phone, bankId, permissions, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const admin of admins) {
    const now = new Date().toISOString();
    insertAdmin.run(
      admin.userId, admin.name, admin.phone, admin.bankId,
      JSON.stringify(admin.permissions), now, now
    );
  }
  console.log(`[DB Init]: Seeded ${admins.length} bank administrators.`);

  // --- Engineers ---
  // --- FIX: Corrected placeholder count from 13 to 12 ---
  const insertEngineer = db.prepare(
    'INSERT INTO Engineers (id, name, employeeCode, phone, email, region, specialization, currentStatus, performance, lastKnownLocation, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const eng of engineers) {
    const now = new Date().toISOString();
    insertEngineer.run(
      eng.userId, eng.name, eng.employeeCode, eng.phone, eng.email, eng.region,
      JSON.stringify(eng.specialization), eng.currentStatus, JSON.stringify(eng.performance),
      eng.lastKnownLocation ? JSON.stringify(eng.lastKnownLocation) : null,
      now, now
    );
  }
  console.log(`[DB Init]: Seeded ${engineers.length} engineers.`);
  
  // --- CustomerProfiles ---
  const insertCustomer = db.prepare(
    'INSERT INTO CustomerProfiles (id, name, phone, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
  );
  for (const cust of customers) {
    const now = new Date().toISOString();
    insertCustomer.run(
      cust.userId, cust.name, cust.phone, now, now
    );
  }
  console.log(`[DB Init]: Seeded ${customers.length} customer profiles.`);

  // --- ATMs ---
  const insertAtm = db.prepare(
    'INSERT INTO ATMs (id, bankId, location, model, type, status, lastUpdated, networkStatus, cashLevel, powerStatus, diagnostics, predictiveScore, assignedEngineerId, uptimeMetrics, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const atm of atms) {
    // Use timestamps from JSON if they exist, otherwise generate new one
    const createdAt = atm.createdAt || new Date().toISOString();
    const updatedAt = atm.updatedAt || createdAt;
    
    insertAtm.run(
      atm.id, atm.bankId, JSON.stringify(atm.location), atm.model, atm.type, atm.status,
      atm.lastUpdated, atm.networkStatus, JSON.stringify(atm.cashLevel),
      JSON.stringify(atm.powerStatus), JSON.stringify(atm.diagnostics),
      atm.predictiveScore ? JSON.stringify(atm.predictiveScore) : null,
      atm.assignedEngineerId || null,
      atm.uptimeMetrics ? JSON.stringify(atm.uptimeMetrics) : null,
      createdAt,
      updatedAt
    );
  }
  console.log(`[DB Init]: Seeded ${atms.length} ATMs.`);
  
  // --- CustomerReports ---
  const insertReport = db.prepare(
    'INSERT INTO CustomerReports (id, atmId, customerProfileId, customerPhone, channel, issueReported, timestamp, verified, ticketId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const report of reports) {
    insertReport.run(
      report.id, report.atmId, report.customerProfileId || null, report.customerPhone || null,
      report.channel, report.issueReported, report.timestamp,
      report.verified ? 1 : 0, report.ticketId || null
    );
  }
  console.log(`[DB Init]: Seeded ${reports.length} customer reports.`);

  // --- Tickets ---
  const insertTicket = db.prepare(
    'INSERT INTO Tickets (id, atmId, engineerId, reportedBy, issueType, severity, description, status, createdAt, updatedAt, resolution, geoValidation, sourceData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const ticket of tickets) {
    const createdAt = ticket.createdAt || new Date().toISOString();
    const updatedAt = ticket.updatedAt || createdAt;

    insertTicket.run(
      ticket.id, ticket.atmId, ticket.engineerId || null, ticket.reportedBy,
      ticket.issueType, ticket.severity, ticket.description, ticket.status,
      createdAt, updatedAt,
      ticket.resolution ? JSON.stringify(ticket.resolution) : null,
      ticket.geoValidation ? JSON.stringify(ticket.geoValidation) : null,
      ticket.sourceData ? JSON.stringify(ticket.sourceData) : null
    );
  }
  console.log(`[DB Init]: Seeded ${tickets.length} tickets.`);
  
  console.log('[DB Init]: Mock data seeded successfully.');
}

// --- 4. Run the Script ---
export function initializeDatabase() {
  
  // --- FIX: Wrap schema creation AND seeding in one transaction ---
  const fullRebuild = db.transaction(() => {
    console.log('[DB Init]: Dropping old tables and creating new schema...');
    db.exec(createSchemaSql);
    console.log('[DB Init]: Schema created successfully.');
    
    seedMockData();
  });

  try {
    fullRebuild();
    console.log('[DB Init]: Database has been successfully seeded (ATOMIC).');
  } catch (err) {
    console.error('[DB Init]: FATAL Error seeding database:', (err as Error).message);
    // If seeding fails, we should stop the server
    process.exit(1);
  } finally {
    // The connection remains open for the server
    console.log('[DB Init]: Seed script finished. Connection remains open for server.');
  }
}

