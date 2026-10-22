import { Request, Response, NextFunction } from 'express';
import { CouponStore } from '../store/coupon.store';
import {
  isNonEmptyString,
  isValidDiscountPercent,
  parseValidDate,
  isValidAmount
} from '../utils/validators';

export class CouponController {
  constructor(private store: CouponStore) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, discountPercent, expiresAt } = req.body;

      if (!isNonEmptyString(code)) {
        return res.status(400).json({ error: 'code must be a non-empty string' });
      }

      if (!isValidDiscountPercent(discountPercent)) {
        return res.status(400).json({ error: 'discountPercent must be a number between 1 and 90' });
      }

      const expiryDate = parseValidDate(expiresAt);
      if (!expiryDate) {
        return res.status(400).json({ error: 'expiresAt must be a valid date string' });
      }

      const coupon = await this.store.create({
        code,
        discountPercent,
        expiresAt
      });

      res.status(201).json(coupon);
    } catch (err: any) {
      if (err.message === 'DUPLICATE_CODE') {
        return res.status(409).json({ error: 'coupon code already exists' });
      }
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const coupons = await this.store.findAll();
      res.json(coupons);
    } catch (err) {
      next(err);
    }
  };

  apply = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, amount } = req.body;

      if (!isNonEmptyString(code)) {
        return res.status(400).json({ error: 'code must be a non-empty string' });
      }

      if (!isValidAmount(amount)) {
        return res.status(400).json({ error: 'amount must be a non-negative number' });
      }

      const coupon = await this.store.findByCode(code);
      if (!coupon) {
        return res.status(404).json({ error: 'coupon not found' });
      }

      if (coupon.expiresAt < new Date()) {
        return res.status(400).json({ error: 'coupon has expired' });
      }

      const discountAmount = amount * (coupon.discountPercent / 100);
      const finalAmount = Math.round((amount - discountAmount) * 100) / 100;

      res.json({
        code: coupon.code,
        originalAmount: amount,
        discountPercent: coupon.discountPercent,
        finalAmount
      });
    } catch (err) {
      next(err);
    }
  };
}
