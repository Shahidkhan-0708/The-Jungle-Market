// Jungle Market — craft extraction engine (React Native port).
// Same keyword engine as the web app: raw speech text (any script)
// becomes structured product JSON. Pure logic, no browser APIs.
// Simple English rules: short sentences, active voice, no contractions.

const EXTRACT_MATERIALS = [
  { match: ["bamboo", "baans", "bans", "बांस", "बाँस", "cane", "बेंत"], value: "Bamboo" },
  { match: ["brass", "pital", "peetal", "पीतल", "bell metal", "bellmetal", "dokra", "dhokra", "ढोकरा", "धोकरा", "loomal"], value: "Brass (Bell Metal)" },
  { match: ["iron", "loha", "लोहा", "wrought"], value: "Wrought Iron" },
  { match: ["clay", "mitti", "मिट्टी", "terracotta", "earthen"], value: "Terracotta Clay" },
  { match: ["wood", "lakdi", "लकड़ी", "timber", "सागवान"], value: "Wood" },
  { match: ["jute", "जूट", "gunny"], value: "Jute" },
  { match: ["cotton", "सूती", "suti", "handloom", "saree", "साड़ी"], value: "Cotton (Handloom)" },
  { match: ["stone", "patthar", "पत्थर", "granite"], value: "Stone" },
  { match: ["leather", "chamda", "चमड़ा", "hide"], value: "Leather" },
  { match: ["beeswax", "मोम", "wax"], value: "Beeswax" }
];

const EXTRACT_TYPES = [
  { match: ["basket", "tokri", "टोकरी", "टोकनी", "tokna"], value: "Basket" },
  { match: ["statue", "murti", "मूर्ति", "मूर्ती", "idol", "vigrah"], value: "Statue" },
  { match: ["lamp", "diya", "दीया", "दीपक", "deepak"], value: "Lamp" },
  { match: ["pot", "ghada", "घड़ा", "handi", "kulhad", "कुल्हड़"], value: "Pot" },
  { match: ["bell", "ghanti", "घंटी"], value: "Bell" },
  { match: ["mat", "chatai", "चटाई", "चट्टाई"], value: "Mat" },
  { match: ["wall art", "wall piece", "wall hanging"], value: "Wall Art" },
  { match: ["jewellery", "jewelry", "gehna", "गहना", "necklace", "earring"], value: "Jewellery" },
  { match: ["mask", "mukhota", "मुखौटा"], value: "Mask" },
  { match: ["drum", "dhol", "ढोल", "mandar", "tabla"], value: "Drum" },
  { match: ["flute", "bansuri", "बांसुरी"], value: "Flute" },
  { match: ["box", "dabba", "डिब्बा", "casket"], value: "Box" },
  { match: ["bowl", "katori", "कटोरी"], value: "Bowl" },
  { match: ["cloth", "fabric", "kapda", "कपड़ा", "shawl"], value: "Cloth" }
];

const EXTRACT_USAGE = [
  { match: ["vegetable", "sabzi", "सब्जी"], value: "Vegetable storage" },
  { match: ["grain", "anaaj", "अनाज", "दाना"], value: "Grain storage" },
  { match: ["storage", "storing", "rakhne", "रखने"], value: "Storage" },
  { match: ["gift", "tohfa", "तोहफा"], value: "Gifting" },
  { match: ["decoration", "decor", "sajavati", "सजावट", "showpiece"], value: "Decoration" },
  { match: ["pooja", "puja", "पूजा", "worship", "prayer", "मंदिर"], value: "Worship / Pooja" },
  { match: ["wear", "pehnne", "पहनने"], value: "Wearing" },
  { match: ["serving", "parosna"], value: "Food serving" },
  { match: ["water", "paani", "पानी"], value: "Water carrying" }
];

const EXTRACT_NUMBER_WORDS = {
  "one": 1, "ek": 1, "एक": 1, "two": 2, "do": 2, "दो": 2,
  "three": 3, "teen": 3, "तीन": 3, "four": 4, "char": 4, "चार": 4,
  "five": 5, "paanch": 5, "panch": 5, "पांच": 5, "six": 6, "chhe": 6, "छह": 6,
  "seven": 7, "saat": 7, "सात": 7, "eight": 8, "aath": 8, "आठ": 8,
  "nine": 9, "nau": 9, "नौ": 9, "ten": 10, "das": 10, "दस": 10,
  "fifteen": 15, "twenty": 20, "bees": 20, "बीस": 20, "fifty": 50,
  "hundred": 100, "sau": 100, "सौ": 100
};

