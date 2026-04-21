import { getAIClient, AI_MODEL } from '../config/ai';

export interface ParsedResume {
  skills: string[];
  experience_years: number;
  summary: string;
  education: string[];
  professional_experience: {
    role: string;
    company: string;
    duration: string;
    description: string;
  }[];
}

export async function parseResume(resumeText: string): Promise<ParsedResume> {
  const client = getAIClient();
  if (!client) {
    throw new Error('AI client not configured');
  }

  const prompt = `Parse the following resume text into a structured JSON format. 
  Extract skills, experience years, a professional summary, education, and professional experience details.
  
  Resume Text:
  ${resumeText}
  
  Respond ONLY with valid JSON in this format:
  {
    "skills": ["skill1", "skill2"],
    "experience_years": number,
    "summary": "string",
    "education": ["degree1", "degree2"],
    "professional_experience": [
      {
        "role": "string",
        "company": "string",
        "duration": "string",
        "description": "string"
      }
    ]
  }`;

  try {
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert HR recruiter and data extraction assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI response');
  } catch (err) {
    console.error('Resume parsing error:', err);
    throw err;
  }
}
