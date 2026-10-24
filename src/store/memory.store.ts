import { Coupon, CreateCouponInput } from '../types/coupon';
import { CouponStore } from './coupon.store';

export class InMemoryCouponStore implements CouponStore {
  private coupons: Map<string, Coupon> = new Map();

  async create(input: CreateCouponInput): Promise<Coupon> {
    const code = input.code.trim().toUpperCase();

    if (this.coupons.has(code)) {
      throw new Error('DUPLICATE_CODE');
    }

    const coupon: Coupon = {
      code,
      discountPercent: input.discountPercent,
      expiresAt: new Date(input.expiresAt),
      createdAt: new Date()
    };

    this.coupons.set(code, coupon);
    return coupon;
  }

  async findByCode(code: string): Promise<Coupon | null> {
    return this.coupons.get(code.trim().toUpperCase()) || null;
  }

  async findAll(): Promise<Coupon[]> {
    return Array.from(this.coupons.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
}
