import { connection } from "next/server";

import { getOrCreateAnonId } from "@/lib/anonId";
import { getRemainingQuota, logQuotaError } from "@/lib/rateLimit";

export async function GET(request: Request): Promise<Response> {
  // ビルド時に事前レンダリングさせず、リクエストごとに実行する
  await connection();

  try {
    const anonId = await getOrCreateAnonId();
    const remaining = await getRemainingQuota(anonId, request);
    return Response.json(
      { remaining },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logQuotaError(error);
    return new Response(null, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
