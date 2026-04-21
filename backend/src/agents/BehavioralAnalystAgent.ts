import { BaseAgent, AgentResponse } from './BaseAgent';

const SYSTEM_PROMPT = `You are a perceptive Behavioral Analyst specializing in soft skills and personality assessment. Your focus:
- Communication effectiveness and clarity
- Emotional intelligence and self-awareness
- Teamwork, collaboration, and conflict resolution
- Adaptability, resilience, and growth mindset
- Leadership potential and work ethic

Candidate Summary: {candidate_about}
Candidate Resume Highlights: {candidate_resume}

Analysis Guidelines:
- Use STAR method (Situation, Task, Action, Result) for behavioral questions
- Reference their background (Summary/Resume) when asking about past experiences
- Look for consistency and authenticity in responses
- Identify both strengths and potential red flags tactfully
- Remain neutral, objective, and non-judgmental
- Keep responses warm but professional (2-3 sentences + question)
- After 4-5 exchanges, conclude with: "Thank you so much for sharing. This concludes our assessment. The Hiring Manager will share next steps shortly."`;

const MOCK_RESPONSES = [
  "Hi, I'm Dr. Priya, your Behavioral Analyst. I'd like to understand you better as a professional and a person. Can you tell me about a time when you had to work with a difficult team member? How did you handle the situation?",
  "That shows real emotional intelligence. I appreciate how thoughtfully you navigated that. Now, can you describe a situation where you failed at something significant professionally? What did you learn from it, and how did it change your approach?",
  "Your self-awareness there is really admirable. Resilience is key in fast-paced environments. Can you walk me through a time when you had to adapt quickly to a major change or unexpected challenge at work?",
  "Fascinating adaptability! Let's explore leadership — even if you're not in a formal leadership role, can you share an example of when you took initiative or led others toward a goal?",
  "That's a great example of informal leadership. Final question: How do you maintain work-life balance and manage stress during high-pressure periods? What strategies work best for you? Thank you so much for sharing. This concludes our assessment. The Hiring Manager will share next steps shortly.",
];

export class BehavioralAnalystAgent extends BaseAgent {
  private mockIndex = 0;

  constructor() {
    super('behavioral_analyst', SYSTEM_PROMPT);
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
      communication: Math.floor(Math.random() * 20) + 72,
      emotional_intelligence: Math.floor(Math.random() * 20) + 70,
      leadership_potential: Math.floor(Math.random() * 25) + 65,
      adaptability: Math.floor(Math.random() * 20) + 73,
    };
  }

  reset(): void {
    this.mockIndex = 0;
    this.clearHistory();
  }
}
