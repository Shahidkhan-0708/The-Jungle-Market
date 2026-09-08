// Smoke test for the AI input pipeline logic in app.js (browser-free).
// Covers: voice transcript -> product JSON extraction, price/dimension
// parsing, voice-search query parsing, and the canvas-fallback material
// classifier. Run: node test/pipeline-smoke-test.js
//
// Browser-only paths (MediaRecorder capture, Web Speech API, OpenCV.js WASM,
// GrabCut) need a real browser + mic; they are checked statically, see
// docs in the final report.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dataJs = fs.readFileSync(path.join(root, "data.js"), "utf8");
const appJs = fs.readFileSync(path.join(root, "app.js"), "utf8");

// Minimal browser stubs so app.js parses and loads outside a browser.
function makeCanvasStub(r, g, b) {
  const S = 64;
  const px = new Uint8ClampedArray(S * S * 4);
  for (let i = 0; i < px.length; i += 4) {
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  }
  return {
    width: 0, height: 0, style: {},
    getContext() {
      return {
        drawImage() {},
        getImageData(_x, _y, w, h) { return { data: px, width: w, height: h }; },
        putImageData() {}
      };
    }
  };
}

const documentStub = {
  addEventListener() {},
  getElementById() { return null; },
  querySelectorAll() { return []; },
  createElement() { return makeCanvasStub(184, 134, 11); }, // brass-toned
  body: { appendChild() {} }
};

const factory = new Function(
  "document", "navigator", "console", "setTimeout", "clearTimeout",
  dataJs + "\n" + appJs + "\n" + `
return {
  state,
  extractProductFromSpeech,
  extractPrice,
  extractDimensions,
  parseVoiceSearchQuery,
  materialFromColorSignals,
  canvasPhotoAnalysis,
  applyVoiceExtraction
};`
);
const api = factory(documentStub, {}, console, setTimeout, clearTimeout);

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log("  PASS  " + name); }
  else { failed++; console.log("  FAIL  " + name + (detail ? "  -> " + detail : "")); }
}
function section(title) { console.log("\n== " + title + " =="); }

// ── 1. Voice transcript → structured product JSON ──
section("Voice extraction (Hinglish transcript)");
const info1 = api.extractProductFromSpeech(
  "Yeh ek dokra murti hai pital ki, do feet lambi, 4000 rupaye, decoration ke liye"
);
check("material detected", info1.material === "Brass (Bell Metal)", info1.material);
check("craft type detected", info1.category_type === "Statue", info1.category_type);
check("usage detected", info1.usage === "Decoration", info1.usage);
check("price extracted = 4000", info1.price_mentioned === 4000, String(info1.price_mentioned));
check("dimensions extracted = 2 ft", info1.dimensions === "2 ft", info1.dimensions);
check("handmade flag off (no keywords)", info1.handmade === false, String(info1.handmade));
check("confidence auto-publish tier (>=90)", info1.confidence >= 90, String(info1.confidence));
check("product name composed", info1.product_name === "Handmade Brass Statue", info1.product_name);

section("Voice extraction (Devanagari transcript)");
const info2 = api.extractProductFromSpeech("बांस की टोकरी सब्जी के लिए, 400 रुपए");
check("material = Bamboo", info2.material === "Bamboo", info2.material);
check("type = Basket", info2.category_type === "Basket", info2.category_type);
check("usage = Vegetable storage", info2.usage === "Vegetable storage", info2.usage);
check("price = 400", info2.price_mentioned === 400, String(info2.price_mentioned));
check("Devanagari language detected", /Hindi/.test(info2.language_detected), info2.language_detected);

section("Voice extraction (noise / empty input)");
const info3 = api.extractProductFromSpeech("asdf qwerty zzz");
check("no fields found", info3.fields_found.length === 0, JSON.stringify(info3.fields_found));
check("low confidence fallback = 25", info3.confidence === 25, String(info3.confidence));
const info4 = api.extractProductFromSpeech("");
check("empty transcript safe", info4.confidence === 25 && info4.material === null);

