import { Router, Response } from 'express';
import { getDb } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { isMockMode, AI_MODEL } from '../config/ai';

const router = Router();

router.get('/status', authenticate, asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json({
    mode: isMockMode() ? 'mock' : 'openrouter',
    model: isMockMode() ? 'Demo Mode (No API Key)' : `${AI_MODEL} (OpenRouter)`,
    agents: ['hiring_manager', 'sme', 'behavioral_analyst'],
  });
}));

router.get('/deliberations/:assessmentId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const deliberations = await db.prepare('SELECT * FROM agent_deliberations WHERE assessment_id = ? ORDER BY created_at ASC').all(req.params.assessmentId);
  res.json(deliberations);
}));

export default router;
