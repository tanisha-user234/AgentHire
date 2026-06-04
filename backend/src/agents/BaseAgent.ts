import { getAIClient, AI_MODEL, isMockMode } from '../config/ai';
import { PromptService } from '../services/promptService';
import { VectorService } from '../services/vectorService';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  content: string;
  scores?: Record<string, number>;
  observations?: string;
  isComplete?: boolean;
}

export abstract class BaseAgent {
  protected role: string;
  protected systemPrompt: string;
  protected conversationHistory: Message[] = [];

  constructor(role: string, systemPrompt: string) {
    this.role = role;
    this.systemPrompt = systemPrompt;
  }

  protected async getEffectiveSystemPrompt(orgId?: string): Promise<string> {
    if (orgId) {
      const activePrompt = await PromptService.getActivePrompt(orgId, this.role);
      if (activePrompt) return activePrompt;
    }
    return this.systemPrompt;
  }

  async respond(userMessage: string, context?: Record<string, any>): Promise<AgentResponse> {
    this.conversationHistory.push({ role: 'user', content: userMessage });

    if (isMockMode()) {
      return this.getMockResponse(userMessage, context);
    }

    const client = getAIClient();
    if (!client) return this.getMockResponse(userMessage, context);

    try {
      const orgId = context?.organization_id;
      const baseSystemPrompt = await this.getEffectiveSystemPrompt(orgId);
      
      // Module 1.2: Retrieve similar past memories for calibration
      const similarMemories = await VectorService.findSimilarMemories(this.role, userMessage, 3);
      let memoryContext = '';
      if (similarMemories.length > 0) {
        memoryContext = "\n\nContext from similar past candidates for calibration:\n" + 
          similarMemories.map((m, i) => `${i+1}. ${m.content}`).join('\n');
      }

      const finalSystemPrompt = this.buildSystemPrompt(context, baseSystemPrompt) + memoryContext;

      const messages: Message[] = [
        { role: 'system', content: finalSystemPrompt },
        ...this.conversationHistory,
      ];

      const completion = await client.chat.completions.create({
        model: AI_MODEL,
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 1024,
      });

      const content = completion.choices[0]?.message?.content || 'I apologize, could you please repeat that?';
      this.conversationHistory.push({ role: 'assistant', content });
      return { content };
    } catch (err) {
      console.error(`${this.role} agent error:`, err);
      return this.getMockResponse(userMessage, context);
    }
  }

  async evaluate(fullConversation: Message[]): Promise<Record<string, number>> {
    if (isMockMode()) return this.getMockScores();

    const client = getAIClient();
    if (!client) return this.getMockScores();

    try {
      const prompt = `Based on this interview conversation, provide scores (0-100) for the relevant dimensions in JSON format:
${JSON.stringify(fullConversation, null, 2)}
Respond ONLY with valid JSON containing numeric scores.`;

      const completion = await client.chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
      });

      const content = completion.choices[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {}

    return this.getMockScores();
  }

  protected buildSystemPrompt(context: Record<string, any> | undefined, basePrompt?: string): string {
    let prompt = basePrompt || this.systemPrompt;
    if (!context) return prompt;
    
    Object.entries(context).forEach(([key, value]) => {
      const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), displayValue);
    });
    return prompt;
  }

  abstract getMockResponse(userMessage: string, context?: Record<string, any>): AgentResponse;
  abstract getMockScores(): Record<string, number>;

  getHistory(): Message[] {
    return this.conversationHistory;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  setHistory(history: Message[]): void {
    this.conversationHistory = history;
  }
}
