import Image from "next/image";
import type { ReactNode } from "react";

type Props = {
  role: "user" | "assistant";
  children: ReactNode;
};

// ハイクちゃんは左（アイコン付き）、ユーザーは右に表示する
export default function MessageBubble({ role, children }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-chat-user px-3 py-2 wrap-anywhere whitespace-pre-wrap text-ink">
          {children}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <Image
        src="/haiku-chan.svg"
        alt="ハイクちゃん"
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-full"
      />
      <p className="max-w-[75%] rounded-2xl rounded-tl-sm bg-chat-haiku px-3 py-2 wrap-anywhere whitespace-pre-wrap text-ink">
        {children}
      </p>
    </div>
  );
}
