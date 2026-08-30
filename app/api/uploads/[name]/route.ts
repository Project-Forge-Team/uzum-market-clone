import { NextResponse } from "next/server";
import { readUpload } from "@/lib/server/actions";

/** Отдаём файлы, загруженные пользователями (лежат вне public/, чтобы не попадать в git). */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ name: string }> },
) {
  const { name } = await ctx.params;
  const file = readUpload(decodeURIComponent(name));
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
