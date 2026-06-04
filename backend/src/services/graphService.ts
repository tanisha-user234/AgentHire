import { getDb } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { InterviewGraph } from '../agents/GraphRunner';

export class GraphService {
  static async createGraph(jobId: string, config: Omit<InterviewGraph, 'id'>): Promise<string> {
    const db = getDb();
    const id = uuidv4();
    await db.prepare('INSERT INTO interview_graphs (id, job_position_id, graph_config) VALUES (?, ?, ?)')
      .run(id, jobId, JSON.stringify(config));
    return id;
  }

  static async getActiveGraphForJob(jobId: string): Promise<InterviewGraph | null> {
    const db = getDb();
    const row = await db.prepare('SELECT id, graph_config FROM interview_graphs WHERE job_position_id = ? AND is_active = TRUE ORDER BY version DESC LIMIT 1')
      .get(jobId) as any;
    
    if (!row) return null;
    
    const config = typeof row.graph_config === 'string' ? JSON.parse(row.graph_config) : row.graph_config;
    return { id: row.id, ...config };
  }

  static async saveGraphRun(assessmentId: string, graphId: string, state: any): Promise<void> {
    const db = getDb();
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO interview_graph_runs (id, assessment_id, graph_id, current_node_id, traversal_log)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        current_node_id = EXCLUDED.current_node_id,
        traversal_log = EXCLUDED.traversal_log
    `).run(id, assessmentId, graphId, state.currentNodeId, JSON.stringify(state.traversalLog));
  }

  static async getGraphRun(assessmentId: string): Promise<any | null> {
    const db = getDb();
    const row = await db.prepare('SELECT * FROM interview_graph_runs WHERE assessment_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(assessmentId) as any;
    
    if (!row) return null;
    return {
      ...row,
      traversal_log: typeof row.traversal_log === 'string' ? JSON.parse(row.traversal_log) : row.traversal_log
    };
  }

  static async createDefaultGraph(jobId: string): Promise<string> {
    const defaultGraph: Omit<InterviewGraph, 'id'> = {
      nodes: [
        { id: 'intro', agentRole: 'hiring_manager', phase: 'intro', title: 'Introduction' },
        { id: 'technical', agentRole: 'sme', phase: 'technical', title: 'Technical Assessment' },
        { id: 'behavioral', agentRole: 'behavioral_analyst', phase: 'behavioral', title: 'Behavioral Assessment' },
        { id: 'conclusion', agentRole: 'hiring_manager', phase: 'complete', title: 'Conclusion' }
      ],
      edges: [
        { fromNodeId: 'intro', toNodeId: 'technical', conditionType: 'keyword', conditionValue: 'hand you over to our Technical Expert' },
        { fromNodeId: 'technical', toNodeId: 'behavioral', conditionType: 'keyword', conditionValue: 'Behavioral Analyst will now take over' },
        { fromNodeId: 'behavioral', toNodeId: 'conclusion', conditionType: 'keyword', conditionValue: 'concludes our assessment' },
        // Fallbacks
        { fromNodeId: 'intro', toNodeId: 'technical', conditionType: 'default' },
        { fromNodeId: 'technical', toNodeId: 'behavioral', conditionType: 'default' },
        { fromNodeId: 'behavioral', toNodeId: 'conclusion', conditionType: 'default' }
      ],
      startNodeId: 'intro'
    };

    return this.createGraph(jobId, defaultGraph);
  }
}
