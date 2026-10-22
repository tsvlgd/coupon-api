# Part 2: bugs in the apply route

The snippet from the task:

```js
app.post("/apply", async (req, res) => {
  const coupon = await Coupon.findOne({ code: req.body.code });
  if (coupon.expiresAt < new Date()) {
    return res.status(400).json({ message: "Expired" });
  }
  const finalAmount = req.body.amount - req.body.amount * coupon.discount / 100;
  res.json({ finalAmount });
});
```

Here is everything I found, roughly in order of how badly it breaks things.

**1. No check for a missing coupon.** `Coupon.findOne` returns `null` when no document matches, it does not throw and it does not return an empty object. The code goes straight to `coupon.expiresAt` without checking that, so an unknown code throws a `TypeError: Cannot read properties of null` instead of returning the clear error message the task asks for. This should return a 404 with `{ error: "coupon not found" }` as soon as `coupon` is null, before anything else touches it.

**2. No validation on the amount.** `req.body.amount` is used directly in arithmetic with no check that it exists, is a number, or is non negative. A missing or non numeric amount produces `NaN`, and `NaN` is not valid JSON, so `JSON.stringify` silently turns it into `null` and the caller gets `{"finalAmount":null}` back with a 200 status instead of an error. A negative amount is worse than that, it is accepted and discounted like any other number, so an amount of `-100` at 10 percent returns a final amount of `-90`, which is a refund and not a discount. A string amount like `"250"` appears to work only because JavaScript coerces it, which means you cannot tell what the caller actually sent. This needs an explicit check, something like `typeof amount === "number" && Number.isFinite(amount) && amount >= 0`, returning 400 if it fails. The `Number.isFinite` part is not optional, `typeof NaN` is `"number"`, so a `typeof` check on its own would still let `NaN` through.

**3. No error handling around the database call.** The whole handler is wrapped in nothing. If `findOne` rejects, for example because the database connection drops, the thrown error has nowhere to go. In Express 4 an error thrown inside an async handler is not automatically caught, so the request just hangs and the process can end up with an unhandled rejection. This needs a try/catch (or `express-async-errors`, or an upgrade to Express 5 which catches this for you) with the error passed to a proper error handling middleware. This one is what turns every other bug from "wrong answer" into "no answer", because it is the difference between a 404 and a request that never comes back.

**4. No validation on the code itself.** If `req.body.code` is missing or not a string, the query runs anyway, and with Mongoose that is worse than it looks. Mongoose strips `undefined` out of query filters, so `findOne({ code: undefined })` is cast to `findOne({})`, which means "give me any one document from the collection". A request with no `code` at all does not produce an error, it silently applies whichever coupon happens to be first. The same missing validation also leaves the query open to operator injection, a body of `{"code": {"$ne": null}}` is an object and Mongo reads it as "match any document". The code should be checked for being a non empty string before it is used in a query, which fixes the misleading "coupon not found" error as well.

**5. The final amount is not rounded.** Plain floating point subtraction and multiplication can leave long decimal tails, for example an amount of `10.39` with a 33 percent discount comes back as `6.9613000000000005`. The response should round to 2 decimal places before it is sent back, since this is money. `toFixed(2)` is the obvious fix and it is the wrong one, it returns a string so the JSON response would carry `"6.96"` instead of `6.96` and any client doing arithmetic on it breaks, and it truncates instead of rounding so `(1.005).toFixed(2)` is `"1.00"`. `Math.round(value * 100) / 100` keeps it a number and is the standard money idiom.

**6. The route path does not match the spec.** This snippet is mounted at `/apply`, but Part 1 asks for `POST /coupons/apply`. Small thing, but worth pointing out since it would break any client calling the documented path, and the API path is a contract that the README and any client depend on.

**7. Beyond the six, the amount is client supplied.** `req.body.amount` is attacker controlled. Validating it, as in point 2, makes the number well formed but not correct, a client can send `amount: 1` for a real order worth thousands and get a 90 percent discount on it. In a real system the amount has to be read from the cart on the server, so the discount is applied to a value the client never got to choose. For this task the endpoint is a pure calculator, which is what the spec asks for, but it is the first thing I would change if this were a live orders API.

## The fixed version

Everything above, in one handler:

```js
app.post('/coupons/apply', async (req, res, next) => {   // 6. the path the spec asks for
  try {                                                   // 3. catch what the database throws
    const { code, amount } = req.body;

    // 4. the code has to be a non-empty string before it reaches the query
    if (typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: 'code must be a non-empty string' });
    }

    // 2. the amount has to be a real, finite, non-negative number
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ error: 'amount must be a non-negative number' });
    }

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });

    // 1. findOne returns null when nothing matches, check it before reading its fields
    if (!coupon) {
      return res.status(404).json({ error: 'coupon not found' });
    }

    if (coupon.expiresAt < new Date()) {
      return res.status(400).json({ error: 'coupon has expired' });
    }

    // 5. round the money to 2 decimal places
    const discountAmount = amount * (coupon.discountPercent / 100);
    const finalAmount = Math.round((amount - discountAmount) * 100) / 100;

    res.json({
      code: coupon.code,
      originalAmount: amount,
      discountPercent: coupon.discountPercent,
      finalAmount
    });
  } catch (err) {
    // 3. forward it to the error handler, Express 4 does not catch async throws on its own
    next(err);
  }
});
```

And the other half of point 3, the error handler it forwards to:

```js
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {            // a body that is not valid JSON
    return res.status(400).json({ error: 'invalid JSON body' });
  }
  console.error('unhandled error:', err);               // never leak the stack to the client
  res.status(500).json({ error: 'something went wrong, please try again' });
});
```

## What each case looks like

| Case | Broken snippet | Fixed |
|---|---|---|
| Coupon code does not exist | `TypeError`, request hangs | `404 {"error":"coupon not found"}` |
| Coupon has expired | `400 {"message":"Expired"}` | `400 {"error":"coupon has expired"}` |
| Amount missing | `200 {"finalAmount":null}` | `400 {"error":"amount must be a non-negative number"}` |
| Amount negative | `200 {"finalAmount":-90}` | `400` |
| Amount not a number | `200 {"finalAmount":null}` | `400` |
| Database connection drops | request hangs, possible unhandled rejection | `500` from the error handler |
| Malformed JSON body | `500` | `400 {"error":"invalid JSON body"}` |

## How this maps to the actual API

The same six points are handled in `src/controllers/coupon.controller.ts`, the shape check and the amount check are `src/utils/validators.ts`, the try/catch forwards to `src/middleware/error-handler.ts`, and the route is wired in `src/routes/coupon.routes.ts` as `router.post('/coupons/apply', controller.apply)`.

The one difference is that the real API does not read the amount from the request for its own sake, it goes through a `CouponStore` interface, and the in-memory and Mongo implementations both store `discountPercent` rather than `discount`, with the 1 to 90 range validated when the coupon is created rather than when it is applied.
