import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getHealthPayload,
  getInventorySummaryPayload,
  processAssistantChat,
} from './src/server/assistantService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const apiKey = process.env.GEMINI_API_KEY;

  // Health and API Status
  app.get('/api/health', (_req, res) => {
    res.json(getHealthPayload(apiKey));
  });

  // Inventory Summary Endpoint
  app.get('/api/inventory/summary', (_req, res) => {
    res.json(getInventorySummaryPayload());
  });

  // Assistant Chat Route
  app.post('/api/assistant/chat', async (req, res) => {
    try {
      const result = await processAssistantChat(req.body, apiKey);
      res.status(result.status).json(result.body);
    } catch (error: any) {
      console.error('Error in /api/assistant/chat:', error);
      res.status(500).json({
        error: error.message || 'Internal server error while processing AI request.',
      });
    }
  });

  // Integration with Vite dev server in development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  return app;
}

// Start the server if executed directly
const PORT = Number(process.env.PORT) || 3000;
createServer().then((app) => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FMCG Inventory Intelligence] Full-stack Server listening on port ${PORT}`);
  });
});
