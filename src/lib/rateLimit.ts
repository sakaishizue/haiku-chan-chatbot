import "server-only";

import { createHmac } from "node:crypto";

import { MongoError } from "mongodb";

import { getEnv } from "@/lib/env";
import { getUsageCollection } from "@/lib/mongodb";

const IP_DAILY_LIMIT = 200;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const USAGE_TTL_MS = 2 * 24 * 60 * 60 * 1000;

function anonKey(anonId: string): string {
  return `anon:${anonId}`;
}

// 日本には夏時間がないので、9 時間ずらすだけで日本時間の日付になる
export function getJstDate(): string {
  return new Date(Date.now() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

// Cloud Run は実際の接続元を X-Forwarded-For の末尾に追加する。
// 先頭側はクライアントが自由に書けるので使わない。
function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",").at(-1)?.trim() || "unknown";
}

function ipKey(request: Request): string {
  const hash = createHmac("sha256", getEnv().IP_HASH_SALT)
    .update(getClientIp(request))
    .digest("hex");
  return `ip:${hash}`;
}

async function incrementUsage(key: string, date: string): Promise<number> {
  const usage = await getUsageCollection();
  const document = await usage.findOneAndUpdate(
    { key, date },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(Date.now() + USAGE_TTL_MS) },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!document) throw new Error("回数を更新できませんでした");
  return document.count;
}

// 1 回分を数え、上限内なら true を返す
export async function consumeQuota(
  anonId: string,
  request: Request,
): Promise<boolean> {
  const date = getJstDate();
  // ブラウザの上限に達した人の分で、同じ IP の人の回数を減らさないように順に数える
  const anonCount = await incrementUsage(anonKey(anonId), date);
  if (anonCount > getEnv().DAILY_LIMIT) return false;
  const ipCount = await incrementUsage(ipKey(request), date);
  return ipCount <= IP_DAILY_LIMIT;
}

export async function getRemainingQuota(
  anonId: string,
  request: Request,
): Promise<number> {
  const anon = anonKey(anonId);
  const ip = ipKey(request);
  const usage = await getUsageCollection();
  const documents = await usage
    .find({ date: getJstDate(), key: { $in: [anon, ip] } })
    .toArray();
  const countOf = (key: string) =>
    documents.find((document) => document.key === key)?.count ?? 0;

  return Math.max(
    0,
    Math.min(
      getEnv().DAILY_LIMIT - countOf(anon),
      IP_DAILY_LIMIT - countOf(ip),
    ),
  );
}

// MongoDB のエラー文には接続先の情報が含まれることがあるので、名前とコードだけをログに出す
export function logQuotaError(error: unknown): void {
  if (error instanceof MongoError) {
    console.error("回数制限の処理に失敗しました", {
      name: error.name,
      code: error.code,
    });
  } else if (error instanceof Error) {
    console.error("回数制限の処理に失敗しました", {
      name: error.name,
      message: error.message,
    });
  } else {
    console.error("回数制限の処理に失敗しました", "不明なエラー");
  }
}
