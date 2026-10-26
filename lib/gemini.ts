import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = 'gemini-3.8-flash';
export const GEMINI_BUSY_MESSAGE = 'AI asistent je momentálně přetížen, zkuste to prosím za chvíli.';

export class GeminiBusyError extends Error {
  constructor() { super(GEMINI_BUSY_MESSAGE); this.name = 'GeminiBusyError'; }
}

type RetryDelay = (milliseconds: number) => Promise<void>;

/** Four attempts total; only quota throttling is retried. */
export async function withGeminiBackoff<T>(
  operation: () => Promise<T>,
  delay: RetryDelay = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await operation(); }
    catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status?: unknown }).status) : 0;
      if (status !== 429 || attempt === 3) throw new GeminiBusyError();
      await delay(2000 * (2 ** attempt));
    }
  }
  throw new GeminiBusyError();
}

export async function generateGeminiResponse(prompt: string, textBody: string): Promise<string> {
  return withGeminiBackoff(async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini is not configured.');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt + '\n\nVSTUPNÍ E-MAIL:\n' + textBody,
      config: { responseMimeType: 'application/json', temperature: 0 },
    });
    const text = response.text?.trim();
    if (!text) throw new Error('Empty Gemini response.');
    return text;
  });
}
