import { getAIClient, AI_MODEL } from '../config/ai';

export interface ScreeningResult {
  score: number;
  feedback: string;
}

export async function screenApplication(
  jobData: { title: string; description: string; requirements: any },
  candidateData: { resume: string; coverLetter: string; metaData: any }
): Promise<ScreeningResult> {
  const client = getAIClient();
  if (!client) throw new Error('AI client not configured');

  const prompt = `Evaluate a candidate's application against a job description.
  
  JOB TITLE: ${jobData.title}
  JOB DESCRIPTION: ${jobData.description}
  JOB REQUIREMENTS: ${JSON.stringify(jobData.requirements)}
  
  CANDIDATE RESUME:
  ${candidateData.resume}
  
  CANDIDATE COVER LETTER:
  ${candidateData.coverLetter}
  
  CANDIDATE ADDITIONAL INFO:
  ${JSON.stringify(candidateData.metaData)}
  
  Provide a match score (0-100) and brief, actionable feedback (2-3 sentences) for the recruiter.
  Focus on technical alignment, experience level, and critical skills.
  
  Respond ONLY with valid JSON in this format:
  {
    "score": number,
    "feedback": "string"
  }`;

  try {
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: 'You are an objective AI recruitment screener.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI screening response');
  } catch (err) {
    console.error('Screening error:', err);
    return { score: 0, feedback: 'Screening failed due to technical error.' };
  }
}
