import mongoose from 'mongoose';

export async function connectMongo(uri: string): Promise<boolean> {
  if (!uri) {
    return false;
  }

  try {
    await mongoose.connect(uri);
    console.log('connected to MongoDB');
    return true;
  } catch (err) {
    console.warn('could not connect to MongoDB:', (err as Error).message);
    return false;
  }
}
