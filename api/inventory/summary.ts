import { getInventorySummaryPayload } from '../../src/server/assistantService.ts';

interface VercelRequest {
  method?: string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  end: (chunk?: any) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.status(204).end();
    return;
  }

  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.status(200).json(getInventorySummaryPayload());
}
