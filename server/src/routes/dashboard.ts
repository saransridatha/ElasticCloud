// routes/dashboard.ts
// Dashboard summary metrics route

import { Router, Request, Response } from 'express';
import { getDashboardSummary } from '../db';

export const dashboardRouter = Router();

// GET /api/dashboard – summary telemetry of fleet
dashboardRouter.get('/', (_req: Request, res: Response) => {
  try {
    const summary = getDashboardSummary();
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
