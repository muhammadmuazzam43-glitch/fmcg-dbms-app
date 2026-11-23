import { processAssistantChat } from '../../src/server/assistantService.ts';

interface VercelRequest {
  method?: string;
  body?: any;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  end: (chunk?: any) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    let parsedBody = req.body;
    if (typeof parsedBody === 'string') {
      parsedBody = JSON.parse(parsedBody);
    }
    const result = await processAssistantChat(parsedBody, process.env.GEMINI_API_KEY);
    res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('Error in /api/assistant/chat:', error);
    res.status(500).json({
      error: error?.message || 'Internal server error while processing AI request.',
    });
  }
}
