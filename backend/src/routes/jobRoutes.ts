import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { screenApplication } from '../services/screeningService';
import { GraphService } from '../services/graphService';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const jobs = await db.prepare(`
    SELECT jp.*, u.first_name || ' ' || u.last_name as created_by_name,
    (SELECT COUNT(*) FROM assessments a WHERE a.job_position_id = jp.id) as applicant_count
    FROM job_positions jp 
    LEFT JOIN users u ON jp.created_by = u.id 
    ${req.user!.role !== 'admin' && req.user!.role !== 'recruiter' ? "WHERE jp.status = 'active'" : ""}
    ORDER BY jp.created_at DESC
  `).all();
  res.json(jobs.map((j: any) => ({
    ...j,
    requirements: typeof j.requirements === 'string' ? JSON.parse(j.requirements || '{}') : (j.requirements || {}),
    assessment_config: typeof j.assessment_config === 'string' ? JSON.parse(j.assessment_config || '{}') : (j.assessment_config || {}),
  })));
}));

router.post('/', authenticate, authorize('admin', 'recruiter'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, department, location, description, requirements, assessmentConfig, salaryMin, salaryMax, experienceLevel } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = getDb();
  const id = uuidv4();
  await db.prepare(`INSERT INTO job_positions (id, title, department, location, description, requirements, assessment_config, salary_min, salary_max, experience_level, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, title, department || '', location || '', description || '', JSON.stringify(requirements || {}), JSON.stringify(assessmentConfig || {}), salaryMin, salaryMax, experienceLevel || 'mid', req.user!.id);
  
  // Phase 2A: Create default interview graph for the job
  await GraphService.createDefaultGraph(id);

  const job = await db.prepare('SELECT * FROM job_positions WHERE id = ?').get(id) as any;
  res.status(201).json({
    ...job,
    requirements: typeof job.requirements === 'string' ? JSON.parse(job.requirements || '{}') : (job.requirements || {}),
    assessment_config: typeof job.assessment_config === 'string' ? JSON.parse(job.assessment_config || '{}') : (job.assessment_config || {}),
  });
}));

router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const job = await db.prepare(`
    SELECT jp.*, u.first_name || ' ' || u.last_name as created_by_name
    FROM job_positions jp LEFT JOIN users u ON jp.created_by = u.id
    WHERE jp.id = ?
  `).get(req.params.id) as any;
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    ...job,
    requirements: typeof job.requirements === 'string' ? JSON.parse(job.requirements || '{}') : (job.requirements || {}),
    assessment_config: typeof job.assessment_config === 'string' ? JSON.parse(job.assessment_config || '{}') : (job.assessment_config || {}),
  });
}));

router.put('/:id', authenticate, authorize('admin', 'recruiter'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, department, location, description, requirements, assessmentConfig, salaryMin, salaryMax, experienceLevel, status } = req.body;
  const db = getDb();
  await db.prepare(`UPDATE job_positions SET title=?, department=?, location=?, description=?, requirements=?, assessment_config=?,
    salary_min=?, salary_max=?, experience_level=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(title, department, location, description, JSON.stringify(requirements || {}), JSON.stringify(assessmentConfig || {}), salaryMin, salaryMax, experienceLevel, status || 'active', req.params.id);
  const job = await db.prepare('SELECT * FROM job_positions WHERE id = ?').get(req.params.id) as any;
  res.json({
    ...job,
    requirements: typeof job.requirements === 'string' ? JSON.parse(job.requirements || '{}') : (job.requirements || {}),
    assessment_config: typeof job.assessment_config === 'string' ? JSON.parse(job.assessment_config || '{}') : (job.assessment_config || {}),
  });
}));

router.delete('/:id', authenticate, authorize('admin', 'recruiter'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  await db.prepare('DELETE FROM job_positions WHERE id = ?').run(req.params.id);
  res.json({ message: 'Job deleted' });
}));

router.post('/:id/apply', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;
  const { coverLetter, metaData, resumeText } = req.body;

  if (!resumeText) {
    return res.status(400).json({ error: 'Resume text is required for application' });
  }

  // Debug role issue
  console.log('--- APPLICATION DEBUG ---');
  console.log('User ID:', userId);
  console.log('User Role:', req.user!.role);
  console.log('User Role (lower):', req.user!.role?.toLowerCase());

  // Check if candidate record exists - This is the most reliable check
  let candidate = await db.prepare('SELECT id FROM candidates WHERE user_id = ?').get(userId) as any;
  
  // If no candidate record, but user is a candidate, we'll create one as we did before
  const userRole = (req.user!.role || '').toLowerCase();
  if (userRole !== 'candidate' && userRole !== 'admin') {
    return res.status(403).json({ error: `Only candidates can apply (Your role: ${req.user!.role})` });
  }

  if (!candidate) {
    console.log('Auto-creating missing candidate profile for application');
    const candidateId = uuidv4();
    await db.prepare('INSERT INTO candidates (id, user_id) VALUES (?, ?)').run(candidateId, userId);
    candidate = { id: candidateId };
  }

  // Get job details for screening and notification
  const job = await db.prepare('SELECT * FROM job_positions WHERE id = ?').get(req.params.id) as any;
  if (!job) return res.status(404).json({ error: 'Job not found' });

  // Notify recruiter immediately of the application
  const userDisplayName = `${req.user!.first_name} ${req.user!.last_name}`;
  await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), job.created_by, 'New Application Received', `${userDisplayName} has applied for ${job.title}. AI Screening is starting...`, 'info');

  // Run AI Screening
  const screening = await screenApplication(
    { title: job.title, description: job.description || '', requirements: typeof job.requirements === 'string' ? JSON.parse(job.requirements || '{}') : (job.requirements || {}) },
    { resume: resumeText, coverLetter: coverLetter || '', metaData: metaData || {} }
  );

  // Update candidate's resume/skills if they submitted a new one
  await db.prepare('UPDATE candidates SET resume_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(resumeText, candidate.id);

  // Create assessment/application with 'applied' status
  const id = uuidv4();
  await db.prepare(`
    INSERT INTO assessments (id, candidate_id, job_position_id, status, created_by, cover_letter, application_meta, screening_score, screening_feedback)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, 
    candidate.id, 
    job.id, 
    'applied', 
    userId, 
    coverLetter || '', 
    JSON.stringify(metaData || {}), 
    screening.score, 
    screening.feedback
  );

  res.status(201).json({ 
    message: 'Applied successfully', 
    assessmentId: id,
    screeningScore: screening.score 
  });
}));

export default router;
