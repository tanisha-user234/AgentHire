import { getDb } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Question {
  id: string;
  organization_id: string;
  category: string;
  skill: string;
  difficulty: string;
  question_text: string;
  ideal_answer_rubric?: string;
}

export class QuestionBankService {
  static async addQuestion(orgId: string, question: Omit<Question, 'id' | 'organization_id'>): Promise<string> {
    const db = getDb();
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO question_bank (id, organization_id, category, skill, difficulty, question_text, ideal_answer_rubric)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, orgId, question.category, question.skill, question.difficulty, question.question_text, question.ideal_answer_rubric);
    return id;
  }

  static async getQuestions(orgId: string, filters?: { category?: string; skill?: string; difficulty?: string }): Promise<Question[]> {
    const db = getDb();
    let query = 'SELECT * FROM question_bank WHERE organization_id = ?';
    const params: any[] = [orgId];

    if (filters?.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters?.skill) {
      query += ' AND skill = ?';
      params.push(filters.skill);
    }
    if (filters?.difficulty) {
      query += ' AND difficulty = ?';
      params.push(filters.difficulty);
    }

    return await db.prepare(query).all(...params) as Question[];
  }

  static async getRandomQuestions(orgId: string, limit: number, filters?: { category?: string; skill?: string; difficulty?: string }): Promise<Question[]> {
    const questions = await this.getQuestions(orgId, filters);
    return questions.sort(() => 0.5 - Math.random()).slice(0, limit);
  }

  static async seedDefaultQuestions(orgId: string): Promise<void> {
    const db = getDb();
    const count = await db.prepare('SELECT COUNT(*) as count FROM question_bank WHERE organization_id = ?').get(orgId) as any;
    if (count?.count > 0) return;

    const defaults = [
      { category: 'Technical', skill: 'React', difficulty: 'mid', question_text: 'Explain the difference between useMemo and useCallback.' },
      { category: 'Technical', skill: 'Node.js', difficulty: 'senior', question_text: 'How does the Node.js event loop work under the hood?' },
      { category: 'Behavioral', skill: 'Conflict Resolution', difficulty: 'mid', question_text: 'Tell me about a time you had a disagreement with a team member.' },
      { category: 'General', skill: 'Motivation', difficulty: 'entry', question_text: 'What interests you most about this role and our company?' }
    ];

    for (const d of defaults) {
      await this.addQuestion(orgId, d);
    }
  }
}
