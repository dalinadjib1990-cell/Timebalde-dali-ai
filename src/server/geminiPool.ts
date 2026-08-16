import { GoogleGenAI } from '@google/genai';

/**
 * Intelligent Multi-Key Auto-Rotation Pool for Google Gemini API
 * Supports multiple API keys (GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GEMINI_API_KEYS, GEMINI_API_KEY)
 * Seamlessly rotates on Rate Limits (429), Quota Exceeded, 503 Overloaded, or Transient Failures.
 */

// Cache of initialized GoogleGenAI instances by API key
const clientCache = new Map<string, GoogleGenAI>();
let currentKeyIndex = 0;

export function getAllGeminiApiKeys(): string[] {
  const keys: string[] = [];

  // 1. Explicit numbered keys (GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.)
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 5) {
      keys.push(key.trim());
    }
  }

  // 2. Comma or newline separated list (GEMINI_API_KEYS="key1,key2,key3")
  const multiKeys = process.env.GEMINI_API_KEYS;
  if (multiKeys) {
    const split = multiKeys.split(/[,;\n]+/).map((k) => k.trim()).filter((k) => k.length > 5);
    keys.push(...split);
  }

  // 3. Standard default key (GEMINI_API_KEY - can also be comma-separated)
  const defaultKey = process.env.GEMINI_API_KEY;
  if (defaultKey) {
    const split = defaultKey.split(/[,;\n]+/).map((k) => k.trim()).filter((k) => k.length > 5);
    keys.push(...split);
  }

  // 4. Client-side fallback if set
  const viteKey = process.env.VITE_GEMINI_API_KEY;
  if (viteKey && viteKey.trim().length > 5) {
    keys.push(viteKey.trim());
  }

  // Deduplicate keys preserving insertion order
  const uniqueKeys = Array.from(new Set(keys));
  return uniqueKeys;
}

export function getClientForKey(apiKey: string): GoogleGenAI {
  if (!clientCache.has(apiKey)) {
    clientCache.set(
      apiKey,
      new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'dali-timetable-ai-rotation',
          },
        },
      })
    );
  }
  return clientCache.get(apiKey)!;
}

export interface PoolExecutionOptions {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  candidateModels?: string[];
}

export interface PoolExecutionResult {
  text: string | null;
  usedKeyIndex: number;
  totalKeys: number;
  modelUsed?: string;
  error?: string;
}

/**
 * Execute Gemini API generation with automatic multi-key rotation and multi-model fallback
 */
export async function generateContentWithRotatingPool(
  options: PoolExecutionOptions
): Promise<PoolExecutionResult> {
  const keys = getAllGeminiApiKeys();
  const totalKeys = keys.length;

  if (totalKeys === 0) {
    console.warn('[Gemini Auto-Rotation] No API keys detected in environment variables.');
    return {
      text: null,
      usedKeyIndex: -1,
      totalKeys: 0,
      error: 'No Gemini API keys configured',
    };
  }

  const candidateModels = options.candidateModels || [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-3.7-flash',
  ];

  // Try each available key in round-robin order, rotating to next key if any error occurs
  let attempts = 0;
  const maxKeyAttempts = totalKeys;

  while (attempts < maxKeyAttempts) {
    const activeIndex = (currentKeyIndex + attempts) % totalKeys;
    const activeKey = keys[activeIndex];
    const maskedKey = `${activeKey.slice(0, 6)}...${activeKey.slice(-4)}`;
    const client = getClientForKey(activeKey);

    for (const model of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: options.contents,
          config: {
            ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
            ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
          },
        });

        if (response && response.text) {
          // Success! Advance pointer for future round-robin load distribution
          currentKeyIndex = (activeIndex + 1) % totalKeys;
          return {
            text: response.text,
            usedKeyIndex: activeIndex,
            totalKeys,
            modelUsed: model,
          };
        }
      } catch (err: any) {
        const status = err?.status || err?.code || 'UNKNOWN';
        const msg = err?.message || String(err);
        console.warn(
          `[Gemini Auto-Rotation] Key #${activeIndex + 1}/${totalKeys} (${maskedKey}) on model "${model}" returned ${status} (${msg}). Trying next option...`
        );
      }
    }

    // Advance to next key if all models failed on current key
    attempts++;
  }

  return {
    text: null,
    usedKeyIndex: currentKeyIndex,
    totalKeys,
    error: 'All Gemini API keys in pool were exhausted or unavailable',
  };
}

export function getPoolStatus() {
  const keys = getAllGeminiApiKeys();
  return {
    totalKeys: keys.length,
    activeKeyIndex: currentKeyIndex % (keys.length || 1),
    configured: keys.length > 0,
    keysMasked: keys.map((k, idx) => `Key #${idx + 1}: ${k.slice(0, 6)}...${k.slice(-4)}`),
  };
}
