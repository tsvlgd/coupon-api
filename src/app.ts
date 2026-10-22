import express from 'express';
import { CouponStore } from './store/coupon.store';
import { createCouponRouter } from './routes/coupon.routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

export function createApp(store: CouponStore) {
  const app = express();

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(createCouponRouter(store));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
