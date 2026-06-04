import { getDb } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { getAIClient } from '../config/ai';

export class VectorService {
  static async embedText(text: string): Promise<number[]> {
    const client = getAIClient();
    if (!client || process.env.MOCK_AI === 'true') {
      // Return a dummy vector if in mock mode
      return new Array(1536).fill(0).map(() => Math.random());
    }

    try {
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (err) {
      console.error('Embedding error:', err);
      return new Array(1536).fill(0).map(() => Math.random());
    }
  }

  static async saveMemory(agentRole: string, assessmentId: string, contentType: string, content: string, metadata: any = {}): Promise<void> {
    const db = getDb();
    const id = uuidv4();
    const embedding = await this.embedText(content);

    try {
      // Try with pgvector first
      await db.prepare(`
        INSERT INTO agent_memory_embeddings (id, agent_role, source_assessment_id, content_type, content, embedding, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, agentRole, assessmentId, contentType, content, `[${embedding.join(',')}]`, JSON.stringify(metadata));
    } catch (err) {
      // Fallback to JSONB if pgvector column doesn't exist or fails
      await db.prepare(`
        INSERT INTO agent_memory_embeddings (id, agent_role, source_assessment_id, content_type, content, embedding_json, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, agentRole, assessmentId, contentType, content, JSON.stringify(embedding), JSON.stringify(metadata));
    }
  }

  static async findSimilarMemories(agentRole: string, query: string, limit: number = 5): Promise<any[]> {
    const db = getDb();
    const embedding = await this.embedText(query);
    const vectorStr = `[${embedding.join(',')}]`;

    try {
      // Try with pgvector cosine similarity
      return await db.prepare(`
        SELECT content, metadata, (embedding <=> ?::vector) as distance
        FROM agent_memory_embeddings
        WHERE agent_role = ?
        ORDER BY distance ASC
        LIMIT ?
      `).all(vectorStr, agentRole, limit);
    } catch (err) {
      // Simple fallback: just return latest if vector search fails
      return await db.prepare(`
        SELECT content, metadata
        FROM agent_memory_embeddings
        WHERE agent_role = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(agentRole, limit);
    }
  }
}
