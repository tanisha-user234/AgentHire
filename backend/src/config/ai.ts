import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let openaiClient: OpenAI | null = null;

export function getAIClient(): OpenAI | null {
  if (!process.env.OPENROUTER_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://agentic-assessment.com', // Optional
        'X-Title': 'Agentic Assessment System', // Optional
      }
    });
  }
  return openaiClient;
}

export const AI_MODEL = process.env.AI_MODEL || 'openai/gpt-oss-120b:free';
export const isMockMode = () => !process.env.OPENROUTER_API_KEY;
