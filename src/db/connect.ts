import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url'; // Import the 'url' module

// Define the path for the database file
// This will place 'atm360.db' in your 'backend/db/' folder
const __filename = fileURLToPath(import.meta.url);
// 2. Get the current directory's path from the file's URL
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'atm360.db');

// The 'verbose' option logs all queries to the console.
// This is EXCELLENT for debugging during the hackathon.
const db = new Database(dbPath, { verbose: console.log });

// Gracefully close the DB connection on exit
process.on('exit', () => {
  db.close();
  console.log('Database connection closed.');
});

export default db;