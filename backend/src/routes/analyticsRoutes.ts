import { Router, Response } from 'express';
import { getDb } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/overview', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const isAdmin = user.role === 'admin';
  const userId = user.id;

  const candidateCountQuery = isAdmin 
    ? 'SELECT COUNT(*) as count FROM candidates' 
    : 'SELECT COUNT(DISTINCT a.candidate_id) as count FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id WHERE jp.created_by = ?';
  const totalCandidates = (await db.prepare(candidateCountQuery).get(...(isAdmin ? [] : [userId])) as any).count;

  const jobCountQuery = isAdmin 
    ? "SELECT COUNT(*) as count FROM job_positions WHERE status = 'active'"
    : "SELECT COUNT(*) as count FROM job_positions WHERE status = 'active' AND created_by = ?";
  const totalJobs = (await db.prepare(jobCountQuery).get(...(isAdmin ? [] : [userId])) as any).count;
  
  const totalRecruiters = (await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'recruiter'").get() as any).count;

  const assessmentCountQuery = isAdmin
    ? 'SELECT COUNT(*) as count FROM assessments'
    : 'SELECT COUNT(*) as count FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id WHERE jp.created_by = ?';
  const totalAssessments = (await db.prepare(assessmentCountQuery).get(...(isAdmin ? [] : [userId])) as any).count;

  const completedQuery = isAdmin
    ? "SELECT COUNT(*) as count FROM assessments WHERE status = 'completed'"
    : "SELECT COUNT(*) as count FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id WHERE a.status = 'completed' AND jp.created_by = ?";
  const completedAssessments = (await db.prepare(completedQuery).get(...(isAdmin ? [] : [userId])) as any).count;

  const inProgressQuery = isAdmin
    ? "SELECT COUNT(*) as count FROM assessments WHERE status = 'in_progress'"
    : "SELECT COUNT(*) as count FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id WHERE a.status = 'in_progress' AND jp.created_by = ?";
  const inProgress = (await db.prepare(inProgressQuery).get(...(isAdmin ? [] : [userId])) as any).count;

  const avgQuery = isAdmin
    ? "SELECT AVG(overall_score) as avg FROM assessments WHERE status = 'completed' AND overall_score IS NOT NULL"
    : "SELECT AVG(overall_score) as avg FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id WHERE a.status = 'completed' AND a.overall_score IS NOT NULL AND jp.created_by = ?";
  const avgScore = (await db.prepare(avgQuery).get(...(isAdmin ? [] : [userId])) as any).avg || 0;

  const recommendationsQuery = isAdmin
    ? "SELECT recommendation, COUNT(*) as count FROM assessments WHERE status = 'completed' AND recommendation IS NOT NULL GROUP BY recommendation"
    : "SELECT a.recommendation, COUNT(*) as count FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id WHERE a.status = 'completed' AND a.recommendation IS NOT NULL AND jp.created_by = ? GROUP BY a.recommendation";
  const recommendations = await db.prepare(recommendationsQuery).all(...(isAdmin ? [] : [userId]));

  const recentQuery = `
    SELECT a.*, jp.title as job_title, u.first_name || ' ' || u.last_name as candidate_name
    FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id
    JOIN candidates c ON a.candidate_id = c.id JOIN users u ON c.user_id = u.id
    ${isAdmin ? "" : "WHERE jp.created_by = ?"}
    ORDER BY a.created_at DESC LIMIT 5
  `;
  const recentAssessments = await db.prepare(recentQuery).all(...(isAdmin ? [] : [userId]));

  const scoresByJob = await db.prepare(`
    SELECT jp.title, AVG(a.overall_score) as avg_score, COUNT(*) as count
    FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id
    WHERE a.status = 'completed' AND a.overall_score IS NOT NULL GROUP BY jp.id, jp.title ORDER BY count DESC LIMIT 5
  `).all();

  const monthlyData = await db.prepare(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
    FROM assessments GROUP BY month ORDER BY month DESC LIMIT 6
  `).all();

  res.json({
    totalCandidates,
    totalRecruiters,
    totalJobs,
    totalAssessments,
    completedAssessments,
    inProgress,
    avgScore: Math.round(avgScore),
    recommendations,
    recentAssessments,
    scoresByJob,
    monthlyData: monthlyData.reverse(),
  });
}));

router.get('/candidates', authenticate, asyncHandler(async (_req: AuthRequest, res: Response) => {
  const db = getDb();
  const pipeline = await db.prepare(`
    SELECT status, COUNT(*) as count FROM assessments GROUP BY status
  `).all();
  const topCandidates = await db.prepare(`
    SELECT u.first_name || ' ' || u.last_name as name, u.email, a.overall_score, a.recommendation, jp.title as job_title
    FROM assessments a JOIN candidates c ON a.candidate_id = c.id JOIN users u ON c.user_id = u.id
    JOIN job_positions jp ON a.job_position_id = jp.id WHERE a.status = 'completed' AND a.overall_score IS NOT NULL
    ORDER BY a.overall_score DESC LIMIT 10
  `).all();
  res.json({ pipeline, topCandidates });
}));

router.get('/recruiters', authenticate, asyncHandler(async (_req: AuthRequest, res: Response) => {
  const db = getDb();
  const recruiters = await db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email,
    (SELECT COUNT(*) FROM job_positions jp WHERE jp.created_by = u.id) as job_count,
    (SELECT COUNT(*) FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id WHERE jp.created_by = u.id) as total_applicants
    FROM users u WHERE u.role = 'recruiter' OR u.role = 'admin'
    ORDER BY job_count DESC
  `).all();
  res.json(recruiters);
}));

export default router;
