import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies browser uploads to R2 presigned URLs server-side.
 * Avoids R2 bucket CORS requirements during local/LAN development.
 */
export async function POST(request: NextRequest) {
  const uploadUrl = request.headers.get("x-upload-url");
  const contentType =
    request.headers.get("content-type") || "application/octet-stream";

  if (!uploadUrl) {
    return NextResponse.json({ error: "Missing x-upload-url header" }, { status: 400 });
  }

  try {
    const body = await request.arrayBuffer();

    const r2Response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });

    if (!r2Response.ok) {
      const detail = await r2Response.text();
      return NextResponse.json(
        { error: "R2 upload failed", status: r2Response.status, detail },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload proxy failed",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Upload-Url",
    },
  });
}
