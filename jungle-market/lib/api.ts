export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000")).replace(/\/$/, "");

export type ProcessingProgress = { imageId?:string; audioId?:string; processedImageId?:string };

/** Save originals before inference so retrying never requires another recording. */
export async function submitProductAppraisal(imageFile:File, audioFile:File|null, sourceLanguage:string,
    token:string, consent:boolean, progress:ProcessingProgress = {}) {
    if (!token) throw new Error("Sign in before processing your photo or recording. Your selected files are still here.");
    if (!consent) throw new Error("Allow photo and audio processing before continuing.");
    const {request} = await import("./workflow");
    const {uploadMedia} = await import("./workflow");
    const upload=(kind:"image"|"audio",file:File)=>uploadMedia(file,kind,token);
    if (!progress.imageId) progress.imageId=(await upload("image",imageFile)).id;
    if (audioFile&&!progress.audioId) progress.audioId=(await upload("audio",audioFile)).id;
    if (!progress.processedImageId) progress.processedImageId=(await request<{id:string}>(
        "/v1/media/"+progress.imageId+"/remove-background",token,{method:"POST"})).id;
    let transcript="",translation="";
    if (progress.audioId) {
        const body=new FormData();body.append("source_language",sourceLanguage);
        transcript=(await request<{transcript:string}>("/v1/media/"+progress.audioId+"/transcribe",token,{method:"POST",body})).transcript;
        translation=(await request<{translated_text:string}>("/v1/media/"+progress.audioId+"/translate",token,{method:"POST",body})).translated_text;
    }
    return {imageId:progress.processedImageId,audioId:progress.audioId,transcript,translation};
}

export type TranslationResult = {
  original_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  status: "translated" | "review_required";
  used_in_listing: boolean;
};

export async function translateVoiceStory(text: string, sourceLanguage: string, targetLanguage = "en") {
  const response = await fetch(`${API_URL}/v1/voice/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source_language: sourceLanguage, target_language: targetLanguage }),
  });
  if (!response.ok) throw new Error("Translation could not be completed");
  return response.json() as Promise<TranslationResult>;
}

export async function postFeature<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

// ✅ NEW: Fetches dynamic cross-sectional statistics from the SQLite cloud ledger
export async function fetchPlatformAnalytics() {
  // Use your core active ngrok tunnel base address
  const ANALYTICS_URL = API_URL + "/v1/reports/impact";
  
  try {
    const response = await fetch(ANALYTICS_URL, { method: "GET" });
    if (!response.ok) throw new Error(`Analytics server error status ${response.status}`);
    return await response.json() as Record<string, unknown>;
  } catch (error) {
    console.error("❌ Failed to fetch platform metrics matrix:", error);
    return null;
  }
}
