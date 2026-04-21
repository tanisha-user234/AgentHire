import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let assessments;
  if (user.role === 'candidate') {
    const candidate = await db.prepare('SELECT id FROM candidates WHERE user_id = ?').get(user.id) as any;
    assessments = candidate ? await db.prepare(`
      SELECT a.*, jp.title as job_title, jp.department,
             u.first_name || ' ' || u.last_name as candidate_name
      FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id
      JOIN candidates c ON a.candidate_id = c.id JOIN users u ON c.user_id = u.id
      WHERE a.candidate_id = ? ORDER BY a.created_at DESC
    `).all(candidate.id) : [];
  } else {
    const isAdmin = user.role === 'admin';
    const userId = user.id;
    assessments = await db.prepare(`
      SELECT a.*, jp.title as job_title, jp.department,
             u.first_name || ' ' || u.last_name as candidate_name, u.email as candidate_email,
             ru.first_name || ' ' || ru.last_name as recruiter_name
      FROM assessments a 
      JOIN job_positions jp ON a.job_position_id = jp.id
      JOIN candidates c ON a.candidate_id = c.id 
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users ru ON jp.created_by = ru.id
      ${isAdmin ? "" : "WHERE jp.created_by = ?"}
      ORDER BY a.created_at DESC LIMIT 100
    `).all(...(isAdmin ? [] : [userId]));
  }
  res.json(assessments);
}));

router.post('/', authenticate, authorize('admin', 'recruiter'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { candidateId, jobPositionId, scheduledAt } = req.body;
  if (!candidateId || !jobPositionId) return res.status(400).json({ error: 'candidateId and jobPositionId required' });
  const db = getDb();
  const id = uuidv4();
  await db.prepare('INSERT INTO assessments (id, candidate_id, job_position_id, scheduled_at, created_by, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, candidateId, jobPositionId, scheduledAt || new Date().toISOString(), req.user!.id, 'scheduled');

  // Create notification for candidate
  const candidate = await db.prepare('SELECT user_id FROM candidates WHERE id = ?').get(candidateId) as any;
  if (candidate) {
    const job = await db.prepare('SELECT title FROM job_positions WHERE id = ?').get(jobPositionId) as any;
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), candidate.user_id, 'Assessment Scheduled', `You have been scheduled for assessment: ${job?.title}`, 'info');
  }

  const assessment = await db.prepare('SELECT * FROM assessments WHERE id = ?').get(id);
  res.status(201).json(assessment);
}));

router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const assessment = await db.prepare(`
    SELECT a.*, jp.title as job_title, jp.department, jp.description as job_description, jp.requirements,
           u.first_name || ' ' || u.last_name as candidate_name, u.email as candidate_email,
           c.skills, c.experience_years, c.linkedin_url
    FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id
    JOIN candidates c ON a.candidate_id = c.id JOIN users u ON c.user_id = u.id
    WHERE a.id = ?
  `).get(req.params.id) as any;
  if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

  const evaluations = await db.prepare('SELECT * FROM evaluations WHERE assessment_id = ?').all(req.params.id) as any[];
  const deliberations = await db.prepare('SELECT * FROM agent_deliberations WHERE assessment_id = ? ORDER BY created_at ASC').all(req.params.id);
  const sessions = await db.prepare('SELECT * FROM interview_sessions WHERE assessment_id = ?').all(req.params.id) as any[];

  res.json({
    ...assessment,
    requirements: typeof assessment.requirements === 'string' ? JSON.parse(assessment.requirements || '{}') : (assessment.requirements || {}),
    skills: typeof assessment.skills === 'string' ? JSON.parse(assessment.skills || '[]') : (assessment.skills || []),
    evaluations: evaluations.map(e => ({
      ...e,
      scores: typeof e.scores === 'string' ? JSON.parse(e.scores || '{}') : (e.scores || {}),
      strengths: typeof e.strengths === 'string' ? JSON.parse(e.strengths || '[]') : (e.strengths || []),
      weaknesses: typeof e.weaknesses === 'string' ? JSON.parse(e.weaknesses || '[]') : (e.weaknesses || []),
      red_flags: typeof e.red_flags === 'string' ? JSON.parse(e.red_flags || '[]') : (e.red_flags || []),
    })),
    deliberations,
    sessions: sessions.map(s => ({
      ...s,
      conversation_history: typeof s.conversation_history === 'string' ? JSON.parse(s.conversation_history || '[]') : (s.conversation_history || []),
    })),
  });
}));

router.put('/:id/status', authenticate, authorize('admin', 'recruiter'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const db = getDb();
  
  const result = await db.prepare(`UPDATE assessments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, req.params.id);
  
  if (status === 'scheduled') {
    const assessment = await db.prepare(`
      SELECT a.candidate_id, jp.title 
      FROM assessments a 
      JOIN job_positions jp ON a.job_position_id = jp.id 
      WHERE a.id = ?
    `).get(req.params.id) as any;

    if (assessment) {
      const candidate = await db.prepare('SELECT user_id FROM candidates WHERE id = ?').get(assessment.candidate_id) as any;
      if (candidate) {
        await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
          .run(uuidv4(), candidate.user_id, 'Assessment Scheduled', `A recruiter has scheduled your assessment for ${assessment.title}. Good luck!`, 'info');
      }
    }
  }

  res.json({ message: 'Status updated' });
}));

export default router;
