import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { getEnv } from "@/lib/env";
import { SYSTEM_PROMPT } from "@/lib/persona";

const MODEL = "claude-haiku-5-5";
// Haiku 5.5 は思考（thinking）が既定で有効で、その分も max_tokens に含まれる。
// 返答の短さはシステムプロンプトで指示し、ここは思考で返答が切れない程度の上限にする。
const MAX_TOKENS = 1024;

let client: Anthropic | undefined;

function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: getEnv().ANTHROPIC_API_KEY });
  return client;
}

// ハイクちゃんの返答をストリーミングで生成する
export function createChatStream(
  messages: Anthropic.MessageParam[],
  signal: AbortSignal,
) {
  return getClient().messages.create(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // 雑談なので思考は最小限にして、速さと費用を優先する
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages,
      stream: true,
    },
    { signal },
  );
}
