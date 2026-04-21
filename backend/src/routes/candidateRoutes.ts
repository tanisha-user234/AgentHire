import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { parseResume } from '../services/resumeService';

const router = Router();

router.get('/', authenticate, authorize('admin', 'recruiter'), asyncHandler(async (_req: AuthRequest, res: Response) => {
  const db = getDb();
  const candidates = await db.prepare(`
    SELECT c.*, u.email, u.first_name, u.last_name,
      (SELECT COUNT(*) FROM assessments a WHERE a.candidate_id = c.id) as assessment_count,
      (SELECT recommendation FROM assessments a WHERE a.candidate_id = c.id ORDER BY a.created_at DESC LIMIT 1) as latest_recommendation
    FROM candidates c JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC
  `).all();
  res.json(candidates.map((c: any) => ({
    ...c,
    skills: typeof c.skills === 'string' ? JSON.parse(c.skills || '[]') : (c.skills || []),
    parsed_resume: typeof c.parsed_resume === 'string' ? JSON.parse(c.parsed_resume || '{}') : (c.parsed_resume || {}),
  })));
}));

router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  let candidate = await db.prepare(`SELECT c.*, u.email, u.first_name, u.last_name FROM candidates c JOIN users u ON c.user_id = u.id WHERE c.user_id = ?`).get(req.user!.id) as any;
  
  if (!candidate && req.user!.role === 'candidate') {
    // Auto-create missing candidate record
    const candidateId = uuidv4();
    await db.prepare('INSERT INTO candidates (id, user_id) VALUES (?, ?)').run(candidateId, req.user!.id);
    candidate = await db.prepare(`SELECT c.*, u.email, u.first_name, u.last_name FROM candidates c JOIN users u ON c.user_id = u.id WHERE c.user_id = ?`).get(req.user!.id) as any;
  }

  if (!candidate) return res.status(404).json({ error: 'Candidate profile not found' });
  
  res.json({
    ...candidate,
    skills: typeof candidate.skills === 'string' ? JSON.parse(candidate.skills || '[]') : (candidate.skills || []),
    parsed_resume: typeof candidate.parsed_resume === 'string' ? JSON.parse(candidate.parsed_resume || '{}') : (candidate.parsed_resume || {}),
  });
}));

router.put('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { phone, location, linkedinUrl, skills, experienceYears, about, firstName, lastName } = req.body;
  const db = getDb();
  
  // Ensure candidate row exists
  let candidateRow = await db.prepare('SELECT id FROM candidates WHERE user_id = ?').get(req.user!.id);
  if (!candidateRow && req.user!.role === 'candidate') {
    await db.prepare('INSERT INTO candidates (id, user_id) VALUES (?, ?)').run(uuidv4(), req.user!.id);
  }

  await db.prepare(`UPDATE candidates SET phone=?, location=?, linkedin_url=?, skills=?, experience_years=?, about=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?`)
    .run(phone || '', location || '', linkedinUrl || '', JSON.stringify(skills || []), experienceYears || 0, about || '', req.user!.id);
    
  await db.prepare(`UPDATE users SET first_name=?, last_name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(firstName || '', lastName || '', req.user!.id);
    
  const updatedCandidate = await db.prepare(`SELECT c.*, u.email, u.first_name, u.last_name FROM candidates c JOIN users u ON c.user_id = u.id WHERE u.id = ?`).get(req.user!.id) as any;
  
  res.json({
    ...updatedCandidate,
    skills: updatedCandidate?.skills ? (typeof updatedCandidate.skills === 'string' ? JSON.parse(updatedCandidate.skills) : updatedCandidate.skills) : [],
  });
}));

router.post('/me/resume', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { resumeText } = req.body;
  if (!resumeText) return res.status(400).json({ error: 'Resume text is required' });

  const parsedData = await parseResume(resumeText);
  const db = getDb();
  
  await db.prepare(`UPDATE candidates SET parsed_resume=?, skills=?, experience_years=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?`)
    .run(JSON.stringify(parsedData), JSON.stringify(parsedData.skills || []), Number(parsedData.experience_years) || 0, req.user!.id);
    
  res.json({ message: 'Resume parsed and profile updated', data: parsedData });
}));

router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const candidate = await db.prepare(`SELECT c.*, u.email, u.first_name, u.last_name FROM candidates c JOIN users u ON c.user_id = u.id WHERE c.id = ?`).get(req.params.id) as any;
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  const assessments = await db.prepare(`SELECT a.*, jp.title as job_title FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id WHERE a.candidate_id = ?`).all(req.params.id);
  res.json({
    ...candidate,
    skills: typeof candidate.skills === 'string' ? JSON.parse(candidate.skills || '[]') : (candidate.skills || []),
    assessments,
  });
}));

router.get('/recruiter/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const recruiter = await db.prepare("SELECT id, first_name, last_name, email, role FROM users WHERE id = ? AND role = 'recruiter'").get(req.params.id) as any;
  if (!recruiter) return res.status(404).json({ error: 'Recruiter not found' });
  res.json(recruiter);
}));

router.put('/recruiter/me', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { firstName, lastName } = req.body;
  const db = getDb();
  await db.prepare('UPDATE users SET first_name = ?, last_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(firstName || '', lastName || '', req.user!.id);
  const updated = await db.prepare('SELECT id, email, role, first_name, last_name FROM users WHERE id = ?').get(req.user!.id) as any;
  res.json(updated);
}));

export default router;
