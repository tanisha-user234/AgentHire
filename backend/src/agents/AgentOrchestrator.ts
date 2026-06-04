import { HiringManagerAgent } from './HiringManagerAgent';
import { SMEAgent } from './SMEAgent';
import { BehavioralAnalystAgent } from './BehavioralAnalystAgent';
import { getDb } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { GraphRunner, InterviewGraph, GraphNode } from './GraphRunner';
import { GraphService } from '../services/graphService';

export type AgentRole = 'hiring_manager' | 'sme' | 'behavioral_analyst';
export type InterviewPhase = 'intro' | 'technical' | 'behavioral' | 'complete';

export interface InterviewState {
  assessmentId: string;
  currentAgent: AgentRole;
  phase: InterviewPhase;
  progress: number;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  context: Record<string, any>;
  organizationId?: string;
}

export class AgentOrchestrator {
  private agents: {
    hiring_manager: HiringManagerAgent;
    sme: SMEAgent;
    behavioral_analyst: BehavioralAnalystAgent;
  };
  private state: InterviewState;
  private sessionIds: Record<string, string> = {};
  private graph?: InterviewGraph;
  private graphRunner?: GraphRunner;

  constructor(assessmentId: string, context: Record<string, any>) {
    this.agents = {
      hiring_manager: new HiringManagerAgent(),
      sme: new SMEAgent(),
      behavioral_analyst: new BehavioralAnalystAgent(),
    };

    this.state = {
      assessmentId,
      currentAgent: 'hiring_manager',
      phase: 'intro',
      progress: 0,
      status: 'waiting',
      context,
    };
  }

  async loadExistingState(): Promise<boolean> {
    const db = getDb();
    const assessment = await db.prepare(`
      SELECT a.status, a.progress, a.current_agent, a.current_phase, jp.organization_id 
      FROM assessments a 
      JOIN job_positions jp ON a.job_position_id = jp.id 
      WHERE a.id = ?
    `).get(this.state.assessmentId) as any;
    
    if (!assessment || (assessment.status === 'scheduled' && assessment.progress === 0)) return false;

    this.state.status = assessment.status;
    this.state.progress = assessment.progress || 0;
    this.state.currentAgent = (assessment.current_agent as AgentRole) || 'hiring_manager';
    this.state.phase = (assessment.current_phase as InterviewPhase) || 'intro';
    this.state.organizationId = assessment.organization_id;
    this.state.context.organization_id = assessment.organization_id;

    // Load session IDs and histories
    const sessions = await db.prepare('SELECT id, agent_role, conversation_history FROM interview_sessions WHERE assessment_id = ?').all(this.state.assessmentId) as any[];
    
    for (const s of sessions) {
      this.sessionIds[s.agent_role] = s.id;
      const agentRole = s.agent_role as AgentRole;
      if (this.agents[agentRole]) {
         const history = typeof s.conversation_history === 'string' ? JSON.parse(s.conversation_history || '[]') : (s.conversation_history || []);
         this.agents[agentRole].setHistory(history);
      }
    }

    // Load graph state
    const graph = await GraphService.getActiveGraphForJob(assessment.job_position_id);
    if (graph) {
      this.graph = graph;
      const graphRun = await GraphService.getGraphRun(this.state.assessmentId);
      this.graphRunner = new GraphRunner(graph, graphRun ? {
        currentNodeId: graphRun.current_node_id,
        traversalLog: graphRun.traversal_log
      } : undefined);
    }

    return true;
  }

