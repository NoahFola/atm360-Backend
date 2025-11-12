import { Request, Response } from 'express';
import { reportService, KpiReport } from '../services/reportService.js';

/**
 * @desc    Get the main KPI report for the dashboard
 * @route   GET /api/stats/kpi
 * @access  Private (Admin)
 */
export const getKpiReport = (req: Request, res: Response) => {
  try {
    const report: KpiReport = reportService.generateKpiReport();
    res.status(200).json(report);
  } catch (err) {
    const message = (err instanceof Error) ? err.message : 'Server error';
    res.status(500).json({ message: 'Error generating KPI report', error: message });
  }
};