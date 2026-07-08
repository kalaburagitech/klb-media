import { NextRequest, NextResponse } from "next/server";
import { getR2Object } from "@/lib/r2-server";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");

  if (!key || key.includes("..") || key.startsWith("/")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    const object = await getR2Object(key);

    if (!object.Body) {
      return NextResponse.json({ error: "Empty object" }, { status: 404 });
    }

    const contentType = object.ContentType ?? "application/octet-stream";
    const body = object.Body.transformToWebStream();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(object.ETag ? { ETag: object.ETag } : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
