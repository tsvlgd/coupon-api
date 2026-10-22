# Technical decisions

This is a plain record of what I used and why, including a couple of things I deliberately did not use even though they are good tools in general.

## Runtime and backend: Node.js, Express, TypeScript (not Bun)

The task says directly: "Both use the tools we work with every day: TypeScript, Node.js, Express and MongoDB." That is not a loose suggestion, it is the stack the task names, so I used exactly that rather than substituting something else.

Bun is a legitimate runtime and I considered it, but there are two separate reasons I did not use it here, not just one.

First, the task is specific about the runtime. Swapping Node for Bun on a take home task like this reads as not following the brief, even if the resulting code runs the same way. The "if something is unclear, make a reasonable choice" rule in the task does not apply here, because the runtime is not unclear, it is stated.

Second, even setting that aside, Bun's main advantages (speed, a bundled test runner and bundler, native TS execution) matter most on larger projects or when you are optimizing an existing Node setup. For a small API with three endpoints, Node's startup time and package installs are already fast enough that none of this shows up. The things that make a take home task good to review, being able to clone it, run `npm install`, and have it work with nothing extra installed, matter more here than raw execution speed. Asking a reviewer to have Bun installed, on top of Node, just to look at a coupon API adds a dependency for no real benefit.

## Database: MongoDB with Mongoose, in memory as a fallback (not Postgres or Drizzle)

Same situation as above, the task says "Store the coupons in MongoDB if you can; otherwise keep them in memory," so both parts of the storage design come directly from the brief rather than being an open choice.

I used Mongoose rather than the plain MongoDB driver because the data here is genuinely simple (a code, a discount percent, an expiry date) and Mongoose's schema gives free validation (the 1 to 90 range, required fields, a unique index on the code) without writing that by hand. For a project this size that is less code, not more abstraction.

I did not reach for Postgres or Drizzle because nothing in the task asks for a relational model, and bringing in a SQL database would mean asking the reviewer to also run Postgres locally (or spin up a container) and apply migrations before the API even starts. That directly works against the part of the task that says to keep this reproducible, and against the "in memory if you can't use Mongo" escape hatch the task already gives you. If a future version of this needed real relations between coupons, orders and customers, Postgres would be the better call, but that is not what this task asks for.

To avoid tying the whole codebase to Mongo specifically, the API talks to a `CouponStore` interface (`src/store/coupon.store.ts`) rather than importing Mongoose directly in the controller. There are two implementations behind it, `MongoCouponStore` and `InMemoryCouponStore`, and the server picks one at startup depending on whether `MONGODB_URI` is set and reachable. This means the API runs with zero setup out of the box, Mongo is used automatically the moment you provide a connection string, and swapping in a different backend later (Postgres included) would mean writing one more class, not rewriting the routes or controllers.

## Frontend bundler for the bonus page: Vite (not Bun's bundler)

The bonus ask was a small React page that creates and lists coupons, so the bar here is "boring and working," not a chance to try something new.

Vite is the standard starting point for a plain React and TypeScript single page app at this point, it needs no config for this use case, its React plugin and Fast Refresh are mature, and almost anyone reviewing this has seen a Vite project before and knows what `npm run dev` will do.

Bun does ship its own fast bundler and dev server, and for a from scratch greenfield project I would consider it. Here though, the backend already has to run on Node because the task specifies it, so using Bun only for the client would mean the repository needs two different JavaScript runtimes installed to run the two halves of the project. That is more moving parts for the reviewer, not fewer, which is the opposite of what Bun is supposed to buy you. Keeping one runtime (Node) and one package manager (npm) for the whole repository, backend and client both, was the simpler and more reproducible choice.

## Testing: Jest and Supertest

Jest with ts-jest and Supertest is a long standing, very common combination for testing an Express API, and it needed no changes to the project's existing TypeScript setup to work. Vitest is a fine alternative and is often paired with Vite projects, but the backend here is not a Vite project, it is a plain Node and TypeScript server, so pulling in Vitest would mean adding a second test runner's config just for stylistic reasons rather than a functional one.

## Validation: hand written checks, not a schema library

`src/utils/validators.ts` has small, explicit functions (`isNonEmptyString`, `isValidDiscountPercent`, `parseValidDate`, `isValidAmount`) instead of a library like Zod or Joi. For three endpoints and four fields total, a validation library adds a dependency and a bit of a learning curve for a reviewer without saving much code. If this API grew to cover more resources, I would reach for Zod at that point, mainly for the ability to infer TypeScript types straight from the schema.

## Why the storage choice is still swappable

Even though Mongo is the default here, the `CouponStore` interface means none of this is locked in. If this were handed off to someone who preferred Postgres with Drizzle, the change would be scoped to one new file implementing `CouponStore` plus a startup check in `src/index.ts`, nothing in `src/routes`, `src/controllers` or the tests would need to change, since the tests themselves run against `InMemoryCouponStore` and never import Mongoose at all.
