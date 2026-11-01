import "server-only";

// サーバー側でのみ使う環境変数をまとめて検証し、型付きで返す。
// `next build` が環境変数なしでも通るように、読み込み時ではなく初回呼び出し時に検証する。

export type Env = {
  ANTHROPIC_API_KEY: string;
  MONGODB_URI: string;
  IP_HASH_SALT: string;
  DAILY_LIMIT: number;
};

const DEFAULT_DAILY_LIMIT = 50;

let cached: Env | undefined;

function readRequired(name: string, missing: string[]): string {
  const value = process.env[name]?.trim();
  if (!value) {
    missing.push(name);
    return "";
  }
  return value;
}

function readDailyLimit(): number {
  const raw = process.env.DAILY_LIMIT?.trim();
  if (!raw) return DEFAULT_DAILY_LIMIT;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `環境変数 DAILY_LIMIT は 1 以上の整数で指定してください（現在の値: "${raw}"）`,
    );
  }
  return value;
}

export function getEnv(): Env {
  if (cached) return cached;

  const missing: string[] = [];
  const env: Env = {
    ANTHROPIC_API_KEY: readRequired("ANTHROPIC_API_KEY", missing),
    MONGODB_URI: readRequired("MONGODB_URI", missing),
    IP_HASH_SALT: readRequired("IP_HASH_SALT", missing),
    DAILY_LIMIT: readDailyLimit(),
  };

  if (missing.length > 0) {
    // 値そのものは出さず、不足している変数名だけを伝える
    throw new Error(
      `必要な環境変数が設定されていません: ${missing.join(", ")}（.env.local または Cloud Run の設定を確認してください）`,
    );
  }

  cached = env;
  return env;
}
