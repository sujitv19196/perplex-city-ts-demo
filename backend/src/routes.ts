import { Router, Request, Response } from 'express';
import { User } from 'shared/src/models';
import redisClient  from './redisClient';
import { search } from './aiSearch';

const router = Router();

router.get('/api/cache_test', async (req: Request, res: Response) => {
    redisClient.set('ping', 'pong');
    const value = await redisClient.get('ping');
    res.json({ key: value });
});

router.post<{ query: string }, { result: any, citations: any, relatedQuestions: any }>('/api/search', async (req, res) => {
  const { query } = req.body;
  // TODO - Check Redis cache for query or similar queries before searching
  const {response, relatedQuestions} = await search(query);
  // TODO - Cache responses in Redis
  res.json({ result: response.answer, citations: response.citations, relatedQuestions });
});

export default router;
