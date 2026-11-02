import Image from "next/image";
import type { ReactNode } from "react";

import type { Sticker } from "@/lib/stickers";

type Props = {
  role: "user" | "assistant";
  children?: ReactNode;
  sticker?: Sticker | null;
};

function StickerImage({ sticker }: { sticker: Sticker }) {
  return (
    <Image
      src={sticker.src}
      alt={`スタンプ: ${sticker.label}`}
      width={112}
      height={140}
      className="h-35 w-28"
    />
  );
}

// ハイクちゃんは左（アイコン付き）、ユーザーは右に表示する。スタンプは吹き出しなしで大きく出す。
export default function MessageBubble({ role, children, sticker }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        {sticker ? (
          <StickerImage sticker={sticker} />
        ) : (
          <p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-chat-user px-3 py-2 wrap-anywhere whitespace-pre-wrap text-ink">
            {children}
          </p>
        )}
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
      <div className="flex max-w-[75%] flex-col items-start gap-2">
        {children && (
          <p className="rounded-2xl rounded-tl-sm bg-chat-haiku px-3 py-2 wrap-anywhere whitespace-pre-wrap text-ink">
            {children}
          </p>
        )}
        {sticker && <StickerImage sticker={sticker} />}
      </div>
    </div>
  );
}
