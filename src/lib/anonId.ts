import "server-only";

import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

const COOKIE_NAME = "anon_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// ブラウザごとの匿名 ID を返す。なければ発行して Cookie に保存する。
// Cookie を書き込むので、Route Handler からのみ呼ぶこと。
export async function getOrCreateAnonId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing && UUID_PATTERN.test(existing)) return existing;

  const anonId = randomUUID();
  cookieStore.set(COOKIE_NAME, anonId, {
    httpOnly: true,
    // Secure の Cookie は HTTP では保存されない。開発時に LAN の IP（HTTP）で開くスマホでも数えられるように、本番のみ付ける
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return anonId;
}
