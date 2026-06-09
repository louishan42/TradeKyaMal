import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getProviders } from '../services/providers';
import { fetchAndStore } from '../services/fetchData';

const router = Router();

const fetchSchema = z.object({
  provider: z.enum(['finnhub', 'alpha_vantage', 'fred', 'newsapi']),
  symbol: z.string().optional(),
  seriesId: z.string().optional(),
  query: z.string().optional(),
  indicator: z.string().optional(),
});

router.get('/providers', (_req: Request, res: Response) => {
  res.json(getProviders());
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = fetchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const provider = getProviders().find((p) => p.id === parsed.data.provider);
    if (!provider?.configured) {
      res.status(400).json({
        error: `${provider?.name ?? parsed.data.provider} API key not configured. Add ${provider?.envKey} to backend/.env`,
      });
      return;
    }

    const entries = await fetchAndStore(parsed.data);
    res.status(201).json({ count: entries.length, entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fetch failed';
    res.status(502).json({ error: message });
  }
});

export default router;
