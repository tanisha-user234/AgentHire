import { getDb } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface PromptVersion {
  id: string;
  organization_id: string;
  agent_role: string;
  version_tag: string;
  prompt_text: string;
  is_published: boolean;
}

export class PromptService {
  static async createPromptVersion(orgId: string, agentRole: string, text: string, tag: string): Promise<string> {
    const db = getDb();
    const id = uuidv4();
    
    // Unpublish other versions for this agent in this org
    await db.prepare('UPDATE prompt_versions SET is_published = FALSE WHERE organization_id = ? AND agent_role = ?')
      .run(orgId, agentRole);

    await db.prepare(`
      INSERT INTO prompt_versions (id, organization_id, agent_role, version_tag, prompt_text, is_published)
      VALUES (?, ?, ?, ?, ?, TRUE)
    `).run(id, orgId, agentRole, tag, text);
    
    return id;
  }

  static async getActivePrompt(orgId: string, agentRole: string): Promise<string | null> {
    const db = getDb();
    const row = await db.prepare('SELECT prompt_text FROM prompt_versions WHERE organization_id = ? AND agent_role = ? AND is_published = TRUE LIMIT 1')
      .get(orgId, agentRole) as any;
    
    return row?.prompt_text || null;
  }

  static async getPromptById(id: string): Promise<string | null> {
    const db = getDb();
    const row = await db.prepare('SELECT prompt_text FROM prompt_versions WHERE id = ?').get(id) as any;
    return row?.prompt_text || null;
  }

  static async seedDefaultPrompts(orgId: string): Promise<void> {
    // Check if defaults already exist
    const db = getDb();
    const count = await db.prepare('SELECT COUNT(*) as count FROM prompt_versions WHERE organization_id = ?').get(orgId) as any;
    if (count?.count > 0) return;

    const defaults = [
      {
        role: 'hiring_manager',
        tag: 'v1.0',
        text: 'You are an expert Hiring Manager. Your goal is to introduce the candidate to the company, explain the role, and assess cultural fit and career motivation. Be professional, welcoming, but discerning.'
      },
      {
        role: 'sme',
        tag: 'v1.0',
        text: 'You are a Senior Technical Expert. Your goal is to deep-dive into the candidate\'s technical skills, problem-solving approach, and architecture knowledge. Ask challenging but fair technical questions.'
      },
      {
        role: 'behavioral_analyst',
        tag: 'v1.0',
        text: 'You are a Behavioral Analyst. Your goal is to assess soft skills, emotional intelligence, collaboration style, and handling of conflict. Use the STAR method to probe for past experiences.'
      }
    ];

    for (const d of defaults) {
      await this.createPromptVersion(orgId, d.role, d.text, d.tag);
    }
  }
}
