import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('unhandled error:', err);
  res.status(500).json({ error: 'something went wrong, please try again' });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: 'not found' });
}
