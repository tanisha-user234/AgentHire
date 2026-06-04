import { Router, Response } from 'express';
import { getDb } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { isMockMode, AI_MODEL } from '../config/ai';
import { GraphService } from '../services/graphService';
import { PromptService } from '../services/promptService';

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

// Graphs
router.get('/graphs/:jobId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const graph = await GraphService.getActiveGraphForJob(req.params.jobId);
  res.json(graph);
}));

router.post('/graphs/:jobId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const graphId = await GraphService.createGraph(req.params.jobId, req.body);
  res.status(201).json({ id: graphId });
}));

router.get('/graphs/runs/:assessmentId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const run = await GraphService.getGraphRun(req.params.assessmentId);
  res.json(run);
}));

// Prompts
router.get('/prompts/:agentRole', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.organization_id) return res.status(400).json({ error: 'Org ID required' });
  const prompt = await PromptService.getActivePrompt(req.user.organization_id, req.params.agentRole);
  res.json({ prompt });
}));

router.post('/prompts/:agentRole', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.organization_id) return res.status(400).json({ error: 'Org ID required' });
  const { promptText, versionTag } = req.body;
  const id = await PromptService.createPromptVersion(req.user.organization_id, req.params.agentRole, promptText, versionTag || 'v1.0');
  res.status(201).json({ id });
}));

export default router;
