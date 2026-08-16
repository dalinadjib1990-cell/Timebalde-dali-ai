import { getPoolStatus } from '../src/server/geminiPool';

export default function handler(req: any, res: any) {
  const pool = getPoolStatus();
  return res.status(200).json({
    status: 'ok',
    platform: 'vercel-serverless',
    timestamp: new Date().toISOString(),
    aiConfigured: pool.configured,
    totalApiKeys: pool.totalKeys,
    activeKeyIndex: pool.activeKeyIndex,
    keysSummary: pool.keysMasked,
  });
}
