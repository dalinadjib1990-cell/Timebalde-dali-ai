import { GoogleGenAI } from '@google/genai';

/**
 * Intelligent Multi-Key Auto-Rotation Pool for Google Gemini API
 * Strictly adheres to Google AI Studio coding guidelines:
 * - User-Agent header set to 'aistudio-build'
 * - Modern Gemini 3-series models ('gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest')
 * - Active cooldown shield on 429 / RESOURCE_EXHAUSTED to prevent quota flooding
 * - Automatic in-memory query caching
 * - Silent and graceful fallback to domain-specific Algerian curriculum logic
 */

// Cache of initialized GoogleGenAI instances by API key
const clientCache = new Map<string, GoogleGenAI>();
let currentKeyIndex = 0;

// Cooldown tracker: maps apiKey -> timestamp (ms) until which key is in cooldown
const keyCooldowns = new Map<string, number>();

// In-memory response cache: maps cacheKey -> { text, model, timestamp }
const responseCache = new Map<
  string,
  { text: string; model: string; timestamp: number }
>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

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
    const split = multiKeys
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);
    keys.push(...split);
  }

  // 3. Standard default key (GEMINI_API_KEY - can also be comma-separated)
  const defaultKey = process.env.GEMINI_API_KEY;
  if (defaultKey) {
    const split = defaultKey
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);
    keys.push(...split);
  }

  // 4. Client-side fallback if set in env
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
            'User-Agent': 'aistudio-build',
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
  fromCache?: boolean;
}

/**
 * Generate a cache key from execution options
 */
function createCacheKey(options: PoolExecutionOptions): string {
  try {
    return JSON.stringify({
      c: options.contents,
      s: options.systemInstruction || '',
      m: options.responseMimeType || '',
    });
  } catch {
    return '';
  }
}

/**
 * Parse retry delay from Gemini 429 error details if present
 */
function extractRetryDelayMs(err: any): number {
  try {
    const rawMsg = err?.message || '';
    // Check for "retry in 44.283891361s" or "retry in 35s"
    const match = rawMsg.match(/retry in ([\d\.]+)s/i);
    if (match && match[1]) {
      const seconds = parseFloat(match[1]);
      if (!isNaN(seconds) && seconds > 0) {
        return Math.ceil(seconds * 1000) + 2000; // add 2s buffer
      }
    }

    // Check error details if present
    if (err?.error?.details && Array.isArray(err.error.details)) {
      const retryInfo = err.error.details.find((d: any) => d['@type']?.includes('RetryInfo'));
      if (retryInfo && retryInfo.retryDelay) {
        const sec = parseInt(retryInfo.retryDelay, 10);
        if (!isNaN(sec) && sec > 0) {
          return (sec + 2) * 1000;
        }
      }
    }
  } catch {
    // fallback
  }
  return 45 * 1000; // default 45s cooldown
}

/**
 * Execute Gemini API generation with automatic multi-key rotation,
 * strict cooldown protection, and graceful fallback.
 */
export async function generateContentWithRotatingPool(
  options: PoolExecutionOptions
): Promise<PoolExecutionResult> {
  const keys = getAllGeminiApiKeys();
  const totalKeys = keys.length;

  if (totalKeys === 0) {
    return {
      text: null,
      usedKeyIndex: -1,
      totalKeys: 0,
      error: 'No Gemini API keys configured',
    };
  }

  // 1. Check response cache
  const cacheKey = createCacheKey(options);
  if (cacheKey && responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        text: cached.text,
        usedKeyIndex: currentKeyIndex,
        totalKeys,
        modelUsed: cached.model,
        fromCache: true,
      };
    } else {
      responseCache.delete(cacheKey);
    }
  }

  // 2. Select approved Gemini models per skill instructions
  // Default to gemini-3.8-flash (official standard for text), then gemini-3.1-flash-lite, then gemini-flash-latest
  const candidateModels = options.candidateModels && options.candidateModels.length > 0
    ? options.candidateModels
    : ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

  const now = Date.now();

  // 3. Try each available key in round-robin order
  let attempts = 0;
  const maxKeyAttempts = totalKeys;

  while (attempts < maxKeyAttempts) {
    const activeIndex = (currentKeyIndex + attempts) % totalKeys;
    const activeKey = keys[activeIndex];

    // Check if this key is currently in cooldown
    const cooldownUntil = keyCooldowns.get(activeKey) || 0;
    if (cooldownUntil > now) {
      // Key is in cooldown, skip to next key
      attempts++;
      continue;
    }

    const client = getClientForKey(activeKey);

    for (const model of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: options.contents,
          config: {
            ...(options.systemInstruction
              ? { systemInstruction: options.systemInstruction }
              : {}),
            ...(options.responseMimeType
              ? { responseMimeType: options.responseMimeType }
              : {}),
          },
        });

        if (response && response.text) {
          // Success! Advance pointer for future round-robin load distribution
          currentKeyIndex = (activeIndex + 1) % totalKeys;

          // Store in cache
          if (cacheKey) {
            responseCache.set(cacheKey, {
              text: response.text,
              model,
              timestamp: Date.now(),
            });
          }

          return {
            text: response.text,
            usedKeyIndex: activeIndex,
            totalKeys,
            modelUsed: model,
          };
        }
      } catch (err: any) {
        const statusCode = err?.status || err?.code || 0;
        const errMsg = err?.message || String(err);
        const isQuotaOrRateLimit =
          statusCode === 429 ||
          statusCode === 'RESOURCE_EXHAUSTED' ||
          errMsg.includes('429') ||
          errMsg.includes('quota') ||
          errMsg.includes('RESOURCE_EXHAUSTED');

        if (isQuotaOrRateLimit) {
          // Activate cooldown for this key
          const delayMs = extractRetryDelayMs(err);
          keyCooldowns.set(activeKey, Date.now() + delayMs);
          // Crucial: Break model loop immediately! Do not try other models on the same rate-limited key
          break;
        }

        // For other transient errors (503, etc.), try next model
      }
    }

    // Advance to next key if current key failed or is in cooldown
    attempts++;
  }

  // All keys are in cooldown or unavailable; return clean failure result for domain fallback
  return {
    text: null,
    usedKeyIndex: currentKeyIndex,
    totalKeys,
    error: 'All Gemini API keys are in cooldown or unavailable',
  };
}

export function getPoolStatus() {
  const keys = getAllGeminiApiKeys();
  const now = Date.now();
  const activeKeys = keys.filter((k) => (keyCooldowns.get(k) || 0) <= now);

  return {
    totalKeys: keys.length,
    activeAvailableKeys: activeKeys.length,
    activeKeyIndex: currentKeyIndex % (keys.length || 1),
    configured: keys.length > 0,
    keysMasked: keys.map((k, idx) => {
      const inCooldown = (keyCooldowns.get(k) || 0) > now;
      const cooldownSecs = Math.max(0, Math.ceil(((keyCooldowns.get(k) || 0) - now) / 1000));
      return `Key #${idx + 1}: ${k.slice(0, 6)}...${k.slice(-4)}${inCooldown ? ` (Cooldown ${cooldownSecs}s)` : ' (Ready)'}`;
    }),
  };
}