  async startInterview(): Promise<{ content: string; agent: AgentRole; phase: InterviewPhase }> {
    this.state.status = 'active';
    this.state.progress = 5;

    const db = getDb();
    const now = new Date().toISOString();

    // Ensure defaults exist for the organization
    if (this.state.organizationId) {
      const { PromptService } = await import('../services/promptService');
      const { QuestionBankService } = await import('../services/questionBankService');
      await PromptService.seedDefaultPrompts(this.state.organizationId);
      await QuestionBankService.seedDefaultQuestions(this.state.organizationId);
    }

    // Create session records for each agent
    for (const role of ['hiring_manager', 'sme', 'behavioral_analyst'] as AgentRole[]) {
      const sessionId = uuidv4();
      this.sessionIds[role] = sessionId;
      await db.prepare(`INSERT INTO interview_sessions (id, assessment_id, agent_role, started_at) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`)
        .run(sessionId, this.state.assessmentId, role, now);
    }

    await db.prepare(`UPDATE assessments SET status = 'in_progress', started_at = ?, progress = ?, current_agent = ?, current_phase = ? WHERE id = ?`)
      .run(now, this.state.progress, this.state.currentAgent, this.state.phase, this.state.assessmentId);

    // Initialize graph if available
    const assessment = await db.prepare('SELECT job_position_id FROM assessments WHERE id = ?').get(this.state.assessmentId) as any;
    const graph = await GraphService.getActiveGraphForJob(assessment.job_position_id);
    if (graph) {
      this.graph = graph;
      this.graphRunner = new GraphRunner(graph);
      await GraphService.saveGraphRun(this.state.assessmentId, graph.id, this.graphRunner.getState());
      
      const startNode = this.graphRunner.getCurrentNode();
      if (startNode) {
        this.state.currentAgent = startNode.agentRole;
        this.state.phase = startNode.phase;
      }
    }

    const response = await this.agents.hiring_manager.respond(
      'Please introduce yourself and begin the interview.',
      this.state.context
    );

    await this.saveMessage('hiring_manager', 'assistant', response.content);

    return {
      content: response.content,
      agent: 'hiring_manager',
      phase: 'intro',
    };
  }

  async processMessage(candidateMessage: string): Promise<{
    content: string;
    agent: AgentRole;
    phase: InterviewPhase;
    progress: number;
    isComplete: boolean;
    agentSwitched: boolean;
  }> {
    await this.saveMessage(this.state.currentAgent, 'user', candidateMessage);

    // Module 1.2: Save candidate answer to long-term memory
    const { VectorService } = await import('../services/vectorService');
    await VectorService.saveMemory(this.state.currentAgent, this.state.assessmentId, 'answer', candidateMessage, { phase: this.state.phase });

    const currentAgent = this.agents[this.state.currentAgent];
    const response = await currentAgent.respond(candidateMessage, this.state.context);
    await this.saveMessage(this.state.currentAgent, 'assistant', response.content);

    let agentSwitched = false;
    let isComplete = false;

    // Phase 2A: Use GraphRunner for transitions
    if (this.graphRunner) {
      const nextNode = this.graphRunner.getNextNode({
        lastResponse: response.content,
        // TODO: add scores and confidence from agent response when available
      });

      if (nextNode && nextNode.id !== this.graphRunner.getState().currentNodeId) {
        agentSwitched = true;
        this.state.currentAgent = nextNode.agentRole;
        this.state.phase = nextNode.phase;
        
        if (this.state.phase === 'complete') {
          this.state.progress = 100;
          this.state.status = 'completed';
          isComplete = true;
          await this.completeAssessment();
        } else {
          // Add deliberation between agents if switching
          const prevNodeId = this.graphRunner.getState().traversalLog.slice(-2)[0];
          if (this.graph) {
            const prevNode = this.graph.nodes.find(n => n.id === prevNodeId);
            if (prevNode) {
              await this.addDeliberation(prevNode.agentRole, nextNode.agentRole, `Transitioning from ${prevNode.title} to ${nextNode.title}.`);
            }
          }
        }
        
        await GraphService.saveGraphRun(this.state.assessmentId, this.graph!.id, this.graphRunner.getState());
      }
    } else {
      // Fallback to legacy transition logic if no graph
      const shouldSwitch = response.isComplete ||
        response.content.includes('hand you over to our Technical Expert') ||
        response.content.includes('Behavioral Analyst will now take over') ||
        response.content.includes('concludes our assessment');

      if (shouldSwitch) {
        agentSwitched = true;
        if (this.state.currentAgent === 'hiring_manager') {
          this.state.currentAgent = 'sme';
          this.state.phase = 'technical';
          this.state.progress = 40;
          await this.addDeliberation('hiring_manager', 'sme', 'Candidate showed strong communication skills and clear career goals. Technical assessment recommended.');
        } else if (this.state.currentAgent === 'sme') {
          this.state.currentAgent = 'behavioral_analyst';
          this.state.phase = 'behavioral';
          this.state.progress = 70;
          await this.addDeliberation('sme', 'behavioral_analyst', 'Technical knowledge appears solid. Please assess collaboration style and emotional intelligence.');
        } else if (this.state.currentAgent === 'behavioral_analyst') {
          this.state.phase = 'complete';
          this.state.progress = 100;
          this.state.status = 'completed';
          isComplete = true;
          await this.completeAssessment();
        }
      }
    }

    if (!isComplete && !agentSwitched) {
      // Update progress within phase
      if (this.state.phase === 'intro') this.state.progress = Math.min(35, this.state.progress + 8);
      else if (this.state.phase === 'technical') this.state.progress = Math.min(65, this.state.progress + 8);
      else if (this.state.phase === 'behavioral') this.state.progress = Math.min(95, this.state.progress + 8);
    }

    // Persist updated state
    await this.saveState();

    return {
      content: response.content,
      agent: this.state.currentAgent,
      phase: this.state.phase,
      progress: this.state.progress,
      isComplete,
      agentSwitched,
    };
  }

