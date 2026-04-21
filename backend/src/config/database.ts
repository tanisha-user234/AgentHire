import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn('⚠️ DATABASE_URL not found in .env, using default');
    }
    pool = new Pool({
      connectionString: connectionString || 'postgresql://postgres:Tanu@123@localhost:5432/agentic_assessment',
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}

// Utility function to get a legacy-style DB object for easier refactor
export const getDb = () => {
  const p = getPool();
  return {
    prepare: (sql: string) => {
      const paramSql = (query: string) => {
        let idx = 0;
        return query.replace(/\?/g, () => `$${++idx}`);
      };

      return {
        run: async (...params: any[]) => {
          const res = await p.query(paramSql(sql), params);
          return res;
        },
        get: async (...params: any[]) => {
          const res = await p.query(paramSql(sql), params);
          return res.rows[0];
        },
        all: async (...params: any[]) => {
          const res = await p.query(paramSql(sql), params);
          return res.rows;
        }
      };
    },
    exec: async (sql: string) => {
      return await p.query(sql);
    }
  };
};

export async function initDatabase(): Promise<void> {
  const p = getPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT,
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'candidate',
      first_name TEXT,
      last_name TEXT,
      organization_id UUID REFERENCES organizations(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS job_positions (
      id UUID PRIMARY KEY,
      organization_id UUID REFERENCES organizations(id),
      title TEXT NOT NULL,
      department TEXT,
      location TEXT,
      description TEXT,
      requirements JSONB DEFAULT '{}',
      assessment_config JSONB DEFAULT '{}',
      status TEXT DEFAULT 'active',
      salary_min INTEGER,
      salary_max INTEGER,
      experience_level TEXT,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      resume_url TEXT,
      linkedin_url TEXT,
      parsed_resume JSONB DEFAULT '{}',
      skills JSONB DEFAULT '[]',
      experience_years REAL DEFAULT 0,
      phone TEXT,
      location TEXT,
      about TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Ensure about column exists in candidates
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='about') THEN
        ALTER TABLE candidates ADD COLUMN about TEXT;
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS assessments (
      id UUID PRIMARY KEY,
      candidate_id UUID REFERENCES candidates(id),
      job_position_id UUID REFERENCES job_positions(id),
      status TEXT DEFAULT 'scheduled',
      scheduled_at TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      overall_score REAL,
      recommendation TEXT,
      progress INTEGER DEFAULT 0,
      current_agent TEXT DEFAULT 'hiring_manager',
      current_phase TEXT DEFAULT 'intro',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Ensure columns exist in existing database
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assessments' AND column_name='progress') THEN
        ALTER TABLE assessments ADD COLUMN progress INTEGER DEFAULT 0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assessments' AND column_name='current_agent') THEN
        ALTER TABLE assessments ADD COLUMN current_agent TEXT DEFAULT 'hiring_manager';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assessments' AND column_name='current_phase') THEN
        ALTER TABLE assessments ADD COLUMN current_phase TEXT DEFAULT 'intro';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assessments' AND column_name='cover_letter') THEN
        ALTER TABLE assessments ADD COLUMN cover_letter TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assessments' AND column_name='application_meta') THEN
        ALTER TABLE assessments ADD COLUMN application_meta JSONB DEFAULT '{}';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assessments' AND column_name='screening_score') THEN
        ALTER TABLE assessments ADD COLUMN screening_score REAL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assessments' AND column_name='screening_feedback') THEN
        ALTER TABLE assessments ADD COLUMN screening_feedback TEXT;
      END IF;

      -- Migrate candidates.experience_years to REAL
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='experience_years' AND data_type='integer') THEN
        ALTER TABLE candidates ALTER COLUMN experience_years TYPE REAL;
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS interview_sessions (
      id UUID PRIMARY KEY,
      assessment_id UUID REFERENCES assessments(id),
      agent_role TEXT NOT NULL,
      conversation_history JSONB DEFAULT '[]',
      started_at TIMESTAMP,
      ended_at TIMESTAMP,
      duration_seconds INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id UUID PRIMARY KEY,
      assessment_id UUID REFERENCES assessments(id),
      agent_role TEXT NOT NULL,
      scores JSONB DEFAULT '{}',
      observations TEXT,
      strengths JSONB DEFAULT '[]',
      weaknesses JSONB DEFAULT '[]',
      red_flags JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_deliberations (
      id UUID PRIMARY KEY,
      assessment_id UUID REFERENCES assessments(id),
      from_agent TEXT NOT NULL,
      to_agent TEXT NOT NULL,
      message TEXT NOT NULL,
      message_type TEXT DEFAULT 'observation',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ PostgreSQL Database initialized');
}
