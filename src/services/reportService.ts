import db from '../db/connect.js';

/**
 * These are the row types returned by our aggregate queries.
 */
interface UptimeStatsRow {
  totalAtms: number;
  onlineAtms: number;
}

interface ActiveFaultsRow {
  activeFaults: number;
}

interface AvgRepairTimeRow {
  avgRepairSeconds: number | null;
}

/**
 * This is the final object we will return from the API.
 */
export interface KpiReport {
  uptimePercent: number;
  avgRepairTimeMinutes: number | null;
  activeFaults: number;
}

class ReportService {
  private db;

  constructor() {
    this.db = db;
  }

  /**
   * Calculates all KPIs for the main dashboard.
   */
  public generateKpiReport(): KpiReport {
    try {
      // 1. Calculate Uptime %
      const uptimeSql = `
        SELECT
          (SELECT COUNT(*) FROM ATMs) AS totalAtms,
          (SELECT COUNT(*) FROM ATMs WHERE status = 'ONLINE') AS onlineAtms;
      `;
      const uptimeRow = this.db.prepare(uptimeSql).get() as UptimeStatsRow;
      
      let uptimePercent = 0;
      if (uptimeRow.totalAtms > 0) {
        uptimePercent = (uptimeRow.onlineAtms / uptimeRow.totalAtms) * 100;
      }

      // 2. Get Active Faults (all tickets not 'CLOSED')
      const faultsSql = `
        SELECT COUNT(*) AS activeFaults 
        FROM Tickets 
        WHERE status != 'CLOSED';
      `;
      const faultsRow = this.db.prepare(faultsSql).get() as ActiveFaultsRow;

      // 3. Calculate Avg Repair Time (MTTR) for 'CLOSED' tickets
      const mttrSql = `
        SELECT AVG(
          (strftime('%s', updatedAt) - strftime('%s', createdAt))
        ) AS avgRepairSeconds
        FROM Tickets
        WHERE status = 'CLOSED' AND updatedAt IS NOT NULL;
      `;
      const mttrRow = this.db.prepare(mttrSql).get() as AvgRepairTimeRow;

      let avgRepairTimeMinutes: number | null = null;
      if (mttrRow.avgRepairSeconds !== null) {
        avgRepairTimeMinutes = mttrRow.avgRepairSeconds / 60;
      }

      // 4. Build and return the final report object
      return {
        uptimePercent: parseFloat(uptimePercent.toFixed(1)), // e.g., 90.5
        avgRepairTimeMinutes: avgRepairTimeMinutes ? parseFloat(avgRepairTimeMinutes.toFixed(1)) : null,
        activeFaults: faultsRow.activeFaults,
      };

    } catch (err) {
      console.error('Error generating KPI report:', (err as Error).message);
      throw new Error('Failed to generate KPI report');
    }
  }
}

// Export a singleton instance
export const reportService = new ReportService();