import "server-only";

import { MongoClient } from "mongodb";
import type { Collection } from "mongodb";

import { getEnv } from "@/lib/env";

export type UsageDocument = {
  // "anon:<uuid>" または "ip:<hash>"
  key: string;
  // 日本時間の日付（YYYY-MM-DD）
  date: string;
  count: number;
  expiresAt: Date;
};

// 接続に失敗したときに早めにエラーを返す（既定の 30 秒だと画面が待たされる）
const SERVER_SELECTION_TIMEOUT_MS = 5000;

// ルートごとにモジュールが分かれても、接続は 1 つを使い回す
const globalForMongo = globalThis as typeof globalThis & {
  usageCollection?: Promise<Collection<UsageDocument>>;
};

async function connect(): Promise<Collection<UsageDocument>> {
  const client = new MongoClient(getEnv().MONGODB_URI, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  });
  try {
    await client.connect();
    const usage = client.db("chatbot").collection<UsageDocument>("usage");
    // すでにあれば何もしないので、起動のたびに実行してよい
    await Promise.all([
      usage.createIndex({ key: 1, date: 1 }, { unique: true }),
      usage.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    return usage;
  } catch (error) {
    await client.close();
    throw error;
  }
}

export function getUsageCollection(): Promise<Collection<UsageDocument>> {
  globalForMongo.usageCollection ??= connect().catch((error: unknown) => {
    // 失敗を使い回さず、次のリクエストで接続し直す
    globalForMongo.usageCollection = undefined;
    throw error;
  });
  return globalForMongo.usageCollection;
}
