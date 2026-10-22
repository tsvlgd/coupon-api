import { Coupon, CreateCouponInput } from '../types/coupon';

export interface CouponStore {
  create(input: CreateCouponInput): Promise<Coupon>;
  findByCode(code: string): Promise<Coupon | null>;
  findAll(): Promise<Coupon[]>;
}