export function extractDimensions(rawText) {
  const t = (rawText || "").toLowerCase();
  if (!t) return null;
  const unitPattern = "(?:feet|foot|ft|inch|inches|cm|centimeter|centimetre|meter|meters|फीट|इंच|सेंटीमीटर|सेमी|मीटर|हाथ)";
  const wordNums = Object.keys(EXTRACT_NUMBER_WORDS).filter((k) => /[^0-9]/.test(k)).join("|");
  const re = new RegExp("(\\d+(?:\\.\\d+)?|" + wordNums + ")\\s*(" + unitPattern + ")", "g");
  const conv = { feet: "ft", foot: "ft", ft: "ft", inch: "in", inches: "in", cm: "cm", centimeter: "cm", centimetre: "cm", meter: "m", meters: "m", "फीट": "ft", "इंच": "in", "सेंटीमीटर": "cm", "सेमी": "cm", "मीटर": "m", "हाथ": "haath" };
  const parts = [];
  let m;
  while ((m = re.exec(t)) !== null && parts.length < 3) {
    let num = EXTRACT_NUMBER_WORDS[m[1]] !== undefined ? EXTRACT_NUMBER_WORDS[m[1]] : parseFloat(m[1]);
    if (isNaN(num) || num <= 0 || num > 200) continue;
    parts.push(num + " " + conv[m[2]]);
  }
  return parts.length ? parts.join(" × ") : null;
}

export function extractPrice(rawText) {
  const t = (rawText || "").toLowerCase().replace(/,/g, "");
  const patterns = [
    /(?:₹|rs\.?|rupees|rupaye|रुपये|रुपए)\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(?:₹|rs\.?\b|rupees|rupaye|रुपये|रुपए)/
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) {
      const v = Math.round(parseFloat(m[1]));
      if (v >= 20 && v <= 500000) return v;
    }
  }
  return null;
}

export function extractProductFromSpeech(rawText) {
  const t = " " + (rawText || "").toLowerCase() + " ";
  const findFirst = (list) => {
    for (const item of list) {
      for (const kw of item.match) {
        if (t.includes(kw.toLowerCase())) return item.value;
      }
    }
    return null;
  };

  const material = findFirst(EXTRACT_MATERIALS);
  const craftType = findFirst(EXTRACT_TYPES);
  const usage = findFirst(EXTRACT_USAGE);
  const dimensions = extractDimensions(rawText);
  const price = extractPrice(rawText);

  const found = [];
  if (material) found.push("material");
  if (craftType) found.push("product_type");
  if (usage) found.push("usage");
  if (dimensions) found.push("dimensions");
  if (price !== null) found.push("price");

  const handmade = /hand|haath|हाथ|हस्त|tribal|ghar/.test(t);
  if (handmade && rawText) found.push("handmade");

  const isDevanagari = /[\u0900-\u097F]/.test(rawText || "");
  const language = isDevanagari ? "Hindi (Devanagari script)" : "English / Hinglish (Roman script)";

  let productName = null;
  if (material && craftType) productName = "Handmade " + material.replace(/ \(.*\)/, "") + " " + craftType;
  else if (craftType) productName = "Handmade " + craftType;
  else if (material) productName = "Handmade " + material.replace(/ \(.*\)/, "") + " Craft";

  // Confidence: 35 base, +18 material, +18 type, +14 dimensions, +10 price, +8 usage (cap 96)
  let confidence = 35;
  if (material) confidence += 18;
  if (craftType) confidence += 18;
  if (dimensions) confidence += 14;
  if (price !== null) confidence += 10;
  if (usage) confidence += 8;
  confidence = Math.min(96, confidence);
  if (found.length === 0) confidence = 25;

  return {
    source: "voice_transcript",
    language_detected: language,
    product_name: productName,
    material: material,
    category_type: craftType,
    usage: usage,
    dimensions: dimensions,
    price_mentioned: price,
    handmade: handmade,
    confidence: confidence,
    fields_found: found
  };
}

export const CATEGORY_BY_MATERIAL = {
  "Bamboo": { id: "cat_bamboo", name: "Bamboo and Cane" },
  "Brass (Bell Metal)": { id: "cat_dokra", name: "Dokra Bell Metal" },
  "Wrought Iron": { id: "cat_wrought_iron", name: "Bastar Wrought Iron" },
  "Terracotta Clay": { id: "cat_terracotta", name: "Terracotta Clay" },
  "Cotton (Handloom)": { id: "cat_textiles", name: "Tribal Handloom" }
};
