import { Coupon, CreateCouponInput } from '../types/coupon';
import { CouponStore } from './coupon.store';
import { CouponModel } from '../models/coupon.model';

export class MongoCouponStore implements CouponStore {
  async create(input: CreateCouponInput): Promise<Coupon> {
    try {
      const doc = await CouponModel.create({
        code: input.code.trim().toUpperCase(),
        discountPercent: input.discountPercent,
        expiresAt: new Date(input.expiresAt)
      });

      return {
        code: doc.code,
        discountPercent: doc.discountPercent,
        expiresAt: doc.expiresAt,
        createdAt: doc.createdAt
      };
    } catch (err: any) {
      if (err.code === 11000) {
        throw new Error('DUPLICATE_CODE');
      }
      throw err;
    }
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const doc = await CouponModel.findOne({ code: code.trim().toUpperCase() });
    if (!doc) return null;

    return {
      code: doc.code,
      discountPercent: doc.discountPercent,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt
    };
  }

  async findAll(): Promise<Coupon[]> {
    const docs = await CouponModel.find().sort({ createdAt: -1 });
    return docs.map(doc => ({
      code: doc.code,
      discountPercent: doc.discountPercent,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt
    }));
  }
}
