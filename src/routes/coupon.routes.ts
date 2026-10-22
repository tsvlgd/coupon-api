import { Router } from 'express';
import { CouponController } from '../controllers/coupon.controller';
import { CouponStore } from '../store/coupon.store';

export function createCouponRouter(store: CouponStore): Router {
  const router = Router();
  const controller = new CouponController(store);

  router.post('/coupons', controller.create);
  router.get('/coupons', controller.list);
  router.post('/coupons/apply', controller.apply);

  return router;
}
