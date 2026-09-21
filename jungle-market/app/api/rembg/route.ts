import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Try Local ML Server First
    try {
      const mlFormData = new FormData();
      mlFormData.append("file", file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for local ML
      
      const localResponse = await fetch("http://127.0.0.1:8001/ml/rembg", {
        method: "POST",
        body: mlFormData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (localResponse.ok) {
        const imageBuffer = await localResponse.arrayBuffer();
        console.log("Successfully removed background using Local ML model.");
        return new NextResponse(imageBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable"
          }
        });
      }
      throw new Error(`Local ML failed with status ${localResponse.status}`);
    } catch (e) {
      console.warn("Local ML rembg failed or timed out.", e instanceof Error ? e.message : e);
      return NextResponse.json({ error: "Local ML server failed" }, { status: 503 });
    }
  } catch (error) {
    console.error("rembg API error:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
