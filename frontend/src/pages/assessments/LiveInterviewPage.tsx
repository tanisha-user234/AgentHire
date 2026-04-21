import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../services/websocket';
import { assessments as assessmentApi } from '../../services/api';
import { Send, Brain, Code2, User, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';

type AgentRole = 'hiring_manager' | 'sme' | 'behavioral_analyst';
type Phase = 'intro' | 'technical' | 'behavioral' | 'complete';

interface Message {
  id: string;
  role: 'candidate' | AgentRole;
  content: string;
  timestamp: Date;
}

const agentConfig: Record<AgentRole, { name: string; title: string; color: string; glow: string; avatar: string }> = {
  hiring_manager: { name: 'Sarah', title: 'Hiring Manager', color: 'text-brand-400', glow: 'agent-glow-hm', avatar: '👩‍💼' },
  sme: { name: 'Dr. Marcus', title: 'Technical Expert', color: 'text-cyan-400', glow: 'agent-glow-sme', avatar: '👨‍💻' },
  behavioral_analyst: { name: 'Dr. Priya', title: 'Behavioral Analyst', color: 'text-amber-400', glow: 'agent-glow-ba', avatar: '🧠' },
};

const phaseConfig: Record<Phase, { label: string; color: string }> = {
  intro: { label: 'Introduction', color: 'bg-brand-500' },
  technical: { label: 'Technical Assessment', color: 'bg-cyan-500' },
  behavioral: { label: 'Behavioral Analysis', color: 'bg-amber-500' },
  complete: { label: 'Completed', color: 'bg-emerald-500' },
};

export default function LiveInterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentAgent, setCurrentAgent] = useState<AgentRole>('hiring_manager');
  const [phase, setPhase] = useState<Phase>('intro');
  const [progress, setProgress] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingAgent, setTypingAgent] = useState<AgentRole>('hiring_manager');
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [agentSwitching, setAgentSwitching] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'active' | 'done'>('loading');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const socket = getSocket();

  useEffect(() => {
    if (!id) return;
    assessmentApi.get(id).then(r => {
      const data = r.data;
      setAssessment(data);
      
      // Load previous messages from sessions
      const previousMessages: Message[] = [];
      if (data.sessions && Array.isArray(data.sessions)) {
        data.sessions.forEach((s: any) => {
          if (s.conversation_history && Array.isArray(s.conversation_history)) {
            s.conversation_history.forEach((msg: any) => {
              previousMessages.push({
                id: Math.random().toString(36).substr(2, 9),
                role: msg.role === 'user' ? 'candidate' : (s.agent_role as any),
                content: msg.content,
                timestamp: new Date(msg.timestamp)
              });
            });
          }
        });
        // Sort by timestamp
        previousMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setMessages(previousMessages);
        if (previousMessages.length > 0) setStarted(true);
      }

      if (data.status === 'completed') {
        setCompleted(true);
        setStatus('done');
      } else {
        setStatus('ready');
        if (data.progress !== undefined) setProgress(data.progress);
        if (data.current_phase) setPhase(data.current_phase as Phase);
        if (data.current_agent) setCurrentAgent(data.current_agent as AgentRole);
      }
    }).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    socket.emit('interview:join', { assessmentId: id });

    socket.on('interview:joined', (data: any) => {
      setStatus('ready');
      if (data.progress !== undefined) setProgress(data.progress);
      if (data.phase) setPhase(data.phase as Phase);
      if (data.currentAgent) setCurrentAgent(data.currentAgent as AgentRole);
    });
    socket.on('interview:already_complete', () => { setCompleted(true); setStatus('done'); });

    socket.on('agent:message', (data: { content: string; agent: AgentRole; phase: Phase; progress: number }) => {
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: data.agent, content: data.content, timestamp: new Date() }]);
      setCurrentAgent(data.agent);
      setPhase(data.phase);
      setProgress(data.progress);
      setAgentSwitching(false);
    });

    socket.on('agent:typing', ({ agent, typing }: { agent: AgentRole; typing: boolean }) => {
      setIsTyping(typing);
      setTypingAgent(agent);
    });

    socket.on('agent:switch', ({ to, phase: newPhase }: { from: AgentRole; to: AgentRole; phase: Phase }) => {
      setAgentSwitching(true);
      setCurrentAgent(to);
      setPhase(newPhase);
    });

    socket.on('interview:progress', ({ progress: p }: { progress: number; phase: Phase }) => setProgress(p));
    socket.on('interview:complete', () => { setCompleted(true); setStatus('done'); setProgress(100); });
    socket.on('error', (err: { message: string }) => console.error('Socket error:', err.message));

    return () => {
      socket.off('interview:joined');
      socket.off('interview:already_complete');
      socket.off('agent:message');
      socket.off('agent:typing');
      socket.off('agent:switch');
      socket.off('interview:progress');
      socket.off('interview:complete');
      socket.off('error');
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleStart = useCallback(() => {
    if (!id) return;
    setStarted(true);
    setStatus('active');
    socket.emit('interview:start', { assessmentId: id });
  }, [id, socket]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !id || isTyping) return;
    const msg = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'candidate', content: msg, timestamp: new Date() }]);
    socket.emit('interview:message', { assessmentId: id, message: msg });
    setInput('');
    inputRef.current?.focus();
  }, [input, id, isTyping, socket]);

  const agent = agentConfig[currentAgent];

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="glass-card p-4 mb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-surface-700 flex items-center justify-center text-xl ${!isTyping ? agent.glow : ''} transition-all`}>
            {agent.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${agent.color}`}>{agent.name}</span>
              <span className="text-slate-500 text-sm">• {agent.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${phaseConfig[phase].color}`} />
              {phaseConfig[phase].label}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {assessment && <span className="text-slate-400 text-sm hidden md:block">{assessment.job_title}</span>}
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">{Math.round(progress)}% Complete</div>
            <div className="w-32 h-1.5 bg-surface-700 rounded-full overflow-hidden">
              <motion.div className={`h-full ${phaseConfig[phase].color} rounded-full`} initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {!started && !completed && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready for your interview?</h2>
            <p className="text-slate-400 mb-2">Position: <span className="text-white font-semibold">{assessment?.job_title}</span></p>
            <p className="text-slate-400 mb-6 text-sm">You'll be interviewed by 3 AI agents:<br />
              <span className="text-brand-400">👩‍💼 Hiring Manager</span> → <span className="text-cyan-400">👨‍💻 Technical Expert</span> → <span className="text-amber-400">🧠 Behavioral Analyst</span>
            </p>
            <button onClick={handleStart} className="btn-primary text-lg px-8 py-3">
              Begin Interview
            </button>
          </motion.div>
        )}

        {completed && messages.length === 0 && (
          <div className="glass-card p-8 text-center">
            <CheckCircle2 className="mx-auto text-emerald-400 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-white mb-2">Assessment Complete!</h2>
            <p className="text-slate-400 mb-6">Your results have been processed.</p>
            <button onClick={() => navigate(`/assessments/${id}/report`)} className="btn-primary">View Report</button>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => {
            const isCandidate = msg.role === 'candidate';
            const agentInfo = isCandidate ? null : agentConfig[msg.role as AgentRole];
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-3 ${isCandidate ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold
                  ${isCandidate ? 'bg-brand-600/30 text-brand-400' : 'bg-surface-700 text-lg'}`}>
                  {isCandidate ? <User size={16} /> : agentInfo?.avatar}
                </div>
                <div className={`max-w-[75%] ${isCandidate ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isCandidate && agentInfo && (
                    <span className={`text-xs font-medium mb-1 ${agentInfo.color}`}>{agentInfo.name} • {agentInfo.title}</span>
                  )}
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                    ${isCandidate
                      ? 'bg-brand-600/30 text-white rounded-tr-sm border border-brand-500/20'
                      : 'bg-surface-800 text-slate-200 rounded-tl-sm border border-white/5'}`}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-slate-600 mt-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-700 flex items-center justify-center text-lg flex-shrink-0">
              {agentConfig[typingAgent]?.avatar}
            </div>
            <div className="bg-surface-800 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-4">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Agent switching */}
        <AnimatePresence>
          {agentSwitching && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="glass-card p-4 text-center text-sm text-slate-400">
              <Loader2 className="inline mr-2 animate-spin" size={14} />
              Switching to {agentConfig[currentAgent]?.name}...
            </motion.div>
          )}
        </AnimatePresence>

        {completed && messages.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 text-center border-emerald-500/20">
            <CheckCircle2 className="mx-auto text-emerald-400 mb-3" size={36} />
            <p className="text-white font-semibold mb-3">Interview Complete! Your assessment is being processed.</p>
            <button onClick={() => navigate(`/assessments/${id}/report`)} className="btn-primary">View Full Report</button>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {started && !completed && (
        <div className="flex-shrink-0 glass-card p-3">
          <div className="flex gap-3 items-end">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type your response... (Enter to send, Shift+Enter for new line)"
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 resize-none focus:outline-none text-sm leading-relaxed py-2 px-1 min-h-[48px] max-h-32"
              rows={2} disabled={isTyping} />
            <button onClick={handleSend} disabled={!input.trim() || isTyping}
              className="p-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white flex-shrink-0">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
