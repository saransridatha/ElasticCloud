// routes/amis.ts
// AMI Catalog routes

import { Router, Request, Response } from 'express';
import { AVAILABLE_AMIS } from '@shared/types';

export const amisRouter = Router();

// GET /api/amis – list all base OS images
amisRouter.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: AVAILABLE_AMIS });
});
