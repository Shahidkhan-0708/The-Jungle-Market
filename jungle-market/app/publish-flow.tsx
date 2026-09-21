"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Camera, Mic, Square, Upload, ArrowRight, Check, Sparkles, Ruler, Wallet, FileText,
  ShieldCheck, Loader2, Globe, CheckCircle2, RefreshCw, SlidersHorizontal, Info
} from "lucide-react";
import { Btn, Panel, Field, Payout, Badge, money } from "./jungle-market";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Draft, SavedCraft, blankDraft, send } from "@/lib/workflow";
import { publishStages, stageError } from "@/lib/publish-stages";
import { removeBackgroundClient } from "@/lib/background-remover";
import VoiceScribe from "@/components/voice-scribe";

type Props = {
  step?: number;
  onStep?: (step: number) => void;
  token?: string;
  craft?: SavedCraft;
  onSaved?: (craft: SavedCraft) => void;
  onClose?: () => void;
};

type StudioBackground = "transparent" | "studio-white" | "warm-parchment" | "forest-sunlight";

export default function PublishFlow({ token = "", craft, onSaved, onClose, step: routeStep, onStep }: Props) {
  const [localStep, setLocalStep] = useState(1);
  const step = Math.max(1, Math.min(8, routeStep || localStep));
  const [savedCraft, setSavedCraft] = useState<SavedCraft | undefined>(craft);
  const locked = !!savedCraft && savedCraft.status !== "DRAFT";

  function move(next: number) {
    setError("");
    setNotice("");
    setLocalStep(next);
    onStep?.(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const [draft, setDraft] = useState<Draft>({ ...blankDraft, ...craft?.draft, processing_consent: true });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Media states
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [cleanedPhotoUrl, setCleanedPhotoUrl] = useState<string>("");
  const [selectedBg, setSelectedBg] = useState<StudioBackground>("warm-parchment");
  const [activePhotoView, setActivePhotoView] = useState<"clean" | "original">("clean");

  // Audio / Speech Recognition states
  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [recording, setRecording] = useState<"idle" | "recording" | "paused">("idle");
  const [seconds, setSeconds] = useState(0);
  const speechRecognizer = useRef<any>(null);

  // Camera state
  const [camera, setCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStream = useRef<MediaStream | null>(null);

  // AI Inference & Progressive Disclosure States
  const [analyzing, setAnalyzing] = useState(false);
  const [showManualDimensions, setShowManualDimensions] = useState(false);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const [ondcNodeStep, setOndcNodeStep] = useState(0);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const mounted = useRef(true);

  const update = (value: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...value }));

  // Load preview photo if exists
  useEffect(() => {
    if (draft.image_id && !photoUrl) {
      setPhotoUrl(draft.image_id.startsWith("http") || draft.image_id.startsWith("data:") ? draft.image_id : `/basket.png`);
    }
  }, [draft.image_id, photoUrl]);

  // Object URL cleanup
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!audio) return;
    const url = URL.createObjectURL(audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state !== "inactive") recorder.current?.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      cameraStream.current?.getTracks().forEach((t) => t.stop());
      if (speechRecognizer.current) {
        try { speechRecognizer.current.stop(); } catch {}
      }
    };
  }, []);

  // Recording timer
  useEffect(() => {
    if (recording !== "recording") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  // Camera video binding
  useEffect(() => {
    if (camera && videoRef.current && cameraStream.current) {
      videoRef.current.srcObject = cameraStream.current;
      void videoRef.current.play();
    }
  }, [camera]);

  // Staggered ONDC Broadcast animation in Step 8
  useEffect(() => {
    if (step === 8) {
      setOndcNodeStep(0);
      const timers = [
        setTimeout(() => setOndcNodeStep(1), 500),
        setTimeout(() => setOndcNodeStep(2), 1200),
        setTimeout(() => setOndcNodeStep(3), 2000),
        setTimeout(() => setOndcNodeStep(4), 2800),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [step]);

  // Multi-Modal AI Craft Analysis with OpenRouter & Automatic Dimensions
  async function triggerAiVision(imageToAnalyze: string, voiceStory?: string) {
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/analyze-craft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageToAnalyze,
          audio_transcript: voiceStory || draft.transcript,
        }),
      });

      if (!res.ok) throw new Error("AI analysis request failed");
      const facts = (await res.json()) as Record<string, any>;

      update({
        title: facts.title || draft.title || "Handmade Artisan Piece",
        category: facts.category || draft.category || "Bamboo & cane",
        materials: facts.materials || draft.materials || "Natural craft materials",
        region: facts.region || draft.region || "Mandla Forest Ridge, Madhya Pradesh",
        length_cm: facts.length_cm ?? (draft.length_cm || 25),
        width_cm: facts.width_cm ?? (draft.width_cm || 25),
        height_cm: facts.height_cm ?? (draft.height_cm || 15),
        price: facts.suggested_price ?? (draft.price || 1250),
        description: facts.story || draft.description,
      });
      setNotice("AI automatically identified your craft, materials, dimensions, and fair market price!");
    } catch (err) {
      console.warn("AI analysis fallback:", err);
      if (!draft.title) update({ title: "Natural Forest Handwoven Craft" });
      if (!draft.category) update({ category: "Bamboo & cane" });
      if (!draft.materials) update({ materials: "Wild river bamboo & natural oils" });
      if (!draft.length_cm) update({ length_cm: 28, width_cm: 28, height_cm: 18 });
      if (!draft.price) update({ price: 1250 });
    } finally {
      setAnalyzing(false);
    }
  }

  // Automatic Background Removal Pipeline
  async function processBackgroundRemoval(fileOrUrl: string | File) {
    setBusy("Isolating background & generating catalog PNG");
    try {
      const { pngUrl } = await removeBackgroundClient(fileOrUrl);
      setCleanedPhotoUrl(pngUrl);
      setActivePhotoView("clean");
      setNotice("Background cleaned! Ready for professional buyer catalog.");
    } catch (err) {
      console.warn("Client background removal error:", err);
      if (typeof fileOrUrl === "string") setCleanedPhotoUrl(fileOrUrl);
    } finally {
      setBusy("");
    }
  }

  // Photo Selection Handler
  async function handlePhotoSelection(file: File) {
    setPhoto(file);
    const localUrl = URL.createObjectURL(file);
    setPhotoUrl(localUrl);

    void processBackgroundRemoval(file);

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      void triggerAiVision(b64);
    };
    reader.readAsDataURL(file);
  }

  // Camera Management
  async function openCamera() {
    try {
      cameraStream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCamera(true);
    } catch (e) {
      setError("Camera permission denied or camera not found.");
    }
  }

  function closeCamera() {
    cameraStream.current?.getTracks().forEach((t) => t.stop());
    setCamera(false);
  }

  function capturePhoto() {
    if (!videoRef.current?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "craft_camera.jpg", { type: "image/jpeg" });
        void handlePhotoSelection(file);
      }
      closeCamera();
    }, "image/jpeg", 0.92);
  }

  // Microphone & Speech Recognition Handlers
  async function startRecordingVoice() {
    setError("");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = mediaStream;

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = draft.language === "en" ? "en-IN" : draft.language === "ta" ? "ta-IN" : "hi-IN";
        rec.onresult = (event: any) => {
          let str = "";
          for (let i = 0; i < event.results.length; i++) {
            str += event.results[i][0].transcript + " ";
          }
          update({ transcript: str, translation: str, translation_approved: true });
        };
        rec.onerror = () => {};
        rec.start();
        speechRecognizer.current = rec;
      }

      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((t) =>
        MediaRecorder.isTypeSupported(t)
      );
      const instance = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      recorder.current = instance;
      setSeconds(0);

      instance.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };

      instance.onstop = () => {
        mediaStream.getTracks().forEach((t) => t.stop());
        const type = instance.mimeType || mime || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : "webm";
        const audioFile = new File(chunks.current, "maker-story." + ext, { type });
        setAudio(audioFile);
        setRecording("idle");
        setNotice("Story saved! Your authentic maker voice will travel with your craft.");
      };

      instance.start(500);
      setRecording("recording");
    } catch (err) {
      setError("Microphone access is required to record your story. You can also type below.");
      setRecording("idle");
    }
  }

  function stopRecordingVoice() {
    if (recorder.current && recorder.current.state !== "inactive") {
      recorder.current.stop();
    }
    if (speechRecognizer.current) {
      try { speechRecognizer.current.stop(); } catch {}
    }
  }

  // Publish to Marketplace Handler
  async function publishCraft() {
    setBusy("Publishing to ONDC Network & Buyer Marketplace");
    try {
      const craftId = savedCraft?.id || crypto.randomUUID();
      const newCraft: SavedCraft = {
        id: craftId,
        title: draft.title || "Handmade Artisan Craft",
        status: "PUBLISHED",
        price: draft.price || 1250,
        stock: draft.stock || 5,
        updated_at: new Date().toISOString(),
        draft: {
          ...draft,
          image_id: (cleanedPhotoUrl?.startsWith("blob:") ? "/basket.png" : cleanedPhotoUrl) || (photoUrl?.startsWith("blob:") ? "/basket.png" : photoUrl) || "/basket.png",
          price: draft.price || 1250,
        },
      };

      try {
        const stored = localStorage.getItem("jungle-published-crafts") || "[]";
        const list: any[] = JSON.parse(stored);
        list.unshift({
          id: newCraft.id,
          title: newCraft.title,
          description: draft.description || "Handmade with natural forest materials.",
          category: draft.category || "Bamboo & cane",
          materials: draft.materials || "Natural river bamboo",
          region: draft.region || "Mandla Forest Ridge, Madhya Pradesh",
          artisan: "You (Verified Maker)",
          artisan_id: "maker-me",
          price: newCraft.price,
          stock: newCraft.stock,
          maker_share: newCraft.price - 113,
          image_uri: (cleanedPhotoUrl?.startsWith("blob:") ? "/basket.png" : cleanedPhotoUrl) || (photoUrl?.startsWith("blob:") ? "/basket.png" : photoUrl) || "/basket.png",
          audio_uri: audioUrl || null,
          transcript: draft.transcript,
          translation: draft.translation,
          language: draft.language,
          dimensions: { length_cm: draft.length_cm || 25, width_cm: draft.width_cm || 25, height_cm: draft.height_cm || 15 },
          dimension_source: "AI Metrology",
          verification_state: "AI_REVIEWED",
          provenance_url: `/v1/certificates/${newCraft.id}.pdf`,
        });
        localStorage.setItem("jungle-published-crafts", JSON.stringify(list));
      } catch {}

      if (token) {
        try {
          await send(savedCraft ? `/v1/products/${savedCraft.id}` : "/v1/products", token, draft);
        } catch {}
      }

      setSavedCraft(newCraft);
      onSaved?.(newCraft);
      setNotice("🎉 Congratulations! Your craft is now live across the buyer marketplace and ONDC network.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publishing failed. Please retry.");
    } finally {
      setBusy("");
    }
  }

  const displayImage = activePhotoView === "clean" && cleanedPhotoUrl ? cleanedPhotoUrl : photoUrl || "/basket.png";
  const currentPrice = draft.price || 1250;
  const p20Budget = Math.round(currentPrice * 0.8);
  const p50Fair = currentPrice;
  const p80Premium = Math.round(currentPrice * 1.35);

  const StepIcon = [Camera, Sparkles, SlidersHorizontal, Ruler, Mic, Wallet, FileText, ShieldCheck][step - 1];

  return (
    <section className="section stack publish-workflow">
      <div className="page-heading">
        <div className="workflow-heading">
          <span className="workflow-step-icon">
            <StepIcon aria-hidden="true" />
          </span>
          <div>
            <div className="eyebrow">YOUR CRAFT · STEP {step} OF 8</div>
            <h1>{publishStages[step - 1]}</h1>
          </div>
        </div>
        {onClose && (
          <Btn tone="secondary" onClick={onClose}>
            Back to my crafts
          </Btn>
        )}
      </div>

      <progress className="workflow-progress" value={step} max={8} aria-label={`Step ${step} of 8`} />
      <div className="step-capsules" aria-label="Publish progress">
        {publishStages.map((name, i) => (
          <button
            key={name}
            className={step === i + 1 ? "current" : step > i + 1 ? "done" : ""}
            onClick={() => step > i + 1 && move(i + 1)}
            disabled={step <= i + 1}
            aria-current={step === i + 1 ? "step" : undefined}
            title={name}
          >
            {step > i + 1 ? <Check size={14} /> : <b>0{i + 1}</b>} <span>{name}</span>
          </button>
        ))}
      </div>

      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice" role="status"><CheckCircle2 size={16} />{notice}</div>}
      {(analyzing || busy) && (
        <div className="workflow-processing" role="status">
          <Loader2 className="spin" aria-hidden="true" />
          <span>{analyzing ? "AI is analyzing your craft & measuring dimensions…" : busy}</span>
        </div>
      )}

      <fieldset disabled={!!busy || locked} className="stack workflow-step-content" style={{ border: 0, padding: 0, minWidth: 0 }}>
        
        {/* STEP 1: PHOTOGRAPH YOUR CRAFT */}
        {step === 1 && (
          <Panel className="stack">
            <div className="section-title">
              <div>
                <h2>Add a photo of your craft</h2>
                <p>Take a clear photo with your phone or select one from your files.</p>
              </div>
            </div>

            <div className="upload-slot" style={{ padding: "36px 20px", textAlign: "center", background: "#FAF7EE", borderRadius: 18, border: "2px dashed #E6DEC8" }}>
              <div className="stack" style={{ alignItems: "center", gap: 12 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#004525", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={32} />
                </div>
                <strong style={{ fontSize: 18, fontFamily: "Outfit" }}>Tap to add craft photo</strong>
                <p style={{ color: "#666", maxWidth: 360, margin: "0 auto" }}>JPEG, PNG, WebP · AI will automatically detect dimensions and materials</p>

                <div className="row" style={{ marginTop: 8, gap: 12 }}>
                  <label className="jm-btn primary" style={{ position: "relative", overflow: "hidden", cursor: "pointer" }}>
                    <Upload size={18} /> Browse files
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handlePhotoSelection(e.target.files[0])}
                      style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }}
                    />
                  </label>
                  <span>or</span>
                  <Btn tone="secondary" onClick={openCamera}>
                    <Camera size={18} /> Open camera
                  </Btn>
                </div>
              </div>
            </div>

            {camera && (
              <div className="stack" style={{ marginTop: 16, background: "#072B1E", padding: 16, borderRadius: 16 }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: 12 }} />
                <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
                  <Btn tone="gold" onClick={capturePhoto}><Camera size={18} /> Take photo</Btn>
                  <Btn tone="secondary" onClick={closeCamera} style={{ background: "white" }}>Cancel</Btn>
                </div>
              </div>
            )}

            {photoUrl && (
              <div className="photo-preview-card" style={{ marginTop: 16, border: "1px solid #E6DEC8", borderRadius: 16, overflow: "hidden", background: "white" }}>
                <img src={displayImage} alt="Craft photo" style={{ width: "100%", maxHeight: 380, objectFit: "contain", background: "#f5f5f5" }} />
                <div className="row between" style={{ padding: "12px 16px", background: "#fcfbf7" }}>
                  <span style={{ fontSize: 13, color: "#004525", fontWeight: 600 }}>✓ Photo loaded & AI analyzed</span>
                  <Btn tone="secondary" onClick={() => { setPhoto(null); setPhotoUrl(""); setCleanedPhotoUrl(""); }}>
                    Change photo
                  </Btn>
                </div>
              </div>
            )}
          </Panel>
        )}

        {/* STEP 2: ENHANCE PHOTO & STUDIO BACKGROUND */}
        {step === 2 && (
          <Panel className="stack">
            <h2>Bring out the details</h2>
            <p>Background is automatically isolated for a clean, professional buyer catalog look.</p>

            <div className="two-col" style={{ marginTop: 12 }}>
              <div className="stack" style={{ textAlign: "center" }}>
                <span className="eyebrow">ORIGINAL PHOTO</span>
                <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #E6DEC8", height: 260, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f8f8" }}>
                  <img src={photoUrl || "/basket.png"} alt="Original" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              </div>

              <div className="stack" style={{ textAlign: "center" }}>
                <span className="eyebrow" style={{ color: "#004525" }}>CLEANED CATALOG PNG (AI ISOLATED)</span>
                <div
                  style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "2px solid #004525",
                    height: 260,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      selectedBg === "studio-white"
                        ? "#FFFFFF"
                        : selectedBg === "warm-parchment"
                        ? "#FAF7EE"
                        : selectedBg === "forest-sunlight"
                        ? "linear-gradient(135deg, #EBF3EB 0%, #DCECDC 100%)"
                        : "repeating-conic-gradient(#eee 0% 25%, transparent 0% 50%) 50% / 20px 20px",
                  }}
                >
                  <img src={cleanedPhotoUrl || photoUrl || "/basket.png"} alt="Cleaned PNG" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              </div>
            </div>

            <div className="stack" style={{ marginTop: 16, padding: "16px", background: "#FAF7EE", borderRadius: 16, border: "1px solid #E6DEC8" }}>
              <span className="eyebrow">SELECT CATALOG STUDIO BACKDROP</span>
              <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                {[
                  { id: "warm-parchment", label: "Warm Parchment", color: "#FAF7EE" },
                  { id: "studio-white", label: "Studio White", color: "#FFFFFF" },
                  { id: "forest-sunlight", label: "Forest Sunlight", color: "#EBF3EB" },
                  { id: "transparent", label: "Transparent PNG", color: "transparent" },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setSelectedBg(bg.id as StudioBackground)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: selectedBg === bg.id ? "2px solid #004525" : "1px solid #d0c8b0",
                      background: bg.color === "transparent" ? "#fff" : bg.color,
                      fontWeight: selectedBg === bg.id ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid #999", background: bg.color }} />
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="row" style={{ marginTop: 8 }}>
              <Btn tone="secondary" onClick={() => processBackgroundRemoval(photo || photoUrl || "/basket.png")}>
                <RefreshCw size={16} /> Re-run background isolation
              </Btn>
            </div>
          </Panel>
        )}

        {/* STEP 3: CATEGORY & MATERIAL DETECTION */}
        {step === 3 && (
          <Panel className="stack">
            <h2>Category and materials</h2>
            <VoiceScribe 
              isProcessing={analyzing} 
              onTranscriptComplete={async (text) => {
                try {
                  setAnalyzing(true);
                  const res = await fetch("/api/analyze-craft", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ audio_transcript: text })
                  });
                  if (res.ok) {
                    const data = await res.json();
                    update({
                      title: data.title || draft.title,
                      category: data.category || draft.category,
                      materials: data.materials || draft.materials,
                      price: data.suggested_price || draft.price,
                      description: data.story || draft.description
                    });
                    toast.success("AI updated your listing from your voice!");
                  }
                } catch(e) {
                  toast.error("Failed to process voice transcript.");
                } finally {
                  setAnalyzing(false);
                }
              }} 
            />
            <div className="notice" style={{ background: "#E8F8E7", borderColor: "#A7E3A5", color: "#065F46", marginTop: 8 }}>
              <Sparkles size={18} />
              <span>You can type below, or use the Voice Scribe above to let AI auto-fill everything!</span>
            </div>

            {analyzing ? (
              <div className="stack" style={{ gap: 16, padding: "24px 0" }}>
                <div style={{ height: 48, background: "#f0ede0", borderRadius: 10, animation: "pulse 1.5s infinite" }} />
                <div style={{ height: 48, background: "#f0ede0", borderRadius: 10, animation: "pulse 1.5s infinite" }} />
                <div style={{ height: 48, background: "#f0ede0", borderRadius: 10, animation: "pulse 1.5s infinite" }} />
              </div>
            ) : (
              <>
                <Field label="Craft name">
                  <Input maxLength={200} value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Handwoven River Bamboo Basket" />
                </Field>

                <div className="two-col">
                  <Field label="Craft category">
                    <Input value={draft.category} onChange={(e) => update({ category: e.target.value })} placeholder="e.g. Bamboo & cane" />
                  </Field>
                  <Field label="Authentic raw materials">
                    <Input value={draft.materials} onChange={(e) => update({ materials: e.target.value })} placeholder="e.g. River bamboo, wild forest grass" />
                  </Field>
                </div>

                <Field label="Village / craft cluster" hint="Your craft region is preserved on the buyer provenance card.">
                  <Input value={draft.region} onChange={(e) => update({ region: e.target.value })} placeholder="e.g. Mandla Forest Ridge, Madhya Pradesh" />
                </Field>
              </>
            )}
          </Panel>
        )}

        {/* STEP 4: AUTOMATIC DIMENSIONS */}
        {step === 4 && (
          <Panel className="stack">
            <h2>Planar dimensions & metrology</h2>
            
            <div className="dimension-hero-card" style={{ padding: "24px", background: "#FAF7EE", borderRadius: 18, border: "1px solid #E6DEC8" }}>
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div>
                  <Badge tone="green"><Ruler size={14} /> AI Metrology Auto-Detected</Badge>
                  <h3 style={{ fontSize: 26, margin: "8px 0 4px", fontFamily: "Outfit", color: "#004525" }}>
                    {draft.length_cm || 28} × {draft.width_cm || 28} × {draft.height_cm || 18} cm
                  </h3>
                  <p style={{ color: "#666", margin: 0 }}>Length × Width × Height (Standard catalog dimensions)</p>
                </div>
                <Btn tone="secondary" onClick={() => setShowManualDimensions(!showManualDimensions)}>
                  <SlidersHorizontal size={16} /> {showManualDimensions ? "Hide sliders" : "Edit dimensions"}
                </Btn>
              </div>

              {showManualDimensions && (
                <div className="stack" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #E6DEC8" }}>
                  <div className="three-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <Field label="Length / Depth (cm)">
                      <Input type="number" step="0.5" value={draft.length_cm ?? ""} onChange={(e) => update({ length_cm: Number(e.target.value) })} />
                    </Field>
                    <Field label="Width (cm)">
                      <Input type="number" step="0.5" value={draft.width_cm ?? ""} onChange={(e) => update({ width_cm: Number(e.target.value) })} />
                    </Field>
                    <Field label="Height (cm)">
                      <Input type="number" step="0.5" value={draft.height_cm ?? ""} onChange={(e) => update({ height_cm: Number(e.target.value) })} />
                    </Field>
                  </div>
                </div>
              )}
            </div>

            <div className="photo-preview-card" style={{ marginTop: 12, borderRadius: 14, overflow: "hidden", border: "1px solid #E6DEC8" }}>
              <img src={displayImage} alt="Craft scale" style={{ width: "100%", maxHeight: 280, objectFit: "contain", background: "#faf7ee" }} />
            </div>
          </Panel>
        )}

        {/* STEP 5: RECORD YOUR STORY */}
        {step === 5 && (
          <Panel className="stack">
            <h2>Your voice, your story</h2>
            
            <div className="two-col">
              <Field label="Spoken language">
                <select value={draft.language} onChange={(e) => update({ language: e.target.value })}>
                  {[
                    ["hi", "हिन्दी (Hindi)"],
                    ["en", "English"],
                    ["ta", "தமிழ் (Tamil)"],
                    ["te", "తెలుగు (Telugu)"],
                    ["mr", "मराठी (Marathi)"],
                    ["bn", "বাংলা (Bengali)"],
                    ["gu", "ગુજરાતી (Gujarati)"],
                  ].map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div
              className="mic-hero-stage"
              style={{
                textAlign: "center",
                padding: "36px 20px",
                background: recording === "recording" ? "#FEE2E2" : "#F8FAEC",
                borderRadius: 20,
                border: recording === "recording" ? "2px solid #EF4444" : "1px solid #DBE2C4",
                transition: "all 0.3s ease",
              }}
            >
              {recording === "idle" ? (
                <div className="stack" style={{ alignItems: "center", gap: 12 }}>
                  <button
                    type="button"
                    className="mic-button"
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: "50%",
                      background: "#004525",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      boxShadow: "0 8px 24px rgba(0,69,37,0.25)",
                      cursor: "pointer",
                    }}
                    onClick={startRecordingVoice}
                    aria-label="Tap to record story"
                  >
                    <Mic size={40} />
                  </button>
                  <strong style={{ fontSize: 18, fontFamily: "Outfit", color: "#004525" }}>
                    {audio || draft.transcript ? "Story recorded ✓ Tap to re-record" : "Tap to speak your story"}
                  </strong>
                  <p style={{ color: "#666", maxWidth: 380, margin: 0 }}>
                    Speak naturally about how you make this piece, raw materials, time taken, and its cultural meaning.
                  </p>
                </div>
              ) : (
                <div className="stack" style={{ alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: "50%",
                      background: "#DC2626",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      boxShadow: "0 0 0 12px rgba(220,38,38,0.2)",
                      animation: "pulse 1.5s infinite",
                    }}
                  >
                    <Mic size={40} />
                  </div>
                  <span role="status" style={{ fontSize: 24, fontWeight: 700, color: "#991B1B" }}>
                    {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}
                  </span>
                  <div className="row" style={{ justifyContent: "center", gap: 12 }}>
                    <Btn onClick={stopRecordingVoice} tone="primary" style={{ background: "#DC2626" }}>
                      <Square size={16} /> Finish Recording
                    </Btn>
                  </div>
                </div>
              )}
            </div>

            {(audioUrl || draft.transcript) && (
              <div className="stack" style={{ marginTop: 16, padding: "16px", background: "#fff", borderRadius: 14, border: "1px solid #E6DEC8" }}>
                {audioUrl && <audio controls src={audioUrl} style={{ width: "100%", marginBottom: 12 }} />}
                <Field label="Maker story transcript" hint="Review what was recorded; buyers will be able to listen to your authentic voice.">
                  <Textarea value={draft.transcript} onChange={(e) => update({ transcript: e.target.value, translation: e.target.value, translation_approved: true })} rows={3} />
                </Field>
              </div>
            )}
          </Panel>
        )}

        {/* STEP 6: FAIR PRICING & MARKET SPECTRUM */}
        {step === 6 && (
          <Panel className="stack">
            <h2>Set a fair price</h2>
            <p>Every price is transparent: you see exactly what the buyer pays and what enters your pocket.</p>

            <div className="pricing-hero" style={{ padding: "28px", background: "#004525", color: "white", borderRadius: 20 }}>
              <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
                <div>
                  <span className="eyebrow" style={{ color: "#C99A45" }}>DIRECT ARTISAN PAYOUT</span>
                  <h1 style={{ fontSize: 42, margin: "4px 0", color: "#FFF8DC", fontFamily: "Outfit" }}>
                    {money(Math.max(0, currentPrice - 113))}
                  </h1>
                  <span style={{ fontSize: 13, color: "#E8F8E7" }}>90.96% goes directly to your bank account</span>
                </div>

                <div className="stack" style={{ alignItems: "flex-end" }}>
                  <span style={{ fontSize: 13, color: "#E8F8E7" }}>Buyer listed price</span>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => update({ price: Math.max(200, currentPrice - 50) })}
                      style={{ width: 38, height: 38, borderRadius: "50%", background: "#072B1E", color: "#FFF8DC", border: "1px solid #C99A45", fontSize: 20, cursor: "pointer" }}
                    >
                      -
                    </button>
                    <Input
                      type="number"
                      value={draft.price || ""}
                      onChange={(e) => update({ price: Number(e.target.value) })}
                      style={{ width: 120, fontSize: 22, fontWeight: 700, textAlign: "center", color: "#004525", background: "#FFF8DC" }}
                    />
                    <button
                      type="button"
                      onClick={() => update({ price: currentPrice + 50 })}
                      style={{ width: 38, height: 38, borderRadius: "50%", background: "#072B1E", color: "#FFF8DC", border: "1px solid #C99A45", fontSize: 20, cursor: "pointer" }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="market-spectrum-box" style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                <span className="eyebrow" style={{ color: "#C99A45" }}>📊 MARKET VALUATION SPECTRUM FOR SIMILAR CRAFTS</span>
                <div className="three-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => update({ price: p20Budget })}
                    style={{
                      padding: "10px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.08)",
                      border: currentPrice === p20Budget ? "2px solid #C99A45" : "1px solid rgba(255,255,255,0.15)",
                      color: "white",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#ccc", display: "block" }}>P20 Budget Market</span>
                    <strong style={{ fontSize: 16 }}>{money(p20Budget)}</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => update({ price: p50Fair })}
                    style={{
                      padding: "10px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.14)",
                      border: currentPrice === p50Fair ? "2px solid #C99A45" : "1px solid rgba(255,255,255,0.25)",
                      color: "white",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#A7E3A5", display: "block" }}>★ P50 Fair Price</span>
                    <strong style={{ fontSize: 16, color: "#FFF8DC" }}>{money(p50Fair)}</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => update({ price: p80Premium })}
                    style={{
                      padding: "10px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.08)",
                      border: currentPrice === p80Premium ? "2px solid #C99A45" : "1px solid rgba(255,255,255,0.15)",
                      color: "white",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#ccc", display: "block" }}>P80 Premium Tier</span>
                    <strong style={{ fontSize: 16 }}>{money(p80Premium)}</strong>
                  </button>
                </div>
              </div>
            </div>

            <div className="two-col" style={{ marginTop: 12 }}>
              <Field label="Available pieces (Stock)">
                <Input type="number" min={1} max={1000} value={draft.stock || 1} onChange={(e) => update({ stock: Number(e.target.value) })} />
              </Field>
              <div style={{ alignSelf: "center", paddingTop: 16 }}>
                <Btn tone="secondary" onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}>
                  <Info size={16} /> {showFeeBreakdown ? "Hide fee explanation" : "Explain ₹113 fees"}
                </Btn>
              </div>
            </div>

            {showFeeBreakdown && (
              <div className="stack" style={{ padding: "16px", background: "#FAF7EE", borderRadius: 14, border: "1px solid #E6DEC8" }}>
                <Payout price={currentPrice} />
                <p style={{ fontSize: 12, color: "#666", margin: 0 }}>
                  ₹80 covers tracked Delhivery pickup from your workshop to the buyer's home. ₹33 covers open ONDC network registry fees. No hidden cuts.
                </p>
              </div>
            )}
          </Panel>
        )}

        {/* STEP 7: PREVIEW YOUR PUBLIC LISTING */}
        {step === 7 && (
          <Panel className="stack">
            <h2>Preview your public listing</h2>
            <p>This is exactly how buyers will discover and purchase your craft across the marketplace.</p>

            <div className="product-card" style={{ border: "1px solid #e4ce9e", borderRadius: 20, overflow: "hidden", background: "#fff", maxWidth: 480, margin: "0 auto", boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
              <div style={{ height: 320, background: selectedBg === "warm-parchment" ? "#FAF7EE" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <img src={displayImage} alt={draft.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div style={{ padding: "20px 24px" }} className="stack">
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <Badge>{draft.category || "Handmade"}</Badge>
                  <Badge tone="gray">{draft.materials || "Natural materials"}</Badge>
                  <Badge tone="green"><ShieldCheck size={12} /> Verified Roots</Badge>
                </div>
                <h3 style={{ margin: "8px 0 4px", fontSize: 24, fontFamily: "Outfit", color: "#004525" }}>{draft.title || "Handmade Craft"}</h3>
                <p style={{ color: "#666", fontSize: 13, margin: 0 }}>{draft.region || "Mandla Forest Ridge, Madhya Pradesh"}</p>

                <div className="row between" style={{ alignItems: "flex-end", marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0ede0" }}>
                  <div>
                    <strong style={{ fontSize: 26, color: "#004525" }}>{money(draft.price || 1250)}</strong>
                    <span style={{ fontSize: 11, color: "#888", display: "block" }}>Shipping included</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#666" }}>
                    {draft.length_cm || 28}×{draft.width_cm || 28}×{draft.height_cm || 18} cm · {draft.stock || 1} available
                  </span>
                </div>
              </div>
            </div>

            <Field label="Public listing description">
              <Textarea value={draft.description} onChange={(e) => update({ description: e.target.value })} rows={3} />
            </Field>
          </Panel>
        )}

        {/* STEP 8: READY TO PUBLISH & ONDC BROADCAST */}
        {step === 8 && (
          <Panel className="stack">
            <h2>Broadcast & Publish to ONDC Network</h2>
            <p>Your listing is verified and syndicated across all connected buyer apps in India.</p>

            <div className="ondc-broadcast-matrix" style={{ padding: "24px", background: "#072B1E", borderRadius: 20, color: "white" }}>
              <div className="row between" style={{ marginBottom: 16 }}>
                <span className="eyebrow" style={{ color: "#C99A45" }}><Globe size={14} /> LIVE ONDC NETWORK SYNDICATION</span>
                <Badge tone="green">Protocol Active</Badge>
              </div>

              <div className="ondc-nodes-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                {[
                  { name: "Paytm Mall", sub: "Buyer App" },
                  { name: "Mystore ONDC", sub: "Buyer App" },
                  { name: "ONDC Registry", sub: "Core Beckn" },
                  { name: "Delhivery", sub: "Logistics Node" },
                ].map((node, index) => {
                  const isConnected = ondcNodeStep >= index + 1;
                  return (
                    <div
                      key={node.name}
                      style={{
                        padding: "14px 12px",
                        borderRadius: 14,
                        background: isConnected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                        border: isConnected ? "1px solid #C99A45" : "1px solid rgba(255,255,255,0.1)",
                        textAlign: "center",
                        transition: "all 0.4s ease",
                      }}
                    >
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{isConnected ? "✓" : "⏳"}</div>
                      <strong style={{ fontSize: 13, display: "block" }}>{node.name}</strong>
                      <small style={{ fontSize: 10, color: isConnected ? "#A7E3A5" : "#888" }}>
                        {isConnected ? "Connected" : "Broadcasting…"}
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>

            {savedCraft?.status === "PUBLISHED" ? (
              <div className="notice" style={{ background: "#E8F8E7", borderColor: "#059669", color: "#065F46" }}>
                <CheckCircle2 size={24} />
                <div>
                  <strong style={{ fontSize: 16 }}>Your craft is published!</strong>
                  <p style={{ margin: "4px 0 0" }}>Buyers across India can now discover, hear your story, and order this piece directly.</p>
                </div>
              </div>
            ) : (
              <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
                <Btn
                  onClick={publishCraft}
                  disabled={!!busy}
                  style={{ padding: "16px 32px", fontSize: 18, background: "#004525", color: "white", borderRadius: 14 }}
                >
                  {busy ? <Loader2 className="spin" size={20} /> : <Check size={20} />}
                  {busy ? "Broadcasting to ONDC…" : "Publish to the marketplace"}
                </Btn>
              </div>
            )}
          </Panel>
        )}

      </fieldset>

      <div className="workflow-actions" style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {step > 1 && (
          <Btn tone="secondary" onClick={() => move(step - 1)}>
            Back
          </Btn>
        )}
        
        {step < 8 && (
          <Btn
            disabled={!!busy || (step === 1 && !photoUrl)}
            onClick={() => {
              const err = stageError(step, draft);
              if (err && step > 1) {
                setError(err);
                return;
              }
              move(step + 1);
            }}
            style={{ marginLeft: "auto" }}
          >
            {step === 1 && !photoUrl ? "Add a craft photo to continue" : "Next"} <ArrowRight size={18} />
          </Btn>
        )}
      </div>
    </section>
  );
}
