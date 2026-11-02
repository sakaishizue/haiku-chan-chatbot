import {
  MAX_ASSISTANT_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_USER_MESSAGE_LENGTH,
} from "@/lib/chat";
import type { ChatMessage } from "@/lib/chat";

// 不正な入力なら null を返す。余分なフィールドは API に渡さない。
export function parseMessages(body: unknown): ChatMessage[] | null {
  if (typeof body !== "object" || body === null || !("messages" in body)) {
    return null;
  }
  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  // 画面は直近 20 往復に切り詰めて送るので、これより多いものは正規の入力ではない
  if (messages.length > MAX_HISTORY_MESSAGES) return null;

  const parsed: ChatMessage[] = [];
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
  const firstUser = parsed.findIndex((message) => message.role === "user");
  return parsed.slice(firstUser);
}
