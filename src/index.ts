import { PORT, MONGODB_URI } from './config/env';
import { connectMongo } from './db/connect';
import { InMemoryCouponStore } from './store/memory.store';
import { MongoCouponStore } from './store/mongo.store';
import { CouponStore } from './store/coupon.store';
import { createApp } from './app';

async function main() {
  let store: CouponStore;
  let storageBackend: string;

  const mongoConnected = await connectMongo(MONGODB_URI);

  if (mongoConnected) {
    store = new MongoCouponStore();
    storageBackend = 'MongoDB';
  } else {
    store = new InMemoryCouponStore();
    storageBackend = 'in memory (set MONGODB_URI in .env to use MongoDB instead)';
  }

  const app = createApp(store);

  app.listen(PORT, () => {
    console.log(`coupon api listening on port ${PORT}`);
    console.log(`storage backend: ${storageBackend}`);
  });
}

main();
