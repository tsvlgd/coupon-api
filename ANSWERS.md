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

**1. No check for a missing coupon.** `Coupon.findOne` returns `null` when no document matches. The code goes straight to `coupon.expiresAt` without checking that, so an unknown code throws a TypeError instead of returning the clear error message the task asks for. This should return something like a 404 with `{ error: "coupon not found" }` as soon as `coupon` is null, before anything else touches it.

**2. No validation on the amount.** `req.body.amount` is used directly in arithmetic with no check that it exists, is a number, or is non negative. A missing or non numeric amount silently produces `NaN`, and the caller gets `{ finalAmount: NaN }` back with a 200 status instead of an error. A negative amount is accepted and discounted like any other number. This needs an explicit check, something like `typeof amount === "number" && Number.isFinite(amount) && amount >= 0`, returning 400 if it fails.

**3. No error handling around the database call.** The whole handler is wrapped in nothing. If `findOne` rejects, for example because the database connection drops, the thrown error has nowhere to go. In Express 4 an error thrown inside an async handler is not automatically caught, so the request just hangs and the process can end up with an unhandled rejection. This needs a try/catch (or `express-async-errors`, or an upgrade to Express 5 which catches this for you) with the error passed to a proper error handling middleware.

**4. No validation on the code itself.** If `req.body.code` is missing or not a string, the query runs anyway. Depending on the schema this can either match nothing (fine, but still gives a misleading "not found" rather than "you forgot to send a code") or behave unpredictably. The code should be checked for being a non empty string before it is used in a query.

**5. The final amount is not rounded.** Plain floating point subtraction and multiplication can leave long decimal tails, for example an amount of 19.99 with a 15 percent discount. The response should round to 2 decimal places before being sent back, since this is money.

**6. The route path does not match the spec.** This snippet is mounted at `/apply`, but Part 1 asks for `POST /coupons/apply`. Small thing, but worth pointing out since it would break any client calling the documented path.

In the actual API (`src/controllers/coupon.controller.ts`), all six of these are handled: the coupon is checked for existence before its fields are read, amount and code are validated up front with clear 400/404 responses, the whole handler runs inside a try/catch that forwards to a central error handler, and the final amount is rounded to 2 decimal places.
