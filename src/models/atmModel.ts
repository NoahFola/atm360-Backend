import db from '../db/connect.js';
import crypto from 'crypto';
import type { ATM } from '../schema/types.js'; // Using the full schema type

// --- Type Definition ---
// This is the shape of the data as it exists in the SQLite table.
// All nested objects are stored as JSON strings.
type AtmTableRow = {
  id: string;
  bankId: string;
  location: string; // JSON string
  model: string;
  type: ATM['type'];
  status: ATM['status'];
  lastUpdated: string;
  networkStatus: ATM['networkStatus'];
  cashLevel: string; // JSON string
  powerStatus: string; // JSON string
  diagnostics: string; // JSON string
  predictiveScore: string; // JSON string
  assignedEngineerId?: string;
  uptimeMetrics: string; // JSON string
  createdAt: string;
  updatedAt: string;
};

/**
 * AtmModel Class
 * Encapsulates all database logic for the ATM entity.
 * Exported as a singleton instance.
 */
class AtmModel {
  private db;

  constructor() {
    // In a real app, you might inject this, but for the hackathon,
    // importing the singleton 'db' is perfectly fine.
    this.db = db;
  }

  // --- Private Utility Functions ---

  /**
   * Converts a database row (with JSON strings) into the proper ATM type.
   */
  private parseAtmRow(row: AtmTableRow): ATM {
    return {
      ...row,
      location: JSON.parse(row.location || '{}'),
      cashLevel: JSON.parse(row.cashLevel || '{}'),
      powerStatus: JSON.parse(row.powerStatus || '{}'),
      diagnostics: JSON.parse(row.diagnostics || '{}'),
      predictiveScore: JSON.parse(row.predictiveScore || '{}'),
      uptimeMetrics: JSON.parse(row.uptimeMetrics || '{}'),
    };
  }

  /**
   * Converts a full ATM type (with objects) into a DB-safe row.
   */
  private stringifyAtmFields(data: Omit<ATM, 'id' | 'createdAt' | 'updatedAt'| 'lastUpdated'>) {
    return {
      bankId: data.bankId,
      location: JSON.stringify(data.location),
      model: data.model,
      type: data.type,
      status: data.status,
      lastUpdated: new Date().toISOString(),
      networkStatus: data.networkStatus,
      cashLevel: JSON.stringify(data.cashLevel),
      powerStatus: JSON.stringify(data.powerStatus),
      diagnostics: JSON.stringify(data.diagnostics),
      predictiveScore: JSON.stringify(data.predictiveScore),
      assignedEngineerId: data.assignedEngineerId,
      uptimeMetrics: JSON.stringify(data.uptimeMetrics),
    };
  }

  // --- Public Model Functions ---

  /**
   * Creates a new ATM.
   * Assumes your CREATE TABLE statement has columns for all fields.
   * All object fields are stored as stringified JSON.
   */
  public createAtm(data: Omit<ATM, 'id' | 'createdAt' | 'updatedAt' | 'lastUpdated'>) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Use the private helper
    const fields = this.stringifyAtmFields(data);

    const sql = `
      INSERT INTO ATMs (
        id, bankId, location, model, type, status, lastUpdated,
        networkStatus, cashLevel, powerStatus, diagnostics, predictiveScore,
        assignedEngineerId, uptimeMetrics, createdAt, updatedAt
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `;
    
