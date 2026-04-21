import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, initDatabase } from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

export async function seedDatabase(): Promise<void> {
  await initDatabase();
  const db = getDb();

  const existing = await db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  if (existing && existing.count > 0) return;

  const hash = bcrypt.hashSync('password123', 12);

  // Create demo org
  const orgId = uuidv4();
  await db.prepare('INSERT INTO organizations (id, name, domain) VALUES (?::uuid, ?, ?)').run(orgId, 'TechCorp Inc.', 'techcorp.com');

  // Create users
  const adminId = uuidv4();
  const recruiterId = uuidv4();
  const candidateId = uuidv4();
  const candidate2Id = uuidv4();

  await db.prepare('INSERT INTO users (id, email, password_hash, role, first_name, last_name, organization_id) VALUES (?::uuid, ?, ?, ?, ?, ?, ?::uuid)')
    .run(adminId, 'admin@demo.com', hash, 'admin', 'Alex', 'Admin', orgId);
  await db.prepare('INSERT INTO users (id, email, password_hash, role, first_name, last_name, organization_id) VALUES (?::uuid, ?, ?, ?, ?, ?, ?::uuid)')
    .run(recruiterId, 'recruiter@demo.com', hash, 'recruiter', 'Sarah', 'Johnson', orgId);
  await db.prepare('INSERT INTO users (id, email, password_hash, role, first_name, last_name) VALUES (?::uuid, ?, ?, ?, ?, ?)')
    .run(candidateId, 'candidate@demo.com', hash, 'candidate', 'John', 'Doe');
  await db.prepare('INSERT INTO users (id, email, password_hash, role, first_name, last_name) VALUES (?::uuid, ?, ?, ?, ?, ?)')
    .run(candidate2Id, 'jane@demo.com', hash, 'candidate', 'Jane', 'Smith');

  // Create candidate profiles
  const cProfileId = uuidv4();
  const c2ProfileId = uuidv4();
  await db.prepare('INSERT INTO candidates (id, user_id, skills, experience_years, linkedin_url) VALUES (?::uuid, ?::uuid, ?, ?, ?)')
    .run(cProfileId, candidateId, JSON.stringify(['JavaScript', 'React', 'Node.js', 'TypeScript', 'PostgreSQL']), 4, 'https://linkedin.com/in/johndoe');
  await db.prepare('INSERT INTO candidates (id, user_id, skills, experience_years) VALUES (?::uuid, ?::uuid, ?, ?)')
    .run(c2ProfileId, candidate2Id, JSON.stringify(['Python', 'FastAPI', 'Machine Learning', 'TensorFlow', 'SQL']), 3);

  // Create job positions
  const job1Id = uuidv4();
  const job2Id = uuidv4();
  const job3Id = uuidv4();

  await db.prepare('INSERT INTO job_positions (id, title, department, location, description, requirements, assessment_config, salary_min, salary_max, experience_level, status, created_by) VALUES (?::uuid, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::uuid)')
    .run(job1Id, 'Senior Frontend Engineer', 'Engineering', 'Remote', 'Build cutting-edge web applications with React and TypeScript.',
      JSON.stringify({ skills: ['React', 'TypeScript', 'CSS', 'Testing', 'Performance'], education: "Bachelor's in CS or equivalent" }),
      JSON.stringify({ agents: ['hiring_manager', 'sme', 'behavioral_analyst'], difficulty: 'hard', timeLimit: 60 }),
      100000, 140000, 'senior', 'active', recruiterId);

  await db.prepare('INSERT INTO job_positions (id, title, department, location, description, requirements, assessment_config, salary_min, salary_max, experience_level, status, created_by) VALUES (?::uuid, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::uuid)')
    .run(job2Id, 'ML Engineer', 'AI/ML', 'Hybrid', 'Develop and deploy machine learning models at scale.',
      JSON.stringify({ skills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps', 'SQL'], education: "Master's preferred" }),
      JSON.stringify({ agents: ['hiring_manager', 'sme', 'behavioral_analyst'], difficulty: 'hard', timeLimit: 75 }),
      110000, 150000, 'mid', 'active', recruiterId);

  await db.prepare('INSERT INTO job_positions (id, title, department, location, description, requirements, assessment_config, salary_min, salary_max, experience_level, status, created_by) VALUES (?::uuid, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::uuid)')
    .run(job3Id, 'Product Manager', 'Product', 'On-site', 'Drive product strategy and roadmap for our B2B SaaS platform.',
      JSON.stringify({ skills: ['Roadmapping', 'Data Analysis', 'User Research', 'Agile', 'Stakeholder Management'] }),
      JSON.stringify({ agents: ['hiring_manager', 'behavioral_analyst'], difficulty: 'medium', timeLimit: 45 }),
      90000, 130000, 'mid', 'active', recruiterId);

  // Create sample completed assessments
  const assess1Id = uuidv4();
  const assess2Id = uuidv4();

  await db.prepare('INSERT INTO assessments (id, candidate_id, job_position_id, status, scheduled_at, started_at, completed_at, overall_score, recommendation, created_by) VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, ?, ?, ?, ?, ?::uuid)')
    .run(assess1Id, c2ProfileId, job2Id, 'completed',
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000).toISOString(),
      82, 'hire', recruiterId);

  await db.prepare('INSERT INTO assessments (id, candidate_id, job_position_id, status, scheduled_at, started_at, completed_at, overall_score, recommendation, created_by) VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, ?, ?, ?, ?, ?::uuid)')
    .run(assess2Id, cProfileId, job3Id, 'completed',
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 40 * 60 * 1000).toISOString(),
      76, 'hire', recruiterId);

  // Create a scheduled assessment for the candidate
  const assess3Id = uuidv4();
  await db.prepare('INSERT INTO assessments (id, candidate_id, job_position_id, status, scheduled_at, created_by) VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, ?::uuid)')
    .run(assess3Id, cProfileId, job1Id, 'scheduled', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), recruiterId);

  // Sample evaluations for completed assessments
  const evalId1 = uuidv4(); const evalId2 = uuidv4(); const evalId3 = uuidv4();
  await db.prepare('INSERT INTO evaluations (id, assessment_id, agent_role, scores, observations, strengths, weaknesses) VALUES (?::uuid, ?::uuid, ?, ?, ?, ?, ?)')
    .run(evalId1, assess1Id, 'hiring_manager', JSON.stringify({ values_alignment: 84, motivation: 89, career_goals_fit: 80, team_compatibility: 85 }),
      'Candidate shows strong motivation and clear alignment with company values.', JSON.stringify(['Clear communication', 'Strong motivation']), JSON.stringify(['Could be more specific on timeline']));
  await db.prepare('INSERT INTO evaluations (id, assessment_id, agent_role, scores, observations, strengths, weaknesses) VALUES (?::uuid, ?::uuid, ?, ?, ?, ?, ?)')
    .run(evalId2, assess1Id, 'sme', JSON.stringify({ domain_knowledge: 82, problem_solving: 85, code_quality: 78, technical_communication: 80 }),
      'Good technical depth in ML. Solid understanding of model deployment pipelines.', JSON.stringify(['Strong Python skills', 'MLOps knowledge']), JSON.stringify(['Could improve on system design']));
  await db.prepare('INSERT INTO evaluations (id, assessment_id, agent_role, scores, observations, strengths, weaknesses) VALUES (?::uuid, ?::uuid, ?, ?, ?, ?, ?)')
    .run(evalId3, assess1Id, 'behavioral_analyst', JSON.stringify({ communication: 83, emotional_intelligence: 79, leadership_potential: 76, adaptability: 82 }),
      'Demonstrates good emotional awareness and team-first mentality.', JSON.stringify(['Empathetic', 'Problem-solver']), JSON.stringify(['Leadership visibility could improve']));

  // Deliberations for completed assessment
  await db.prepare('INSERT INTO agent_deliberations (id, assessment_id, from_agent, to_agent, message, message_type) VALUES (?::uuid, ?::uuid, ?, ?, ?, ?)')
    .run(uuidv4(), assess1Id, 'hiring_manager', 'sme', 'Cultural fit looks strong. Strong motivation for ML work. Please assess technical depth.', 'observation');
  await db.prepare('INSERT INTO agent_deliberations (id, assessment_id, from_agent, to_agent, message, message_type) VALUES (?::uuid, ?::uuid, ?, ?, ?, ?)')
    .run(uuidv4(), assess1Id, 'sme', 'behavioral_analyst', 'Technical skills confirmed for ML role. Assess teamwork capacity — will be joining a cross-functional team.', 'observation');
  await db.prepare('INSERT INTO agent_deliberations (id, assessment_id, from_agent, to_agent, message, message_type) VALUES (?::uuid, ?::uuid, ?, ?, ?, ?)')
    .run(uuidv4(), assess1Id, 'behavioral_analyst', 'hiring_manager', 'Assessment complete. Score 82. Recommend: Hire. Strong team player with good communication.', 'observation');

  // Notifications
  await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?::uuid, ?::uuid, ?, ?, ?)')
    .run(uuidv4(), candidateId, 'Assessment Scheduled', 'Your Senior Frontend Engineer assessment is scheduled for tomorrow.', 'info');
  await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?::uuid, ?::uuid, ?, ?, ?)')
    .run(uuidv4(), recruiterId, 'Assessment Completed', 'Jane Smith completed the ML Engineer assessment. Score: 82.', 'success');

  console.log('✅ Database seeded with demo data');
}

// Execute if run directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
