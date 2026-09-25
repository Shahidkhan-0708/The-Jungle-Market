import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const colabBaseUrl = (process.env.COLAB_ML_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
    const colabApiKey = process.env.COLAB_ML_API_KEY || "";
    const timeoutMs = parseInt(process.env.COLAB_ML_TIMEOUT_SECONDS || "25", 10) * 1000;

    // Try Remote Colab / Local ML Server First
    try {
      const mlFormData = new FormData();
      mlFormData.append("file", file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const headers: Record<string, string> = {
        "ngrok-skip-browser-warning": "true",
      };
      if (colabApiKey) {
        headers["X-ML-API-Key"] = colabApiKey;
      }

      const mlResponse = await fetch(`${colabBaseUrl}/ml/rembg`, {
        method: "POST",
        headers,
        body: mlFormData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (mlResponse.ok) {
        const contentType = mlResponse.headers.get("content-type") || "";

        // Handle Colab JSON response: { clean_bytes_base64: "...", scrubbed_b64: "..." }
        if (contentType.includes("application/json")) {
          const json = await mlResponse.json();
          const base64Data = json.clean_bytes_base64 || json.scrubbed_b64;
          if (base64Data) {
            const buffer = Buffer.from(base64Data, "base64");
            console.log("Successfully removed background using Colab ML model (JSON base64).");
            return new NextResponse(buffer, {
              headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          }
        }

        // Handle raw binary image response
        const imageBuffer = await mlResponse.arrayBuffer();
        console.log("Successfully removed background using ML model (raw binary).");
        return new NextResponse(imageBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
      throw new Error(`ML server returned status ${mlResponse.status}`);
    } catch (e) {
      console.warn("ML rembg failed or timed out:", e instanceof Error ? e.message : e);
      return NextResponse.json({ error: "ML server unavailable" }, { status: 503 });
    }
  } catch (error) {
    console.error("rembg API error:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
