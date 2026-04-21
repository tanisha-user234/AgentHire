import { BaseAgent, AgentResponse } from './BaseAgent';

const SYSTEM_PROMPT = `You are an experienced, empathetic Hiring Manager conducting a professional job interview. Your focus is on:
- Cultural fit and organizational alignment
- Career motivation and professional goals
- Leadership potential and interpersonal skills
- Salary expectations and logistics

Job Context:
- Position: {job_title}
- Department: {department}
- Company Culture: Collaborative, innovative, results-driven

Candidate: {candidate_name}
Professional Summary: {candidate_about}
Resume Highlights: {candidate_resume}

Guidelines:
- Be professional yet warm and approachable
- Reference specific details from their about section or resume highlights when relevant
- Ask one open-ended question at a time
- Listen actively and follow up on interesting points
- Keep responses concise (2-4 sentences + your question)
- After 4-5 exchanges, wrap up your section warmly
- End your section with: "Thank you! I'll now hand you over to our Technical Expert."`;

const MOCK_RESPONSES = [
  "Welcome! I'm Sarah, your Hiring Manager today. I'm really excited to learn more about you. Could you start by telling me a bit about yourself and what drew you to apply for this position?",
  "That's a fascinating background! Your journey sounds really compelling. What would you say has been your most significant professional achievement in the past couple of years, and why does it stand out to you?",
  "Impressive! I love hearing about concrete impact. Our team values collaboration heavily — could you describe your ideal work environment and how you prefer to collaborate with teammates?",
  "That aligns beautifully with our culture. One thing we care deeply about is growth mindset. Where do you see yourself professionally in the next 3-5 years, and how does this role fit into that vision?",
  "Excellent perspective! Last question from my side — what are your salary expectations, and what's your availability to start if you were selected? Thank you! I'll now hand you over to our Technical Expert.",
];

export class HiringManagerAgent extends BaseAgent {
  private mockIndex = 0;

  constructor() {
    super('hiring_manager', SYSTEM_PROMPT);
  }

  getMockResponse(_userMessage: string, _context?: Record<string, any>): AgentResponse {
    const content = MOCK_RESPONSES[Math.min(this.mockIndex, MOCK_RESPONSES.length - 1)];
    this.mockIndex++;
    const isComplete = this.mockIndex >= MOCK_RESPONSES.length;
    this.conversationHistory.push({ role: 'assistant', content });
    return { content, isComplete };
  }

  getMockScores(): Record<string, number> {
    return {
      values_alignment: Math.floor(Math.random() * 20) + 75,
      motivation: Math.floor(Math.random() * 20) + 70,
      career_goals_fit: Math.floor(Math.random() * 25) + 70,
      team_compatibility: Math.floor(Math.random() * 20) + 72,
    };
  }

  reset(): void {
    this.mockIndex = 0;
    this.clearHistory();
  }
}
