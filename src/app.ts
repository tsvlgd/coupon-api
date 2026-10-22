import express from 'express';
import path from 'path';
import { CouponStore } from './store/coupon.store';
import { createCouponRouter } from './routes/coupon.routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

export function createApp(store: CouponStore) {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(createCouponRouter(store));

  const clientPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/coupons') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
