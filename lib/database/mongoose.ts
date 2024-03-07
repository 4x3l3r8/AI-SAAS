import mongoose, { Mongoose } from "mongoose";

const MONGODB_URL = process.env.MONGODB_URI;

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

let cached: MongooseConnection = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = {
    conn: null,
    promise: null,
  };
}

/**
 * The function `connectToDatabase` connects to a MongoDB database using a cached connection if
 * available.
 * @returns The `connectToDatabase` function returns a Promise that resolves to the MongoDB connection
 * object `cached.conn`. If the connection is already cached, it directly returns the cached
 * connection. If the MongoDB URL is missing, it throws an error.
 */
export const connectToDatabase = async () => {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URL) throw new Error("Missing MongoDB Url");

  cached.promise = cached.promise || mongoose.connect(MONGODB_URL, { dbName: "AISaas", bufferCommands: false });

  cached.conn = await cached.promise;

  return cached.conn
};
