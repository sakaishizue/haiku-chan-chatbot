import Anthropic from "@anthropic-ai/sdk";
import type { Stream } from "@anthropic-ai/sdk/core/streaming";

import { createChatStream } from "@/lib/anthropic";
import {
  MAX_ASSISTANT_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_USER_MESSAGE_LENGTH,
} from "@/lib/chat";

const INVALID_REQUEST_MESSAGE =
  "ごめんね、そのメッセージはうまく受け取れなかったみたい…もう一度送ってくれる？";
const ERROR_MESSAGE =
  "ごめんね、ちょっと調子が悪いみたい…少し待ってからもう一度話しかけてね！";
const REFUSAL_MESSAGE =
  "ごめんね、その話はちょっとむずかしいかも…別のお話をしようよ！";

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// 不正な入力なら null を返す。余分なフィールドは API に渡さない。
function parseMessages(body: unknown): Anthropic.MessageParam[] | null {
  if (typeof body !== "object" || body === null || !("messages" in body)) {
    return null;
  }
  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const parsed: Anthropic.MessageParam[] = [];
  for (const message of messages) {
    if (typeof message !== "object" || message === null) return null;
    const { role, content } = message;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.trim() === "") return null;
    const maxLength =
      role === "user" ? MAX_USER_MESSAGE_LENGTH : MAX_ASSISTANT_MESSAGE_LENGTH;
    if (content.length > maxLength) return null;
    parsed.push({ role, content });
  }
  if (parsed[parsed.length - 1].role !== "user") return null;

  // API は先頭が user の会話しか受け付けないので、切り詰めた後の先頭の assistant は落とす
  const history = parsed.slice(-MAX_HISTORY_MESSAGES);
  const firstUser = history.findIndex((message) => message.role === "user");
  return history.slice(firstUser);
}

// 内部エラーはサーバーログにのみ出す。会話内容や秘密情報は出さない。
function logError(context: string, error: unknown): void {
  if (error instanceof Anthropic.APIError) {
    console.error(context, {
      name: error.name,
      status: error.status,
      requestId: error.requestID,
    });
  } else if (error instanceof Error) {
    console.error(context, { name: error.name, message: error.message });
  } else {
    console.error(context, "不明なエラー");
  }
}

function toTextStream(
  events: Stream<Anthropic.RawMessageStreamEvent>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let hasText = false;
      let stopReason: Anthropic.StopReason | null = null;
      try {
        for await (const event of events) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            hasText = true;
            controller.enqueue(encoder.encode(event.delta.text));
          } else if (event.type === "message_delta") {
            stopReason = event.delta.stop_reason;
          }
        }
        if (stopReason === "refusal") {
          controller.enqueue(
            encoder.encode(hasText ? `\n\n${REFUSAL_MESSAGE}` : REFUSAL_MESSAGE),
          );
        } else if (!hasText) {
          console.error("返答のテキストが空でした", { stopReason });
          controller.enqueue(encoder.encode(ERROR_MESSAGE));
        }
      } catch (error) {
        // 接続が切られて中断した場合は、もう何も送れない
        if (events.controller.signal.aborted) return;
        logError("返答のストリーミング中にエラーが発生しました", error);
        controller.enqueue(
          encoder.encode(hasText ? `\n\n${ERROR_MESSAGE}` : ERROR_MESSAGE),
        );
      }
      controller.close();
    },
    cancel() {
      events.controller.abort();
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return textResponse(INVALID_REQUEST_MESSAGE, 400);
  }

  const messages = parseMessages(body);
  if (!messages) return textResponse(INVALID_REQUEST_MESSAGE, 400);

  try {
    // 接続時のエラー（認証、レート制限など）はここで投げられるので、エラーのステータスを返せる
    const events = await createChatStream(messages, request.signal);
    return new Response(toTextStream(events), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logError("Claude API の呼び出しに失敗しました", error);
    return textResponse(ERROR_MESSAGE, 500);
  }
}
