import request from 'supertest';
import { createApp } from '../src/app';
import { InMemoryCouponStore } from '../src/store/memory.store';

describe('Coupon API', () => {
  const store = new InMemoryCouponStore();
  const app = createApp(store);

  beforeEach(async () => {
    (store as any).coupons.clear();
  });

  describe('POST /coupons', () => {
    it('creates a coupon with valid input', async () => {
      const res = await request(app)
        .post('/coupons')
        .send({
          code: 'WELCOME10',
          discountPercent: 10,
          expiresAt: '2099-01-01'
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('WELCOME10');
      expect(res.body.discountPercent).toBe(10);
      expect(res.body.createdAt).toBeDefined();
    });

    it('rejects a duplicate code', async () => {
      await request(app)
        .post('/coupons')
        .send({ code: 'DUP', discountPercent: 20, expiresAt: '2099-01-01' });

      const res = await request(app)
        .post('/coupons')
        .send({ code: 'dup', discountPercent: 30, expiresAt: '2099-01-01' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('rejects missing code', async () => {
      const res = await request(app)
        .post('/coupons')
        .send({ discountPercent: 10, expiresAt: '2099-01-01' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('code');
    });

    it('rejects invalid discountPercent', async () => {
      const res = await request(app)
        .post('/coupons')
        .send({ code: 'BAD', discountPercent: 100, expiresAt: '2099-01-01' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('discountPercent');
    });

    it('rejects invalid expiresAt', async () => {
      const res = await request(app)
        .post('/coupons')
        .send({ code: 'BAD', discountPercent: 10, expiresAt: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('expiresAt');
    });
  });

  describe('GET /coupons', () => {
    it('lists all coupons, newest first', async () => {
      await request(app)
        .post('/coupons')
        .send({ code: 'FIRST', discountPercent: 10, expiresAt: '2099-01-01' });

      await request(app)
        .post('/coupons')
        .send({ code: 'SECOND', discountPercent: 20, expiresAt: '2099-01-01' });

      const res = await request(app).get('/coupons');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].code).toBe('SECOND');
      expect(res.body[1].code).toBe('FIRST');
    });
  });

  describe('POST /coupons/apply', () => {
    beforeEach(async () => {
      await request(app)
        .post('/coupons')
        .send({ code: 'ACTIVE', discountPercent: 20, expiresAt: '2099-01-01' });

      await request(app)
        .post('/coupons')
        .send({ code: 'EXPIRED', discountPercent: 10, expiresAt: '2020-01-01' });
    });

    it('applies a valid coupon', async () => {
      const res = await request(app)
        .post('/coupons/apply')
        .send({ code: 'ACTIVE', amount: 100 });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe('ACTIVE');
      expect(res.body.originalAmount).toBe(100);
      expect(res.body.discountPercent).toBe(20);
      expect(res.body.finalAmount).toBe(80);
    });

    it('returns 404 for unknown code', async () => {
      const res = await request(app)
        .post('/coupons/apply')
        .send({ code: 'UNKNOWN', amount: 100 });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('returns 400 for expired coupon', async () => {
      const res = await request(app)
        .post('/coupons/apply')
        .send({ code: 'EXPIRED', amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('expired');
    });

    it('returns 400 for missing amount', async () => {
      const res = await request(app)
        .post('/coupons/apply')
        .send({ code: 'ACTIVE' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('amount');
    });

    it('returns 400 for negative amount', async () => {
      const res = await request(app)
        .post('/coupons/apply')
        .send({ code: 'ACTIVE', amount: -10 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('amount');
    });

    it('returns 400 for non-numeric amount', async () => {
      const res = await request(app)
        .post('/coupons/apply')
        .send({ code: 'ACTIVE', amount: 'abc' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('amount');
    });

    it('returns 400 for a malformed JSON body', async () => {
      const res = await request(app)
        .post('/coupons/apply')
        .set('Content-Type', 'application/json')
        .send('{"code":"ACTIVE","amount":');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid JSON');
    });

    it('rounds the final amount to 2 decimal places', async () => {
      await request(app)
        .post('/coupons')
        .send({ code: 'ROUND', discountPercent: 15, expiresAt: '2099-01-01' });

      const res = await request(app)
        .post('/coupons/apply')
        .send({ code: 'ROUND', amount: 19.99 });

      expect(res.status).toBe(200);
      expect(res.body.finalAmount).toBe(16.99);
    });
  });
});