  private async completeAssessment(): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    // Evaluate all agents
    const hmScores = await this.agents.hiring_manager.evaluate(this.agents.hiring_manager.getHistory());
    const smeScores = await this.agents.sme.evaluate(this.agents.sme.getHistory());
    const baScores = await this.agents.behavioral_analyst.evaluate(this.agents.behavioral_analyst.getHistory());

    // Save evaluations
    const saveEval = async (role: string, scores: Record<string, number>, observations: string, strengths: string[], weaknesses: string[]) => {
      await db.prepare(`INSERT INTO evaluations (id, assessment_id, agent_role, scores, observations, strengths, weaknesses) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(uuidv4(), this.state.assessmentId, role, JSON.stringify(scores), observations, JSON.stringify(strengths), JSON.stringify(weaknesses));
    };

    await saveEval('hiring_manager', hmScores,
      'Candidate demonstrated clear career motivation and good cultural alignment.',
      ['Strong communication', 'Clear career vision', 'Professional demeanor'],
      ['Could provide more specific examples']
    );

    await saveEval('sme', smeScores,
      'Technical knowledge is adequate for the role with room for growth.',
      ['Solid foundational knowledge', 'Good problem-solving approach'],
      ['Could improve on system design depth', 'Testing coverage awareness']
    );

    await saveEval('behavioral_analyst', baScores,
      'Candidate shows good emotional intelligence and collaborative instincts.',
      ['Handles conflict constructively', 'Self-aware and reflective'],
      ['Could demonstrate more leadership initiative']
    );

    // Calculate overall score (weighted)
    const allScores = [...Object.values(hmScores), ...Object.values(smeScores), ...Object.values(baScores)];
    const overallScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;

    let recommendation = 'maybe';
    if (overallScore >= 85) recommendation = 'strong_hire';
    else if (overallScore >= 75) recommendation = 'hire';
    else if (overallScore >= 60) recommendation = 'maybe';
    else recommendation = 'no_hire';

    await db.prepare(`UPDATE assessments SET status = 'completed', completed_at = ?, overall_score = ?, recommendation = ? WHERE id = ?`)
      .run(now, Math.round(overallScore), recommendation, this.state.assessmentId);

    // Update session end times
    for (const [role, sessionId] of Object.entries(this.sessionIds)) {
      await db.prepare(`UPDATE interview_sessions SET ended_at = ? WHERE id = ?`).run(now, sessionId);
    }

    await this.addDeliberation('behavioral_analyst', 'hiring_manager',
      `Assessment complete. Overall score: ${Math.round(overallScore)}. Recommendation: ${recommendation.replace('_', ' ')}.`
    );
  }

  private async saveMessage(agentRole: AgentRole, msgRole: 'user' | 'assistant', content: string): Promise<void> {
    const db = getDb();
    const sessionId = this.sessionIds[agentRole];
    if (!sessionId) return;

    const session = await db.prepare('SELECT conversation_history FROM interview_sessions WHERE id = ?').get(sessionId) as any;
    let history = session?.conversation_history;
    if (typeof history === 'string') {
      try {
        history = JSON.parse(history);
      } catch (e) {
        history = [];
      }
    } else if (!Array.isArray(history)) {
      history = [];
    }
    history.push({ role: msgRole, content, timestamp: new Date().toISOString() });
    await db.prepare('UPDATE interview_sessions SET conversation_history = ? WHERE id = ?')
      .run(JSON.stringify(history), sessionId);
  }

  private async addDeliberation(from: AgentRole, to: string, message: string): Promise<void> {
    const db = getDb();
    await db.prepare(`INSERT INTO agent_deliberations (id, assessment_id, from_agent, to_agent, message, message_type) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(uuidv4(), this.state.assessmentId, from, to, message, 'observation');
  }

  private async saveState(): Promise<void> {
    const db = getDb();
    await db.prepare(`UPDATE assessments SET progress = ?, current_agent = ?, current_phase = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(this.state.progress, this.state.currentAgent, this.state.phase, this.state.assessmentId);
  }

  getState(): InterviewState {
    return this.state;
  }
}
