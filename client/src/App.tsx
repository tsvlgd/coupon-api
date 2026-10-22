import { useState, useEffect, FormEvent } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

interface Coupon {
  code: string;
  discountPercent: number;
  expiresAt: string;
  createdAt: string;
}

function App() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function fetchCoupons() {
    try {
      const res = await fetch(`${API_BASE}/coupons`);
      if (!res.ok) throw new Error('Failed to fetch coupons');
      const data = await res.json();
      setCoupons(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          discountPercent: parseFloat(discountPercent),
          expiresAt
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create coupon');
      }

      setSuccess('Coupon created successfully');
      setCode('');
      setDiscountPercent('');
      setExpiresAt('');
      fetchCoupons();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Coupon Manager</h1>

      <div className="form">
        <h2>Create Coupon</h2>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="WELCOME10"
              />
            </div>
            <div className="form-group">
              <label>Discount %</label>
              <input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                required
                min="1"
                max="90"
                placeholder="10"
              />
            </div>
            <div className="form-group">
              <label>Expires At</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Coupon'}
          </button>
        </form>
      </div>

      <div className="coupons">
        <h2>All Coupons</h2>
        {coupons.length === 0 ? (
          <div className="empty">No coupons yet. Create one above.</div>
        ) : (
          <div className="coupon-list">
            {coupons.map((coupon) => (
              <div key={coupon.code} className="coupon-card">
                <div className="coupon-code">{coupon.code}</div>
                <div className="coupon-details">
                  <span>{coupon.discountPercent}% off</span>
                  <span>Expires: {new Date(coupon.expiresAt).toLocaleDateString()}</span>
                  <span>Created: {new Date(coupon.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
