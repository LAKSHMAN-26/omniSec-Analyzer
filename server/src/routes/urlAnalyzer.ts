import { Router, Request, Response } from 'express';
import { analyzeUrlSafety } from '../services/urlAnalyzer.js';
import { z } from 'zod';

export const urlAnalyzerRouter = Router();

const checkSchema = z.object({
  url: z.string().optional().default('')
});

urlAnalyzerRouter.post('/check', (req: Request, res: Response) => {
  try {
    const { url } = checkSchema.parse(req.body);
    const result = analyzeUrlSafety(url);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({
      error: 'Invalid request payload',
      message: err.message
    });
  }
});

// GET endpoint as convenience
urlAnalyzerRouter.get('/check', (req: Request, res: Response) => {
  const urlParam = (req.query.url as string) || '';
  const result = analyzeUrlSafety(urlParam);
  return res.json(result);
});
