export interface Coupon {
  code: string;
  discountPercent: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateCouponInput {
  code: string;
  discountPercent: number;
  expiresAt: string;
}

export interface ApplyCouponInput {
  code: string;
  amount: number;
}

export interface ApplyCouponResult {
  code: string;
  originalAmount: number;
  discountPercent: number;
  finalAmount: number;
}
