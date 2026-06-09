import { Router, Request, Response } from 'express';

const router = Router();

interface FinnhubQuote {
  c: number;
  d: number;
  dp: number;
  t: number;
}

router.get('/quote/:symbol', async (req: Request, res: Response) => {
  const rawSymbol = req.params.symbol;
  const symbol = (Array.isArray(rawSymbol) ? rawSymbol[0] : rawSymbol).toUpperCase();
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    res.json({
      symbol,
      price: null,
      change: null,
      changePercent: null,
      message:
        'Add FINNHUB_API_KEY to backend/.env for live quotes. Using manual data collection until then.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    const response = await fetch(url);
    const data = (await response.json()) as FinnhubQuote;

    if (!data.c) {
      res.status(404).json({ error: `No quote found for ${symbol}` });
      return;
    }

    res.json({
      symbol,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      timestamp: new Date(data.t * 1000).toISOString(),
    });
  } catch (error) {
    res.status(502).json({ error: 'Failed to fetch market quote' });
  }
});

export default router;
