# Technical decisions

This is a plain record of what I used and why, including a couple of things I deliberately did not use even though they are good tools in general.

## Runtime and backend: Node.js, Express, TypeScript

The task names the stack directly, "TypeScript, Node.js, Express and MongoDB", so I used exactly that rather than substituting something else. There was no real decision to make here.

On Bun, which is a legitimate runtime and something I did consider, there are two separate reasons I did not use it, not just one. The first is that the task is specific about the runtime: swapping Node for Bun on a take home task like this reads as not following the brief, even if the resulting code runs the same way, and the "make a reasonable choice if something is unclear" rule does not apply because the runtime is not unclear, it is stated. The second is that even setting that aside, Bun's main advantages (speed, a bundled test runner and bundler, native TS execution) matter most on larger projects or when you are optimizing an existing Node setup, and for a small API with three endpoints Node's startup time and package installs are already fast enough that none of this shows up. What matters more here is that a reviewer can clone it, run `npm install` and have it work with nothing extra installed, and asking them to install Bun on top of Node just to look at a coupon API adds a dependency for no real benefit.

## Database: MongoDB with Mongoose, in memory as a fallback

The task says "Store the coupons in MongoDB if you can; otherwise keep them in memory", so both halves of the storage design come from the brief rather than being an open choice. Mongoose rather than the plain MongoDB driver, because the data here is genuinely simple (a code, a discount percent, an expiry date) and Mongoose's schema gives free validation (the 1 to 90 range, required fields, a unique index on the code) without writing that by hand. For a project this size that is less code, not more abstraction.

To avoid tying the whole codebase to Mongo specifically, the API talks to a `CouponStore` interface (`src/store/coupon.store.ts`) rather than importing Mongoose directly in the controller. There are two implementations behind it, `MongoCouponStore` and `InMemoryCouponStore`, and the server picks one at startup depending on whether `MONGODB_URI` is set and reachable. This means the API runs with zero setup out of the box, Mongo is used automatically the moment you provide a connection string, and swapping in a different backend later (Postgres included) would mean writing one more class, not rewriting the routes or controllers.

I did not reach for Postgres or Drizzle because nothing in the task asks for a relational model, and bringing in a SQL database would mean asking the reviewer to also run Postgres locally (or spin up a container) and apply migrations before the API even starts. That works against the part of the task that says to keep this reproducible, and against the "in memory if you can't use Mongo" escape hatch the task already gives you. If a future version of this needed real relations between coupons, orders and customers, Postgres would be the better call, but that is not what this task asks for.

## Frontend bundler for the bonus page: Vite

The bonus ask was a small React page that creates and lists coupons, so the bar here is "boring and working", not a chance to try something new. Vite is the standard starting point for a plain React and TypeScript single page app at this point, it needs no config for this use case, its React plugin and Fast Refresh are mature, and almost anyone reviewing this has seen a Vite project before and knows what `npm run dev` will do.

Vite is only doing the building here. The client is compiled into `client/dist` and served by the Express backend at `/`, so the reviewer does not need a second dev server running to see the page and the API and the page share one origin. The Vite dev server is still there for frontend work, it just proxies API calls to the backend.

I did not use Bun's bundler, even though Bun does ship its own fast bundler and dev server and for a from scratch greenfield project I would consider it. Here the backend already has to run on Node because the task specifies it, so using Bun only for the client would mean the repository needs two different JavaScript runtimes installed to run the two halves of the project. That is more moving parts for the reviewer, not fewer, which is the opposite of what Bun is supposed to buy you. Keeping one runtime (Node) and one package manager (npm) for the whole repository, backend and client both, was the simpler and more reproducible choice.

## Testing: Jest and Supertest

Jest with ts-jest and Supertest is a long standing, very common combination for testing an Express API, and it needed no changes to the project's existing TypeScript setup to work.

I did not use Vitest, which is a fine alternative and is often paired with Vite projects, because the backend here is not a Vite project, it is a plain Node and TypeScript server, so pulling in Vitest would mean adding a second test runner's config just for stylistic reasons rather than a functional one.

## Validation: hand written checks

`src/utils/validators.ts` has small, explicit functions (`isNonEmptyString`, `isValidDiscountPercent`, `parseValidDate`, `isValidAmount`) instead of a library like Zod or Joi. For three endpoints and four fields total, a validation library adds a dependency and a bit of a learning curve for a reviewer without saving much code.

If this API grew to cover more resources I would reach for Zod at that point, mainly for the ability to infer TypeScript types straight from the schema.

## Why the storage choice is still swappable

Even though Mongo is the default here, the `CouponStore` interface means none of this is locked in. If this were handed off to someone who preferred Postgres with Drizzle, the change would be scoped to one new file implementing `CouponStore` plus a startup check in `src/index.ts`, nothing in `src/routes`, `src/controllers` or the tests would need to change, since the tests themselves run against `InMemoryCouponStore` and never import Mongoose at all.
