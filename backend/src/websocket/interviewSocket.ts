import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AgentOrchestrator } from '../agents/AgentOrchestrator';
import { getDb } from '../config/database';

// Map: assessmentId -> orchestrator
const activeSessions = new Map<string, AgentOrchestrator>();

export function setupInterviewSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const token = socket.handshake.auth.token;
    let userId: string | null = null;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key') as any;
      userId = decoded.id;
    } catch {
      socket.emit('error', { message: 'Unauthorized' });
      socket.disconnect();
      return;
    }

    console.log(`🔌 Socket connected: ${socket.id} (user: ${userId})`);

    socket.on('interview:join', async ({ assessmentId }: { assessmentId: string }) => {
      const db = getDb();
      const assessment = await db.prepare(`
        SELECT a.*, jp.title as job_title, jp.department, jp.requirements,
               c.id as candidate_db_id, c.about, c.parsed_resume, u.first_name, u.last_name
        FROM assessments a
        JOIN job_positions jp ON a.job_position_id = jp.id
        JOIN candidates c ON a.candidate_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE a.id = ?
      `).get(assessmentId) as any;

      if (!assessment) {
        socket.emit('error', { message: 'Assessment not found' });
        return;
      }

      socket.join(assessmentId);

      // If assessment already completed, send completion state
      if (assessment.status === 'completed') {
        socket.emit('interview:already_complete', { assessmentId });
        return;
      }

      // Create or reuse orchestrator
      if (!activeSessions.has(assessmentId)) {
// Safely check if it's a string before parsing
const requirements = typeof assessment.requirements === 'string' 
  ? JSON.parse(assessment.requirements || '{}') 
  : (assessment.requirements || {});        const context = {
          job_title: assessment.job_title,
          department: assessment.department,
          candidate_name: `${assessment.first_name} ${assessment.last_name}`,
          candidate_about: assessment.about || '',
          candidate_resume: typeof assessment.parsed_resume === 'string' 
            ? JSON.parse(assessment.parsed_resume || '{}') 
            : (assessment.parsed_resume || {}),
          required_skills: requirements.skills?.join(', ') || 'General skills',
          experience_level: assessment.experience_level || 'Mid-level',
        };
        const orchestrator = new AgentOrchestrator(assessmentId, context);
        await orchestrator.loadExistingState();
        activeSessions.set(assessmentId, orchestrator);
      }

      const orchestrator = activeSessions.get(assessmentId);
      const state = orchestrator?.getState();

      socket.emit('interview:joined', {
        assessmentId,
        candidateName: `${assessment.first_name} ${assessment.last_name}`,
        jobTitle: assessment.job_title,
        status: assessment.status,
        progress: state?.progress || 0,
        phase: state?.phase || 'intro',
        currentAgent: state?.currentAgent || 'hiring_manager',
      });
    });

    socket.on('interview:start', async ({ assessmentId }: { assessmentId: string }) => {
      const orchestrator = activeSessions.get(assessmentId);
      if (!orchestrator) {
        socket.emit('error', { message: 'Session not found. Please rejoin.' });
        return;
      }

      try {
        socket.emit('agent:typing', { agent: 'hiring_manager', typing: true });
        const response = await orchestrator.startInterview();
        socket.emit('agent:typing', { agent: 'hiring_manager', typing: false });

        socket.emit('agent:message', {
          content: response.content,
          agent: response.agent,
          phase: response.phase,
          progress: 5,
          timestamp: new Date().toISOString(),
        });

        // Notify monitored (recruiters in this room)
        socket.to(assessmentId).emit('monitor:agent_message', {
          content: response.content,
          agent: response.agent,
          phase: response.phase,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('interview:message', async ({ assessmentId, message }: { assessmentId: string; message: string }) => {
      const orchestrator = activeSessions.get(assessmentId);
      if (!orchestrator) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      const state = orchestrator.getState();
      const currentAgentRole = state.currentAgent;

      // Echo candidate message to monitors
      socket.to(assessmentId).emit('monitor:candidate_response', {
        content: message,
        timestamp: new Date().toISOString(),
      });

      try {
        socket.emit('agent:typing', { agent: currentAgentRole, typing: true });
        const result = await orchestrator.processMessage(message);
        socket.emit('agent:typing', { agent: result.agent, typing: false });

        if (result.agentSwitched && !result.isComplete) {
          socket.emit('agent:switch', {
            from: currentAgentRole,
            to: result.agent,
            phase: result.phase,
          });
          // Small delay for UX
          await new Promise(r => setTimeout(r, 500));
        }

        socket.emit('agent:message', {
          content: result.content,
          agent: result.agent,
          phase: result.phase,
          progress: result.progress,
          timestamp: new Date().toISOString(),
        });

        socket.emit('interview:progress', { progress: result.progress, phase: result.phase });

        socket.to(assessmentId).emit('monitor:agent_message', {
          content: result.content,
          agent: result.agent,
          phase: result.phase,
        });

        if (result.isComplete) {
          socket.emit('interview:complete', { assessmentId });
          socket.to(assessmentId).emit('monitor:assessment_complete', { assessmentId });
          activeSessions.delete(assessmentId);
        }
      } catch (err: any) {
        socket.emit('agent:typing', { agent: currentAgentRole, typing: false });
        socket.emit('error', { message: 'Agent error. Please try again.' });
      }
    });

    socket.on('monitor:join', ({ assessmentId }: { assessmentId: string }) => {
      socket.join(assessmentId);
      socket.emit('monitor:joined', { assessmentId });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}
