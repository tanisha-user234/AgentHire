import { Router, Response } from 'express';
import { getDb } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/assessment/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const assessment = await db.prepare(`
    SELECT a.*, jp.title as job_title, jp.department, jp.description as job_description,
           u.first_name || ' ' || u.last_name as candidate_name, u.email as candidate_email,
           c.skills, c.experience_years
    FROM assessments a JOIN job_positions jp ON a.job_position_id = jp.id
    JOIN candidates c ON a.candidate_id = c.id JOIN users u ON c.user_id = u.id
    WHERE a.id = ?
  `).get(req.params.id) as any;

  if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

  const evaluations = await db.prepare('SELECT * FROM evaluations WHERE assessment_id = ?').all(req.params.id) as any[];
  const deliberations = await db.prepare('SELECT * FROM agent_deliberations WHERE assessment_id = ? ORDER BY created_at ASC').all(req.params.id);

  const parsedEvals = evaluations.map(e => ({
    ...e,
    scores: typeof e.scores === 'string' ? JSON.parse(e.scores || '{}') : (e.scores || {}),
    strengths: typeof e.strengths === 'string' ? JSON.parse(e.strengths || '[]') : (e.strengths || []),
    weaknesses: typeof e.weaknesses === 'string' ? JSON.parse(e.weaknesses || '[]') : (e.weaknesses || []),
    red_flags: typeof e.red_flags === 'string' ? JSON.parse(e.red_flags || '[]') : (e.red_flags || []),
  }));

  // Return HTML report
  const html = generateHTMLReport(assessment, parsedEvals, deliberations as any[]);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}));

function generateHTMLReport(assessment: any, evaluations: any[], deliberations: any[]): string {
  const score = assessment.overall_score || 0;
  const recColors: Record<string, string> = {
    strong_hire: '#10b981', hire: '#3b82f6', maybe: '#f59e0b', no_hire: '#ef4444'
  };
  const rec = assessment.recommendation || 'pending';
  const color = recColors[rec] || '#6b7280';

  const evalHTML = evaluations.map(e => `
    <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:16px;">
      <h3 style="color:#94a3b8;margin:0 0 12px;text-transform:capitalize;">${e.agent_role.replace('_', ' ')} Agent</h3>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
        ${Object.entries(e.scores).map(([k, v]) => `
          <div style="background:#0f172a;border-radius:8px;padding:10px 16px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#6366f1;">${v}</div>
            <div style="font-size:12px;color:#64748b;text-transform:capitalize;">${k.replace('_', ' ')}</div>
          </div>
        `).join('')}
      </div>
      <p style="color:#cbd5e1;font-size:14px;">${e.observations || ''}</p>
      <div style="display:flex;gap:20px;margin-top:12px;">
        <div><strong style="color:#10b981;">✓ Strengths:</strong> <span style="color:#94a3b8;">${(e.strengths || []).join(', ')}</span></div>
        <div><strong style="color:#f59e0b;">⚠ Improvements:</strong> <span style="color:#94a3b8;">${(e.weaknesses || []).join(', ')}</span></div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Assessment Report</title>
<style>body{font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:40px;}
h1{color:#fff;} h2{color:#94a3b8;border-bottom:1px solid #334155;padding-bottom:8px;}</style></head>
<body>
<h1>🎯 Assessment Report</h1>
<p style="color:#64748b;">Generated: ${new Date().toLocaleString()}</p>
<div style="display:flex;gap:20px;margin:24px 0;flex-wrap:wrap;">
  <div style="background:#1e293b;border-radius:12px;padding:20px;min-width:160px;">
    <div style="font-size:48px;font-weight:700;color:#6366f1;">${Math.round(score)}</div>
    <div style="color:#64748b;">Overall Score</div>
  </div>
  <div style="background:#1e293b;border-radius:12px;padding:20px;min-width:160px;">
    <div style="font-size:24px;font-weight:700;color:${color};text-transform:capitalize;">${rec.replace('_', ' ')}</div>
    <div style="color:#64748b;">Recommendation</div>
  </div>
  <div style="background:#1e293b;border-radius:12px;padding:20px;flex:1;">
    <div><strong>Candidate:</strong> ${assessment.candidate_name}</div>
    <div><strong>Position:</strong> ${assessment.job_title}</div>
    <div><strong>Department:</strong> ${assessment.department || 'N/A'}</div>
    <div><strong>Completed:</strong> ${assessment.completed_at ? new Date(assessment.completed_at).toLocaleDateString() : 'In Progress'}</div>
  </div>
</div>
<h2>Agent Evaluations</h2>${evalHTML}
<h2>Agent Deliberations</h2>
${deliberations.map(d => `<div style="background:#1e293b;border-radius:8px;padding:12px;margin-bottom:8px;">
  <span style="color:#6366f1;">📡 ${d.from_agent}</span> → <span style="color:#f59e0b;">${d.to_agent}</span>
  <p style="color:#cbd5e1;margin:8px 0 0;">${d.message}</p></div>`).join('')}
</body></html>`;
}

export default router;
