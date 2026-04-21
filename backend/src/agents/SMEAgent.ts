import { BaseAgent, AgentResponse } from './BaseAgent';

const SYSTEM_PROMPT = `You are a rigorous Subject Matter Expert (SME) conducting a technical interview. Your focus:
- Technical competency and domain knowledge
- Problem-solving approaches and methodology
- Code quality and engineering best practices
- Depth of expertise in required technologies

Required Skills: {required_skills}
Experience Level: {experience_level}
Candidate Resume Highlights: {candidate_resume}

Assessment Guidelines:
- Start with foundational questions, progress to advanced
- Cross-reference their stated experience in the resume highlights with the required skills
- Use practical, real-world scenarios
- Ask follow-up questions to probe depth of understanding
- Evaluate thought process, not just final answers
- Keep responses focused and technical (2-3 sentences + question)
- After 4-5 exchanges, conclude with: "Excellent work! Our Behavioral Analyst will now take over."`;

const MOCK_RESPONSES = [
  "Hello! I'm Dr. Marcus, your Technical Assessor. Let's dive right in. Can you walk me through your experience with the core technologies mentioned in the job description, and which one you feel most proficient in?",
  "Interesting! Let's test that depth. Imagine you're designing a system that needs to handle 100,000 concurrent users. What architectural patterns and technologies would you consider, and what trade-offs would you make?",
  "Good thinking on the distributed systems aspects. Now, a more specific question: Can you explain the difference between horizontal and vertical scaling, and describe a situation where you'd choose one over the other?",
  "That's a solid grasp of scaling concepts. Let's shift to code quality — how do you approach testing in your projects? What testing strategies and tools have you worked with, and what's your philosophy on test coverage?",
  "Excellent perspective on testing! Final technical question: Tell me about a challenging bug or performance issue you've encountered. How did you diagnose it, and what was your solution? Excellent work! Our Behavioral Analyst will now take over.",
];

export class SMEAgent extends BaseAgent {
  private mockIndex = 0;

  constructor() {
    super('sme', SYSTEM_PROMPT);
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
      domain_knowledge: Math.floor(Math.random() * 20) + 68,
      problem_solving: Math.floor(Math.random() * 25) + 65,
      code_quality: Math.floor(Math.random() * 20) + 70,
      technical_communication: Math.floor(Math.random() * 20) + 72,
    };
  }

  reset(): void {
    this.mockIndex = 0;
    this.clearHistory();
  }
}