    try {
      // Use the class's db instance
      const stmt = this.db.prepare(sql);
      stmt.run(
        id,
        fields.bankId,
        fields.location,
        fields.model,
        fields.type,
        fields.status,
        fields.lastUpdated,
        fields.networkStatus,
        fields.cashLevel,
        fields.powerStatus,
        fields.diagnostics,
        fields.predictiveScore,
        fields.assignedEngineerId,
        fields.uptimeMetrics,
        now,
        now
      );
      return id;
    } catch (err) {
      console.error('Error creating ATM:', (err as Error).message);
      throw new Error('Failed to create ATM. Check seed.ts schema.');
    }
  }

  /**
   * Finds an ATM by its ID and parses all JSON fields.
   */
  public findAtmById(id: string): ATM | null {
    const sql = 'SELECT * FROM ATMs WHERE id = ?';
    try {
      const stmt = this.db.prepare(sql);
      const row = stmt.get(id) as AtmTableRow | undefined;
      // Use the private helper
      return row ? this.parseAtmRow(row) : null;
    } catch (err) {
      console.error('Error finding ATM by id:', (err as Error).message);
      return null;
    }
  }

  /**
   * Gets all ATMs and parses all JSON fields.
   */
  public findAllAtms(): ATM[] {
    const sql = 'SELECT * FROM ATMs';
    try {
      const stmt = this.db.prepare(sql);
      const rows = stmt.all() as AtmTableRow[];
      // Use the private helper
      return rows.map((row) => this.parseAtmRow(row));
    } catch (err) {
      console.error('Error finding all ATMs:', (err as Error).message);
      return [];
    }
  }

  /**
   * Updates an ATM's status (e.g., to 'OFFLINE' or 'ONLINE').
   * This is a fast, targeted update for your simulation service.
   */
  public updateAtmStatus(id: string, status: ATM['status']) {
    const sql = 'UPDATE ATMs SET status = ?, lastUpdated = CURRENT_TIMESTAMP WHERE id = ?';
    try {
      const stmt = this.db.prepare(sql);
      const info = stmt.run(status, id);
      return info.changes > 0;
    } catch (err) {
      console.error('Error updating ATM status:', (err as Error).message);
      throw new Error('Failed to update ATM status');
    }
  }

  /**
   * Updates the dynamically changing parts of an ATM.
   * Used by your simulation service to update telemetry data.
   */
  public updateAtmDynamicData(
    id: string,
    status: ATM['status'],
    networkStatus: ATM['networkStatus'],
    cashLevel: ATM['cashLevel'],
    powerStatus: ATM['powerStatus'],
    diagnostics: ATM['diagnostics']
  ) {
    const sql = `
      UPDATE ATMs
      SET
        status = ?,
        networkStatus = ?,
        cashLevel = ?,
        powerStatus = ?,
        diagnostics = ?,
        lastUpdated = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    try {
      const stmt = this.db.prepare(sql);
      const info = stmt.run(
        status,
        networkStatus,
        JSON.stringify(cashLevel),
        JSON.stringify(powerStatus),
        JSON.stringify(diagnostics),
        id
      );
      return info.changes > 0;
    } catch (err) {
      console.error('Error updating ATM dynamic data:', (err as Error).message);
      throw new Error('Failed to update ATM dynamic data');
    }
  }

    public updateFullAtm(id: string, atm: ATM) {
    const sql = `
      UPDATE ATMs
      SET
        status = ?,
        lastUpdated = ?,
        networkStatus = ?,
        cashLevel = ?,
        powerStatus = ?,
        diagnostics = ?,
        predictiveScore = ?,
        uptimeMetrics = ?
      WHERE id = ?
    `;
    
    // Stringify nested objects for storage
    const cashLevelJson = JSON.stringify(atm.cashLevel);
    const powerStatusJson = JSON.stringify(atm.powerStatus);
    const diagnosticsJson = JSON.stringify(atm.diagnostics);
    const predictiveScoreJson = JSON.stringify(atm.predictiveScore);
    const uptimeMetricsJson = JSON.stringify(atm.uptimeMetrics);

    try {
      const stmt = this.db.prepare(sql);
      const info = stmt.run(
        atm.status,
        new Date().toISOString(), // Always update lastUpdated timestamp
        atm.networkStatus,
        cashLevelJson,
        powerStatusJson,
        diagnosticsJson,
        predictiveScoreJson,
        uptimeMetricsJson,
        id
      );
      return info.changes > 0;
    } catch (err) {
      console.error('Error updating full ATM:', (err as Error).message);
      throw new Error('Failed to update full ATM');
    }
  }

  public deleteAtmById(id: string): boolean {
    const sql = 'DELETE FROM ATMs WHERE id = ?';
    try {
      const stmt = this.db.prepare(sql);
      const info = stmt.run(id);
      // info.changes will be 1 if a row was deleted, 0 otherwise
      return info.changes > 0;
    } catch (err) {
      console.error('Error deleting ATM by id:', (err as Error).message);
      throw new Error('Failed to delete ATM');
    }
  }

}









// Export a single instance of the class
// This creates the singleton pattern.
export default new AtmModel();