// ── 2. Price & dimension parsers (edge cases) ──
section("Price parser");
check("rupee symbol", api.extractPrice("₹450 only") === 450);
check("Indian comma format", api.extractPrice("1,50,000 rupees") === 150000);
check("number before word", api.extractPrice("bechunga 750 rupaye me") === 750);
check("rejects < 20", api.extractPrice("10 rupaye") === null);
check("rejects nonsense", api.extractPrice("koi price nahi") === null);

section("Dimension parser");
check("decimal feet", api.extractDimensions("2.5 feet lamba") === "2.5 ft");
check("word number + inch", api.extractDimensions("teen inch ka") === "3 in");
check("multi-part", api.extractDimensions("2 feet by 1 foot wide") === "2 ft × 1 ft");
check("Devanagari unit", api.extractDimensions("2 फीट") === "2 ft");
check("no dims", api.extractDimensions("sundar hai") === null);

// ── 3. Voice search query parsing (buyer side) ──
section("Voice search query parsing");
const q1 = api.parseVoiceSearchQuery("Bastar bell metal dokra deer under 4000 rupees");
check("budget cap 4000", q1.maxPrice === 4000, JSON.stringify(q1));
check("category = Dokra Bell Metal", q1.category === "Dokra Bell Metal", q1.category);
const q2 = api.parseVoiceSearchQuery("bamboo tokri 500 se kam");
check("hindi budget pattern", q2.maxPrice === 500, JSON.stringify(q2));
check("hindi category", q2.category === "Bamboo and Cane", q2.category);
const q3 = api.parseVoiceSearchQuery("namaste didi");
check("no budget", q3.maxPrice === null);
check("no category", q3.category === null);

// ── 4. Material classifier (color-signal engine, OpenCV fallback path) ──
section("Material classifier (color signals)");
const brass = api.materialFromColorSignals(43, 0.89, 0.72, 0.05, "#b8860b");
check("golden metallic -> Brass", brass.material === "Brass (Bell Metal)", brass.material);
check("brass confidence 82", brass.confidence === 82, String(brass.confidence));
const iron = api.materialFromColorSignals(210, 0.08, 0.25, 0.03, "#3a3a3a");
check("low-sat dark -> Wrought Iron", iron.material === "Wrought Iron", iron.material);
const pale = api.materialFromColorSignals(40, 0.2, 0.6, 0.2, "#c8b48a");
check("tan mid-sat -> Bamboo", pale.material === "Bamboo", pale.material);

section("Canvas fallback image analysis (full path)");
const sig = api.canvasPhotoAnalysis({ width: 640, height: 480 });
check("engine tag = canvas-fallback", sig.engine === "canvas-fallback", sig.engine);
check("brass pixels -> Brass (Bell Metal)", sig.material === "Brass (Bell Metal)", sig.material);
check("signals shape", typeof sig.signals.mean_hue_deg === "number"
  && typeof sig.signals.edge_density === "number");

// ── 5. Integration: voice -> workflow form merge + cross-modal confidence ──
section("Integration: applyVoiceExtraction merges into sell workflow");
const w = api.state.sellWorkflow;
w.voiceTranscript = "haath se banaya dokra murti, pital ki, do feet, 4000 rupaye, pooja ke liye";
w.photoAnalysis = null;
api.applyVoiceExtraction();
check("title auto-filled", w.title === "Handmade Brass Statue", w.title);
check("materials auto-filled", w.materials === "Brass (Bell Metal)", w.materials);
check("category mapped to ONDC cat", w.categoryId === "cat_dokra", w.categoryId);
check("price fields derived (floor 72%)", w.costFloor === Math.round(4000 * 0.72), String(w.costFloor));
const c1 = w.confidenceScore;

w.photoAnalysis = { material: "brass" }; // same material from photo
api.applyVoiceExtraction();
check("cross-modal agreement lifts confidence", w.confidenceScore > c1,
  c1 + " -> " + w.confidenceScore);

// ── Summary ──
console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
