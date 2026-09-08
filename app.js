// Jungle Market Platform - Production Core & Event-Driven Engine
// Plain English ASD-STE100 Compliance & Watermelon UI Structural Integration

// ==========================================
// 1. EVENT BUS & ARCHITECTURE SERVICES
// ==========================================
class EventBus {
  constructor() {
    this.listeners = {};
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

const eventBus = new EventBus();

// Application State
const state = {
  currentRole: 'artisan', // 'artisan' | 'buyer' | 'ambassador'
  currentScreen: 'artisan_dashboard',
  selectedCategory: null,
  selectedProduct: JUNGLE_DATA.products[0],
  selectedArtisan: JUNGLE_DATA.artisans[0],
  selectedVerificationItem: JUNGLE_DATA.ambassador.verificationQueue[0],
  selectedOrder: JUNGLE_DATA.orders[0],
  
  isPlayingSpotlightAudio: false,
  isPlayingProductLoreAudio: false,
  
  cart: [
    {
      product: JUNGLE_DATA.products[0],
      quantity: 1
    }
  ],

  // 11-Step Guided Selling Workflow State
  sellWorkflow: {
    currentStep: 1,
    voiceRecorded: true,
    voiceTranscript: "Hamare dada-pardada yeh bell metal casting karte the. Har ek murti me Bastar ke jangal ka aashirwaad hota hai.",
    // --- Voice pipeline (Phase 1) ---
    voiceLanguage: "hi-IN",
    voiceLangLabel: "Hindi",
    voiceInterim: "",
    voiceAudioSize: 0,          // captured audio bytes (sent to Whisper STT in production)
    speechSupported: (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)),
    extractedInfo: null,        // structured product JSON produced from the transcript
    // --- Photo pipeline (Phase 2) ---
    photos: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCx1r4CbATRCwMBfEzAV4aknoQ3V_bj1qUIskjG77mFlN_NpJIdG8oYrz6_rjk0DgJGKgyV1j1lMbWwZV8m4YPgPcx1hIOXsOJo4hfgdrgv-zIDHNDzvU2anCrSoLONftAgVNxYb7LmB8Y0StbheZaRmTonL42VjzbAEFH-_T11AadLKv4WFCNt7wazRzA28A2le_feJ-emstTfYZtASKET4Co43UBBAqbei4ZBeEKJfTk3TW_5846m"
    ],
    aiEnhancementDone: true,
    comparePosition: 50,
    enhancedPhoto: null,        // OpenCV-processed image dataURL for the before/after view
    cutoutPhoto: null,          // GrabCut background-removal preview dataURL
    photoAnalysis: null,        // { material, confidence, dominantColor, edgeDensity } from OpenCV
    title: "Ancestral Dokra Elephant with Bell Rider",
    category: "Dokra Bell Metal",
    categoryId: "cat_dokra",
    materials: "Recycled Brass Alloy, Wild Beeswax, River Clay",
    dimensions: "22cm x 16cm x 7cm",
    weight: "1.85 kg",
    storyText: "Ramesh Baghel made this brass sculpture in his Kondagaon workshop. He wound beeswax threads to form the elephant trunk and tribal rider.",
    suggestedPrice: 4600,
    userPrice: 4600,
    costFloor: 3400,
    marketMin: 4400,
    marketMax: 4900,
    confidenceScore: 94,
    giCertified: true,
    publishedOndcId: "ONDC-BAP-CG-DOKRA-8831"
  },

  searchQuery: "",
  activeFilter: "all",
  isVoiceRecording: false,
  isSellVoiceRecording: false,

  // Voice search (buyer sheet) pipeline state
  voiceSearchLangCode: "hi-IN",
  voiceSearchLangLabel: "Gondi and Halbi",
  voiceSearchTranscript: "",
  voiceSearchInterim: "",
  voiceSearchMaxPrice: null,
  voiceSearchCategory: null,
  viewportMode: 'mobile',

  // AI Input Pipeline status
  // cvReady: OpenCV.js (WASM) engine loaded and callable
  cvReady: false,
  cvLoadFailed: false,
  cvBusy: false,
  chatMessages: [
    { sender: 'ai', text: 'Hello! I am your Jungle Market Assistant. I can help you find handmade tribal crafts, check direct artisan payouts, or submit bulk B2B requests.' }
  ]
};

// ==========================================
// 2. ORDER SYNCHRONIZATION LISTENERS
// ==========================================
eventBus.on('order_created', (newOrder) => {
  JUNGLE_DATA.orders.unshift(newOrder);
  JUNGLE_DATA.currentUser.totalEarnings += newOrder.artisanPayout;
  JUNGLE_DATA.currentUser.pendingPayout += newOrder.artisanPayout;
  JUNGLE_DATA.currentUser.activeOrdersCount += 1;
  
  // Add notification
  JUNGLE_DATA.notifications.unshift({
    id: `notif_${Date.now()}`,
    type: "order",
    title: "New order received on ONDC",
    message: `${newOrder.buyerName} in ${newOrder.buyerCity} placed order ${newOrder.id}.`,
    amount: `₹${newOrder.artisanPayout} direct payout`,
    time: "Just now",
    unread: true,
    actionScreen: "artisan_orders",
    actionLabel: "View Order"
  });

  showToast(`New order ${newOrder.id} received from buyer!`, "shopping_bag");
  updateHeaderAndNav();
  if (state.currentRole === 'artisan' && state.currentScreen === 'artisan_dashboard') {
    renderCurrentScreen();
  }
});

eventBus.on('order_status_updated', (order) => {
  showToast(`Order ${order.id} status updated to ${order.status}`, "local_shipping");
  if (state.currentScreen === 'artisan_orders' || state.currentScreen === 'buyer_orders') {
    renderCurrentScreen();
  }
});

// ==========================================
// 3. TOAST & NOTIFICATION HELPERS
// ==========================================
function showToast(message, icon = "check_circle") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[20px] text-on-primary-container">${icon}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ---------- Artisan story playback (Speech Synthesis) ----------
// Reads the voiceLore transcript aloud in the artisan's mother tongue.
// Visible stop state: the play pill flips to a Stop pill (secondary color,
// stop icon) and the waveform bars animate while speechSynthesis speaks.
function storyTextFor(type) {
  if (type === 'spotlight') {
    const a = state.selectedArtisan || (JUNGLE_DATA.artisans && JUNGLE_DATA.artisans[0]);
    return (a && (a.voiceTranscript || a.voiceLore)) || "";
  }
  const p = state.selectedProduct || (JUNGLE_DATA.products && JUNGLE_DATA.products[0]);
  return (p && p.voiceLore) || "";
}

function stopStoryPlayback() {
  const wasPlaying = state.isPlayingSpotlightAudio || state.isPlayingProductLoreAudio;
  state.isPlayingSpotlightAudio = false;
  state.isPlayingProductLoreAudio = false;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  return wasPlaying;
}

function pickStoryVoice() {
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    // Hinglish/Devanagari transcripts read best with a Hindi voice.
    return voices.find(v => (v.lang || "").toLowerCase().startsWith("hi"))
        || voices.find(v => (v.lang || "").toLowerCase().startsWith("en-in"))
        || null;
  } catch (e) { return null; }
}

function toggleAudioStory(type) {
  const synth = (typeof window !== 'undefined' && 'speechSynthesis' in window) ? window.speechSynthesis : null;
  const flagKey = type === 'spotlight' ? 'isPlayingSpotlightAudio' : 'isPlayingProductLoreAudio';

  if (!synth) {
    showToast("Audio playback is not supported in this browser", "volume_off");
    return;
  }

  // Visible stop state: a second tap on the pill stops playback.
  if (state[flagKey]) {
    stopStoryPlayback();
    showToast("Story playback stopped", "stop");
    renderCurrentScreen();
    return;
  }

  synth.cancel();
  state.isPlayingSpotlightAudio = false;
  state.isPlayingProductLoreAudio = false;

  const text = (storyTextFor(type) || "").trim();
  if (!text) {
    showToast("No story recording available for this craft", "info");
    renderCurrentScreen();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "hi-IN";
  const voice = pickStoryVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;

  utterance.onend = () => {
    if (!state[flagKey]) return; // ended via Stop — state already handled
    state[flagKey] = false;
    renderCurrentScreen();
  };
  utterance.onerror = () => {
    if (!state[flagKey]) return;
    state[flagKey] = false;
    showToast("Could not play the story recording", "error");
    renderCurrentScreen();
  };

  const who = type === 'spotlight'
    ? ((state.selectedArtisan || JUNGLE_DATA.artisans[0]) || {}).name
    : ((state.selectedProduct || JUNGLE_DATA.products[0]) || {}).artisanName;

  state[flagKey] = true;
  showToast("Playing voice recording from " + (who || "the artisan"), "volume_up");
  synth.speak(utterance);
  renderCurrentScreen();
}

function toggleActivityDetails(cardId) {
  const card = document.getElementById(cardId);
  card?.classList.toggle('expanded');
}



// 4. ROUTER & ROLE NAVIGATION
// ==========================================
function setRole(role) {
  state.currentRole = role;
  stopStoryPlayback();
  
  ['artisan', 'buyer', 'ambassador'].forEach(r => {
    const btn = document.getElementById(`role-btn-${r}`);
    if (btn) {
      if (r === role) {
        btn.className = "px-3 py-1.5 rounded-md transition-all font-medium text-xs bg-primary-container text-white flex items-center gap-1 shadow-sm";
      } else {
        btn.className = "px-3 py-1.5 rounded-md transition-all font-medium text-xs text-white/70 hover:text-white flex items-center gap-1";
      }
    }
  });

  if (role === 'artisan') {
    state.currentScreen = 'artisan_dashboard';
  } else if (role === 'buyer') {
    state.currentScreen = 'home';
  } else if (role === 'ambassador') {
    state.currentScreen = 'ambassador_dashboard';
  }

  updateHeaderAndNav();
  renderCurrentScreen();
  showToast(`Switched view to ${role.toUpperCase()}`, "manage_accounts");
}

function navigateTo(screenId, params = {}) {
  state.currentScreen = screenId;
  stopStoryPlayback();
  if (params.product) state.selectedProduct = params.product;
  if (params.category) state.selectedCategory = params.category;
  if (params.artisan) state.selectedArtisan = params.artisan;
  if (params.verificationItem) state.selectedVerificationItem = params.verificationItem;
  if (params.order) state.selectedOrder = params.order;

  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateHeaderAndNav();
  renderCurrentScreen();
}

function navigateHome() {
  if (state.currentRole === 'artisan') navigateTo('artisan_dashboard');
  else if (state.currentRole === 'buyer') navigateTo('home');
  else navigateTo('ambassador_dashboard');
}

function navigateSearch() {
  if (state.currentRole === 'buyer') navigateTo('categories');
  else navigateTo('artisan_orders');
}

function navigateToProfile() {
  if (state.currentRole === 'artisan') navigateTo('artisan_guild');
  else if (state.currentRole === 'buyer') navigateTo('buyer_profile');
  else navigateTo('ambassador_dashboard');
}

function navigateToNotifications() {
  navigateTo('notifications_screen');
}

function toggleViewportMode() {
  const wrapper = document.getElementById("app-wrapper");
  const label = document.getElementById("viewport-label");
  if (state.viewportMode === 'mobile') {
    state.viewportMode = 'full';
    wrapper.classList.add("fullscreen-mode");
    label.innerText = "Fluid Desktop";
    showToast("Switched to desktop layout", "desktop_windows");
  } else {
    state.viewportMode = 'mobile';
    wrapper.classList.remove("fullscreen-mode");
    label.innerText = "Mobile (390px)";
    showToast("Switched to 390px mobile layout", "smartphone");
  }
}

// ==========================================
// 5. MODALS & SHEETS LOGIC
// ==========================================
function openAuthModal() {
  document.getElementById("auth-modal")?.classList.add("active");
}
function closeAuthModal(e) {
  document.getElementById("auth-modal")?.classList.remove("active");
}
function loginWithVoice() {
  closeAuthModal();
  showToast("Voice matched: Ramesh Baghel (Kondagaon)", "verified");
  setRole('artisan');
}
function loginWithGoogle() {
  closeAuthModal();
  showToast("Signed in as Ramesh Baghel", "account_circle");
  setRole('artisan');
}
function loginWithPhone() {
  closeAuthModal();
  showToast("OTP verified successfully", "check_circle");
  setRole('artisan');
}

// ---------- Voice search sheet (buyer) — live speech recognition ----------
// Same pipeline as the artisan voice input: Web Speech API live transcript →
// query parsing (budget cap + craft category) → filtered buyer results.
// Gondi, Halbi and Chhattisgarhi have no dedicated STT model in the browser;
// they route through the Hindi model (Whisper covers them in production).
const VOICE_SEARCH_LANGUAGES = [
  { label: "Gondi and Halbi", code: "hi-IN" },
  { label: "Hindi (हिंदी)", code: "hi-IN" },
  { label: "Chhattisgarhi", code: "hi-IN" },
  { label: "English", code: "en-IN" }
];

const VOICE_SEARCH_CATEGORY_KEYWORDS = [
  { match: ["dokra", "brass", "bell metal", "पीतल", "ढोकरा", "धोकरा", "statue", "murti", "मूर्ति", "deer", "हिरण"], category: "Dokra Bell Metal" },
  { match: ["bamboo", "basket", "tokri", "टोकरी", "बांस", "बाँस", "cane", "grass", "घास"], category: "Bamboo and Cane" },
  { match: ["clay", "terracotta", "mitti", "मिट्टी", "pot", "ghada", "घड़ा", "kulhad", "diya", "दीया"], category: "Terracotta Clay" },
  { match: ["iron", "loha", "लोहा", "wrought", "blacksmith"], category: "Bastar Wrought Iron" },
  { match: ["saree", "cloth", "handloom", "cotton", "fabric", "साड़ी", "कपड़ा", "shawl"], category: "Tribal Handloom" }
];

let searchRecognition = null;

function openVoiceModal() {
  state.voiceSearchTranscript = "";
  state.voiceSearchInterim = "";
  document.getElementById("voice-sheet")?.classList.add("active");
  updateVoiceSearchTranscriptDOM();
}
function closeVoiceModal(e) {
  _stopSearchRecognition();
  document.getElementById("voice-sheet")?.classList.remove("active");
}

function setVoiceSearchLanguage(label) {
  const lang = VOICE_SEARCH_LANGUAGES.find(l => l.label === label) || VOICE_SEARCH_LANGUAGES[0];
  state.voiceSearchLangCode = lang.code;
  state.voiceSearchLangLabel = lang.label;
  document.querySelectorAll(".voice-lang-chip").forEach(btn => {
    const active = btn.getAttribute("data-lang") === lang.label;
    btn.className = "voice-lang-chip px-3.5 py-1.5 rounded-full font-medium " + (active ? "bg-primary text-white" : "bg-surface-container text-on-surface hover:bg-surface-container-high");
  });
  showToast("Voice language: " + lang.label, "translate");
}

function toggleVoiceRecording() {
  if (state.isVoiceRecording) stopSearchVoiceCapture();
  else startSearchVoiceCapture();
}

function startSearchVoiceCapture() {
  state.isVoiceRecording = true;
  state.voiceSearchTranscript = "";
  state.voiceSearchInterim = "";

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    searchRecognition = new SR();
    searchRecognition.lang = state.voiceSearchLangCode || "hi-IN";
    searchRecognition.continuous = true;
    searchRecognition.interimResults = true;
    let finalText = "";
    searchRecognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      state.voiceSearchTranscript = finalText.trim();
      state.voiceSearchInterim = interim.trim();
      updateVoiceSearchTranscriptDOM();
    };
    searchRecognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        showToast("Microphone blocked — check browser permissions", "mic_off");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        showToast("Speech engine: " + event.error, "error");
      }
    };
    searchRecognition.onend = () => {
      if (state.isVoiceRecording) { try { searchRecognition.start(); } catch (e) {} }
    };
    try { searchRecognition.start(); } catch (e) {}
    showToast("Listening in " + state.voiceSearchLangLabel + "...", "mic");
  } else {
    showToast("Voice search not supported here — try Chrome, or type in the AI chat", "keyboard");
  }

  document.getElementById("mic-pulse-ring")?.classList.add("recording-pulse");
  const icon = document.getElementById("voice-mic-icon");
  if (icon) icon.textContent = "stop";
  updateVoiceSearchTranscriptDOM();
}

function _stopSearchRecognition() {
  try { if (searchRecognition) searchRecognition.stop(); } catch (e) {}
  searchRecognition = null;
  state.isVoiceRecording = false;
  document.getElementById("mic-pulse-ring")?.classList.remove("recording-pulse");
  const icon = document.getElementById("voice-mic-icon");
  if (icon) icon.textContent = "mic";
}

function stopSearchVoiceCapture() {
  _stopSearchRecognition();
  state.voiceSearchInterim = "";
  if (state.voiceSearchTranscript) {
    const parsed = parseVoiceSearchQuery(state.voiceSearchTranscript);
    let understood = "Search heard: \u201C" + state.voiceSearchTranscript + "\u201D";
    const bits = [];
    if (parsed.maxPrice) bits.push("under ₹" + parsed.maxPrice.toLocaleString());
    if (parsed.category) bits.push(parsed.category);
    if (bits.length) understood += " → " + bits.join(" • ");
    showToast(understood, "graphic_eq");
  } else {
    showToast("No speech detected — tap the mic and try again", "mic_off");
  }
  updateVoiceSearchTranscriptDOM();
}

function updateVoiceSearchTranscriptDOM() {
  const el = document.getElementById("voice-transcript-text");
  if (!el) return;
  const fin = state.voiceSearchTranscript;
  const interim = state.voiceSearchInterim;
  if (!fin && !interim) {
    if (!state.isVoiceRecording) {
      el.innerHTML = 'Tap the mic and speak — for example "Bastar bell metal dokra deer under 4000 rupees..."';
      return;
    }
    el.innerHTML = '<span class="text-on-surface-variant">Listening... speak now (name a craft, material, or budget)</span>';
    return;
  }
  el.innerHTML = `${fin ? `<span class="text-on-surface">${fin} </span>` : ""}${interim ? `<span class="text-outline">${interim}</span>` : ""}`;
}

// "under 4000 rupees" / "4000 se kam" / "4000 तक" → budget cap;
// craft keywords → ONDC category match.
function parseVoiceSearchQuery(text) {
  const t = " " + (text || "").toLowerCase().replace(/,/g, " ") + " ";
  let maxPrice = null;
  const pats = [
    /(?:under|below|less than|upto|up to)\s*(?:₹|rs\.?)?\s*(\d[\d,]*)/,
    /(\d[\d,]*)\s*(?:₹|rs\.?|rupaye|रुपये|रुपए)?\s*(?:se\s*kam|tak|से\s*कम|तक)/
  ];
  for (const p of pats) {
    const m = t.match(p);
    if (m) {
      const v = parseInt(m[1].replace(/,/g, ""));
      if (!isNaN(v) && v >= 50 && v <= 500000) { maxPrice = v; break; }
    }
  }
  let category = null;
  for (const entry of VOICE_SEARCH_CATEGORY_KEYWORDS) {
    if (entry.match.some(k => t.includes(k))) { category = entry.category; break; }
  }
  state.voiceSearchMaxPrice = maxPrice;
  state.voiceSearchCategory = category;
  return { maxPrice, category };
}

function getFilteredBuyerProducts() {
  let list = JUNGLE_DATA.products;
  const q = (state.searchQuery || "").trim().toLowerCase();
  if (q) {
    const tokens = q.split(/\s+/).filter(t => t.length > 2);
    if (tokens.length) {
      const hits = list.filter(p => {
        const hay = `${p.title} ${p.category} ${p.materials || ""} ${p.artisanName || ""}`.toLowerCase();
        return tokens.some(tk => hay.includes(tk));
      });
      if (hits.length) list = hits;
    }
  }
  if (state.voiceSearchMaxPrice) {
    const inBudget = list.filter(p => p.price <= state.voiceSearchMaxPrice);
    if (inBudget.length) list = inBudget;
  }
  if (state.voiceSearchCategory) {
    const inCat = list.filter(p => p.category === state.voiceSearchCategory);
    if (inCat.length) list = inCat;
  }
  return list;
}

function clearVoiceSearch() {
  state.searchQuery = "";
  state.voiceSearchMaxPrice = null;
  state.voiceSearchCategory = null;
  showToast("Voice filter cleared", "filter_alt_off");
  renderCurrentScreen();
}

function applyVoiceSearch() {
  closeVoiceModal();
  const q = state.voiceSearchTranscript || "";
  if (q) {
    state.searchQuery = q;
    parseVoiceSearchQuery(q);
  }
  if (state.currentRole === 'buyer') {
    navigateTo('home');
    if (q) showToast(`Results for \u201C${q}\u201D`, "filter_alt");
  } else {
    // Artisan route: the spoken description feeds the selling draft
    if (q) {
      state.sellWorkflow.voiceTranscript = q;
      state.sellWorkflow.voiceRecorded = true;
      applyVoiceExtraction();
    }
    navigateTo('artisan_sell');
    showToast("Voice details added to craft draft", "mic");
  }
}

function openCartSheet() {
  renderCartSheet();
  document.getElementById("cart-sheet")?.classList.add("active");
}
function closeCartSheet(e) {
  document.getElementById("cart-sheet")?.classList.remove("active");
}

function toggleAIAssistantDrawer() {
  const drawer = document.getElementById("ai-assistant-drawer");
  drawer?.classList.toggle("active");
}
function closeAIAssistantDrawer(e) {
  document.getElementById("ai-assistant-drawer")?.classList.remove("active");
}

function openBulkModal() {
  document.getElementById("bulk-buying-modal")?.classList.add("active");
}
function closeBulkModal(e) {
  document.getElementById("bulk-buying-modal")?.classList.remove("active");
}

function submitBulkRequest() {
  const cat = document.getElementById("bulk-category-select")?.value;
  const qty = document.getElementById("bulk-quantity-input")?.value;
  const budget = document.getElementById("bulk-budget-input")?.value;
  const date = document.getElementById("bulk-date-input")?.value;
  const notes = document.getElementById("bulk-notes-input")?.value;

  const newReq = {
    id: `BULK-REQ-${Date.now().toString().slice(-4)}`,
    buyerOrg: "Verified Corporate Buyer",
    buyerContact: "Active Buyer",
    productCategory: cat === 'cat_dokra' ? 'Dokra Bell Metal' : 'Bamboo and Cane',
    targetQuantity: parseInt(qty) || 20,
    targetBudgetPerUnit: parseInt(budget) || 2500,
    requiredDeliveryDate: date || '2026-11-15',
    customRequirement: notes || 'Standard artisan pack with certificates.',
    status: "OPEN_FOR_QUOTES",
    responsesCount: 1
  };

  JUNGLE_DATA.bulkRequests.unshift(newReq);
  closeBulkModal();
  showToast("Bulk request sent to artisan guild!", "send");
  if (state.currentScreen === 'bulk_buying') renderCurrentScreen();
}

function sendChatMessage() {
  const input = document.getElementById("ai-chat-input");
  if (!input || !input.value.trim()) return;
  const query = input.value.trim();
  state.chatMessages.push({ sender: 'user', text: query });
  input.value = "";
  renderChatMessages();

  setTimeout(() => {
    let reply = "I found verified crafts in Bastar. Over 89% of your payment goes straight to the artisan bank account.";
    if (query.toLowerCase().includes("bulk") || query.toLowerCase().includes("b2b")) {
      reply = "For bulk orders over 10 pieces, you can submit an RFQ in the Bulk Buying section. Tribal guilds offer wholesale timelines with GI certificates.";
    } else if (query.toLowerCase().includes("dokra") || query.toLowerCase().includes("brass")) {
      reply = "Ramesh Baghel has 4 Dokra Bell Metal statues in stock. The 'Forest Deer with Sacred Tree' is priced at ₹3,850 with direct ONDC delivery.";
    } else if (query.toLowerCase().includes("payout") || query.toLowerCase().includes("money")) {
      reply = "Jungle Market uses ONDC protocol. When you buy, ₹3,434 of a ₹3,850 item transfers directly into Ramesh Baghel's verified bank account.";
    }
    state.chatMessages.push({ sender: 'ai', text: reply });
    renderChatMessages();
  }, 600);
}

function sendQuickPrompt(text) {
  const input = document.getElementById("ai-chat-input");
  if (input) {
    input.value = text;
    sendChatMessage();
  }
}

function renderChatMessages() {
  const container = document.getElementById("ai-chat-messages");
  if (!container) return;
  container.innerHTML = state.chatMessages.map(m => `
    <div class="flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : ''}">
      ${m.sender === 'ai' ? '<div class="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs">AI</div>' : ''}
      <div class="${m.sender === 'user' ? 'bg-primary text-white rounded-2xl rounded-tr-none' : 'bg-surface-container-low text-on-surface rounded-2xl rounded-tl-none'} p-3 max-w-[85%] text-xs shadow-earth-sm leading-relaxed">
        ${m.text}
      </div>
    </div>
  `).join("");
  container.scrollTop = container.scrollHeight;
}

// ==========================================
// 5B. AI INPUT PIPELINE — VOICE (PHASE 1) + PHOTO (PHASE 2, OPENCV)
// ==========================================
// Voice:  Microphone (MediaDevices) -> MediaRecorder audio blob (uploaded to
//         Whisper STT in production) + Web Speech API live transcript (the
//         browser stand-in for hosted STT) -> extractProductFromSpeech()
//         (the stand-in for the backend LLM) -> structured product JSON ->
//         auto-fills the Step 4 form + feeds the Step 7 confidence score.
// Photo:  Camera/gallery file input -> OpenCV.js (WASM): mean-HSV + Canny
//         edge density for a material hint (stand-in for the CNN), CLAHE
//         enhancement for the before/after view, GrabCut auto-cutout as the
//         background-removal preview. Falls back to plain canvas processing
//         if the OpenCV.js CDN is unreachable.

// ---------- OpenCV.js engine loading ----------
function onOpenCvReady() {
  // Some builds expose cv as a Promise that resolves when WASM is ready.
  if (typeof cv !== 'undefined' && cv && typeof cv.then === 'function') {
    cv.then(() => { state.cvReady = true; }).catch(() => { state.cvLoadFailed = true; });
    return;
  }
  const started = Date.now();
  const poll = () => {
    if (typeof cv !== 'undefined' && cv.Mat) { state.cvReady = true; return; }
    if (Date.now() - started > 20000) { state.cvLoadFailed = true; return; }
    setTimeout(poll, 200);
  };
  poll();
}

function onOpenCvError() {
  state.cvLoadFailed = true;
  showToast("OpenCV engine unreachable — using canvas fallback", "warning");
}

function waitOpenCV(cb, onFail) {
  if (state.cvReady && typeof cv !== 'undefined' && cv.Mat) { cb(); return; }
  if (state.cvLoadFailed) { if (onFail) onFail(); return; }
  const started = Date.now();
  const poll = () => {
    if (state.cvReady && typeof cv !== 'undefined' && cv.Mat) { cb(); return; }
    if (state.cvLoadFailed || Date.now() - started > 15000) { if (onFail) onFail(); return; }
    setTimeout(poll, 200);
  };
  poll();
}

function cvStatusLabel() {
  if (state.cvReady) return "OpenCV.js Ready";
  if (state.cvLoadFailed) return "Canvas Fallback Mode";
  return "Loading OpenCV.js...";
}

// ---------- Voice pipeline (Phase 1) ----------
const SELL_VOICE_LANGUAGES = [
  { code: "hi-IN", label: "Hindi (हिंदी)" },
  { code: "en-IN", label: "English" },
  { code: "bn-IN", label: "Bengali (বাংলা)" },
  { code: "ta-IN", label: "Tamil (தமிழ்)" },
  { code: "te-IN", label: "Telugu (తెలుగు)" },
  { code: "mr-IN", label: "Marathi (मराठी)" }
];

let sellRecognition = null;
let sellMediaRecorder = null;
let sellAudioChunks = [];
let sellAudioStream = null;

function setSellVoiceLanguage(code, label) {
  state.sellWorkflow.voiceLanguage = code;
  state.sellWorkflow.voiceLangLabel = label;
  if (!state.isSellVoiceRecording) renderCurrentScreen();
}

function toggleSellVoice() {
  if (state.isSellVoiceRecording) stopSellVoiceCapture();
  else startSellVoiceCapture();
}

function startSellVoiceCapture() {
  const w = state.sellWorkflow;

  // 1) MediaRecorder captures the raw audio file (future Whisper upload)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      sellAudioStream = stream;
      sellAudioChunks = [];
      try {
        const mime = (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported("audio/webm")) ? "audio/webm" : "";
        sellMediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        sellMediaRecorder.ondataavailable = e => { if (e.data && e.data.size) sellAudioChunks.push(e.data); };
        sellMediaRecorder.onstop = () => {
          const blob = new Blob(sellAudioChunks, { type: sellMediaRecorder.mimeType || "audio/webm" });
          state.sellWorkflow.voiceAudioSize = blob.size;
          updateVoiceTranscriptDOM();
        };
        sellMediaRecorder.start();
      } catch (e) { sellMediaRecorder = null; }
    }).catch(() => {
      showToast("Microphone permission denied — you can type instead", "mic_off");
    });
  }

  // 2) Web Speech API provides live speech-to-text (browser stand-in for Whisper)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    sellRecognition = new SR();
    sellRecognition.lang = w.voiceLanguage || "hi-IN";
    sellRecognition.continuous = true;
    sellRecognition.interimResults = true;
    let finalText = "";
    sellRecognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      state.sellWorkflow.voiceTranscript = finalText.trim();
      state.sellWorkflow.voiceInterim = interim.trim();
      updateVoiceTranscriptDOM();
    };
    sellRecognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        showToast("Microphone blocked — you can type instead", "mic_off");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        showToast("Speech engine: " + event.error, "error");
      }
    };
    sellRecognition.onend = () => {
      // Keep listening until the artisan stops the session
      if (state.isSellVoiceRecording) { try { sellRecognition.start(); } catch (e) {} }
    };
    try { sellRecognition.start(); } catch (e) {}
  }

  state.isSellVoiceRecording = true;
  w.voiceInterim = "";
  if (!w.speechSupported) {
    showToast("Live mic not supported in this browser — type your description below", "keyboard");
  } else {
    showToast("Listening in " + w.voiceLangLabel + "...", "mic");
  }
  renderCurrentScreen();
}

function stopSellVoiceCapture() {
  const w = state.sellWorkflow;
  state.isSellVoiceRecording = false;
  try { if (sellRecognition) sellRecognition.stop(); } catch (e) {}
  try { if (sellMediaRecorder && sellMediaRecorder.state !== "inactive") sellMediaRecorder.stop(); } catch (e) {}
  if (sellAudioStream) { sellAudioStream.getTracks().forEach(t => t.stop()); sellAudioStream = null; }
  sellRecognition = null;
  w.voiceInterim = "";
  w.voiceRecorded = (w.voiceTranscript || "").trim().length > 0;

  if (w.voiceRecorded) {
    applyVoiceExtraction();
    showToast("Voice processed → product information extracted", "psychology");
  } else {
    showToast("No speech detected — tap the mic and speak again", "mic_off");
  }
  renderCurrentScreen();
}

function updateVoiceTranscriptDOM() {
  const finalEl = document.getElementById("sell-voice-final");
  const interimEl = document.getElementById("sell-voice-interim");
  if (finalEl) finalEl.textContent = state.sellWorkflow.voiceTranscript || "Listening...";
  if (interimEl) interimEl.textContent = state.sellWorkflow.voiceInterim || "";
}

function commitTypedTranscript() {
  const input = document.getElementById("sell-voice-typed-input");
  if (!input || !input.value.trim()) { showToast("Type a description first", "keyboard"); return; }
  state.sellWorkflow.voiceTranscript = input.value.trim();
  state.sellWorkflow.voiceRecorded = true;
  applyVoiceExtraction();
  showToast("Description processed → product information extracted", "psychology");
  renderCurrentScreen();
}

// ---------- Structured extraction engine (LLM stand-in) ----------
// In production the transcript goes to an LLM. This keyword engine does the
// same job offline: raw speech (any script) -> structured product JSON.
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

function extractDimensions(rawText) {
  const t = (rawText || "").toLowerCase();
  if (!t) return null;
  const unitPattern = "(?:feet|foot|ft|inch|inches|cm|centimeter|centimetre|meter|meters|फीट|इंच|सेंटीमीटर|सेमी|मीटर|हाथ)";
  const wordNums = Object.keys(EXTRACT_NUMBER_WORDS).filter(k => /[^0-9]/.test(k)).join("|");
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

function extractPrice(rawText) {
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

function extractProductFromSpeech(rawText) {
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

const CATEGORY_BY_MATERIAL = {
  "Bamboo": { id: "cat_bamboo", name: "Bamboo and Cane" },
  "Brass (Bell Metal)": { id: "cat_dokra", name: "Dokra Bell Metal" },
  "Wrought Iron": { id: "cat_wrought_iron", name: "Bastar Wrought Iron" },
  "Terracotta Clay": { id: "cat_terracotta", name: "Terracotta Clay" },
  "Cotton (Handloom)": { id: "cat_textiles", name: "Tribal Handloom" }
};

function applyVoiceExtraction() {
  const w = state.sellWorkflow;
  const info = extractProductFromSpeech(w.voiceTranscript);
  w.extractedInfo = info;

  // Merge extracted fields into the product form (artisan can correct in Step 4)
  if (info.product_name) w.title = info.product_name;
  if (info.material) w.materials = info.material;
  if (info.dimensions) w.dimensions = info.dimensions;
  if (info.price_mentioned) {
    w.suggestedPrice = info.price_mentioned;
    w.userPrice = info.price_mentioned;
    w.costFloor = Math.round(info.price_mentioned * 0.72);
    w.marketMin = Math.round(info.price_mentioned * 0.95);
    w.marketMax = Math.round(info.price_mentioned * 1.08);
  }
  if (info.material && CATEGORY_BY_MATERIAL[info.material]) {
    w.category = CATEGORY_BY_MATERIAL[info.material].name;
    w.categoryId = CATEGORY_BY_MATERIAL[info.material].id;
  }

  w.confidenceScore = info.confidence;

  // Cross-modal agreement: photo + voice saying the same material lifts confidence
  if (w.photoAnalysis && info.material && w.photoAnalysis.material) {
    const a = info.material.replace(/ \(.*\)/, "").toLowerCase().split(" ")[0];
    const b = w.photoAnalysis.material.toLowerCase();
    if (b.includes(a) || a.includes(b.split(" ")[0])) {
      w.confidenceScore = Math.min(98, info.confidence + 6);
    }
  }
}

// ---------- Photo pipeline (Phase 2) ----------
const MAX_WORKFLOW_PHOTOS = 4;

function triggerPhotoCapture() {
  document.getElementById("sell-photo-capture-input")?.click();
}
function triggerPhotoGallery() {
  document.getElementById("sell-photo-gallery-input")?.click();
}

function handleWorkflowPhotos(inputElement) {
  const w = state.sellWorkflow;
  const files = Array.from((inputElement && inputElement.files) || []);
  if (!files.length) return;
  const room = MAX_WORKFLOW_PHOTOS - w.photos.length;
  files.slice(0, Math.max(0, room)).forEach(file => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      w.photos.push(reader.result); // dataURL
      w.enhancedPhoto = null;
      w.cutoutPhoto = null;
      w.enhanceFailed = false;
      showToast("Photo added — OpenCV is analyzing materials...", "image_search");
      analyzePhotoWithOpenCV(reader.result);
      if (state.currentScreen === 'artisan_sell') renderCurrentScreen();
    };
    reader.readAsDataURL(file);
  });
  inputElement.value = ""; // allow re-selecting the same file
}

function removeWorkflowPhoto(index) {
  const w = state.sellWorkflow;
  w.photos.splice(index, 1);
  w.enhancedPhoto = null;
  w.cutoutPhoto = null;
  w.photoAnalysis = null;
  w.enhanceFailed = false;
  if (w.photos.length) analyzePhotoWithOpenCV(w.photos[w.photos.length - 1]);
  renderCurrentScreen();
}

function analyzePhotoWithOpenCV(src) {
  const w = state.sellWorkflow;
  if (!src || !src.startsWith("data:")) {
    // Remote demo images are CORS-tainted for canvas reading; skip analysis.
    return;
  }
  const img = new Image();
  img.onload = () => {
    let analysis = null;
    if (state.cvReady && typeof cv !== 'undefined' && cv.Mat) analysis = opencvPhotoAnalysis(img);
    if (!analysis) analysis = canvasPhotoAnalysis(img);
    if (!analysis) return;
    w.photoAnalysis = analysis;
    if (analysis.confidence >= 60 && CATEGORY_BY_MATERIAL[analysis.material]) {
      w.category = CATEGORY_BY_MATERIAL[analysis.material].name;
      w.categoryId = CATEGORY_BY_MATERIAL[analysis.material].id;
    }
    if (state.currentScreen === 'artisan_sell') renderCurrentScreen();
  };
  img.src = src;
}

// Heuristic stand-in for the CNN classifier: color + texture signals -> material.
// Golden metallic tone -> bell metal; red-brown -> terracotta/wood; pale tan
// mid-saturation -> bamboo weave; low saturation -> iron/stone; high edge
// density + saturation -> handloom textile.
function materialFromColorSignals(h, s, v, edgeDensity, hex) {
  let material = "Mixed / Needs verification";
  let confidence = 45;

  if (s < 0.14) {
    material = v < 0.35 ? "Wrought Iron" : "Stone / Grey Metal";
    confidence = 62;
  } else if (h >= 30 && h <= 60 && s >= 0.35 && v >= 0.4) {
    material = "Brass (Bell Metal)";
    confidence = 82;
  } else if (h >= 8 && h < 30 && v >= 0.3) {
    material = v > 0.45 ? "Terracotta Clay" : "Wood";
    confidence = 74;
  } else if (h >= 25 && h <= 65 && s >= 0.12 && s < 0.35) {
    material = "Bamboo";
    confidence = 71;
  } else if (edgeDensity > 0.14 && s >= 0.3) {
    material = "Cotton (Handloom)";
    confidence = 68;
  }

  if (edgeDensity > 0.18 && material === "Bamboo") confidence = Math.min(80, confidence + 6);

  return {
    engine: "opencv",
    material: material,
    confidence: confidence,
    dominant_color: hex,
    signals: {
      mean_hue_deg: Math.round(h),
      mean_saturation: +(s.toFixed(2)),
      mean_brightness: +(v.toFixed(2)),
      edge_density: +(edgeDensity.toFixed(3))
    }
  };
}

function opencvPhotoAnalysis(img) {
  const mats = [];
  try {
    const maxDim = 320;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);

    const srcMat = cv.imread(c); mats.push(srcMat);
    const bgr = new cv.Mat(); mats.push(bgr);
    cv.cvtColor(srcMat, bgr, cv.COLOR_RGBA2BGR);

    // Mean Hue / Saturation / Value across the product shot
    const hsv = new cv.Mat(); mats.push(hsv);
    cv.cvtColor(bgr, hsv, cv.COLOR_BGR2HSV);
    const mean = cv.mean(hsv);
    const h = mean[0] * 2;      // OpenCV H is 0..180 -> degrees
    const s = mean[1] / 255;
    const v = mean[2] / 255;

    // Canny edge density: woven/loom textures have high edge density
    const gray = new cv.Mat(); mats.push(gray);
    cv.cvtColor(bgr, gray, cv.COLOR_BGR2GRAY);
    const edges = new cv.Mat(); mats.push(edges);
    cv.Canny(gray, edges, 60, 180);
    const edgeDensity = cv.mean(edges)[0] / 255;

    const rgbMean = cv.mean(bgr); // [B, G, R]
    const hex = "#" + [rgbMean[2], rgbMean[1], rgbMean[0]]
      .map(x => Math.round(x).toString(16).padStart(2, "0")).join("");

    return materialFromColorSignals(h, s, v, edgeDensity, hex);
  } catch (e) {
    return null;
  } finally {
    mats.forEach(m => { try { m.delete(); } catch (err) {} });
  }
}

function canvasPhotoAnalysis(img) {
  try {
    const S = 64;
    const c = document.createElement("canvas");
    c.width = S; c.height = S;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, S, S);
    const d = ctx.getImageData(0, 0, S, S).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    r /= n; g /= n; b /= n;
    const hsl = rgbToHsl(r, g, b);
    // HSL saturation/lightness differ from the HSV s/v that
    // materialFromColorSignals expects (and that the OpenCV path feeds it).
    // Derive true HSV s/v from the same channel means so the fallback
    // classifier matches the OpenCV engine.
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const mx = Math.max(rn, gn, bn);
    const mn = Math.min(rn, gn, bn);
    const hsvS = mx > 0 ? (mx - mn) / mx : 0;
    // Luma-gradient edge density
    let edgeSum = 0;
    for (let y = 1; y < S; y++) {
      for (let x = 1; x < S; x++) {
        const i = (y * S + x) * 4, iL = (y * S + x - 1) * 4, iU = ((y - 1) * S + x) * 4;
        const l1 = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const l2 = 0.299 * d[iL] + 0.587 * d[iL + 1] + 0.114 * d[iL + 2];
        const l3 = 0.299 * d[iU] + 0.587 * d[iU + 1] + 0.114 * d[iU + 2];
        edgeSum += Math.abs(l1 - l2) + Math.abs(l1 - l3);
      }
    }
    const edgeDensity = Math.min(1, (edgeSum / (S * S)) / 128);
    const sig = materialFromColorSignals(hsl[0], hsvS, mx, edgeDensity, rgbToHex(r, g, b));
    sig.engine = "canvas-fallback";
    return sig;
  } catch (e) {
    return null;
  }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const dd = max - min;
    s = l > 0.5 ? dd / (2 - max - min) : dd / (max + min);
    if (max === r) h = ((g - b) / dd + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / dd + 2) * 60;
    else h = ((r - g) / dd + 4) * 60;
  }
  return [h, s, l];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, "0")).join("");
}

// ---------- Step 3: OpenCV enhancement (median denoise + CLAHE + saturation) ----------
function ensureEnhancedPhoto() {
  const w = state.sellWorkflow;
  if (w.enhancedPhoto || w.enhanceFailed || !w.photos.length) return;
  const src = w.photos[0];

  const finish = (url, engine) => {
    if (url) {
      w.enhancedPhoto = url;
      w.enhanceEngine = engine;
    } else {
      w.enhanceFailed = true;
    }
    if (state.currentScreen === 'artisan_sell' && w.currentStep === 3) renderCurrentScreen();
  };

  const runFallback = () => canvasEnhanceImage(src, url => finish(url, "canvas-fallback"));
  const runOpenCV = () => {
    if (!src.startsWith("data:")) { runFallback(); return; } // remote demo image: canvas is tainted
    opencvEnhanceImage(src, url => (url ? finish(url, "opencv-clahe") : runFallback()));
  };

  waitOpenCV(runOpenCV, runFallback);
}

function opencvEnhanceImage(src, cb) {
  const img = new Image();
  const mats = [];
  img.onload = () => {
    try {
      const maxDim = 900;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);

      const srcMat = cv.imread(c); mats.push(srcMat);
      const bgr = new cv.Mat(); mats.push(bgr);
      cv.cvtColor(srcMat, bgr, cv.COLOR_RGBA2BGR);

      // 1. Light denoise (3x3 median)
      const den = new cv.Mat(); mats.push(den);
      cv.medianBlur(bgr, den, 3);

      // 2. CLAHE on the L channel of LAB — rescues shadow detail (OpenCV classic)
      const lab = new cv.Mat(); mats.push(lab);
      cv.cvtColor(den, lab, cv.COLOR_BGR2LAB);
      const planes = new cv.MatVector(); mats.push(planes);
      cv.split(lab, planes);
      const lOut = new cv.Mat(); mats.push(lOut);
      const clahe = cv.createCLAHE(2.0, new cv.Size(8, 8));
      clahe.apply(planes.get(0), lOut);
      lOut.copyTo(planes.get(0));
      cv.merge(planes, lab);
      const out = new cv.Mat(); mats.push(out);
      cv.cvtColor(lab, out, cv.COLOR_LAB2BGR);

      // 3. Gentle global contrast + brightness lift
      const tuned = new cv.Mat(); mats.push(tuned);
      cv.convertScaleAbs(out, tuned, 1.06, 6);

      // 4. Saturation boost on the S channel of HSV
      const hsv = new cv.Mat(); mats.push(hsv);
      cv.cvtColor(tuned, hsv, cv.COLOR_BGR2HSV);
      const hsvp = new cv.MatVector(); mats.push(hsvp);
      cv.split(hsv, hsvp);
      const sBoost = new cv.Mat(); mats.push(sBoost);
      cv.convertScaleAbs(hsvp.get(1), sBoost, 1.15, 0);
      sBoost.copyTo(hsvp.get(1));
      cv.merge(hsvp, hsv);
      const finalMat = new cv.Mat(); mats.push(finalMat);
      cv.cvtColor(hsv, finalMat, cv.COLOR_HSV2BGR);

      const outCanvas = document.createElement("canvas");
      outCanvas.width = c.width; outCanvas.height = c.height;
      cv.imshow(outCanvas, finalMat); // expects BGR — matches our pipeline
      cb(outCanvas.toDataURL("image/jpeg", 0.92));
    } catch (e) {
      cb(null);
    } finally {
      mats.forEach(m => { try { m.delete(); } catch (err) {} });
    }
  };
  img.onerror = () => cb(null);
  img.src = src;
}

function canvasEnhanceImage(src, cb) {
  const img = new Image();
  img.onload = () => {
    try {
      const maxDim = 900;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        let r = lum + (d[i] - lum) * 1.25;   // saturation
        let g = lum + (d[i + 1] - lum) * 1.25;
        let b = lum + (d[i + 2] - lum) * 1.25;
        r = (r - 128) * 1.12 + 138;          // contrast + brightness
        g = (g - 128) * 1.12 + 138;
        b = (b - 128) * 1.12 + 138;
        d[i] = Math.max(0, Math.min(255, r));
        d[i + 1] = Math.max(0, Math.min(255, g));
        d[i + 2] = Math.max(0, Math.min(255, b));
      }
      ctx.putImageData(id, 0, 0);
      cb(c.toDataURL("image/jpeg", 0.92));
    } catch (e) {
      cb(null); // tainted canvas (remote image) — cannot export
    }
  };
  img.onerror = () => cb(null);
  img.src = src;
}

// ---------- GrabCut background-removal preview ----------
function runGrabCutCutout() {
  const w = state.sellWorkflow;
  if (!w.photos.length) return;
  const src = w.photos[0];
  if (!src.startsWith("data:")) {
    showToast("Upload your own photo to preview the cutout", "info");
    return;
  }
  if (state.cvBusy) return;
  state.cvBusy = true;
  showToast("GrabCut segmentation running...", "content_cut");
  renderCurrentScreen();

  waitOpenCV(() => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 420;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);

        const srcMat = cv.imread(c);
        const bgr = new cv.Mat();
        cv.cvtColor(srcMat, bgr, cv.COLOR_RGBA2BGR);

        // Assume the product fills the middle ~86% of the frame
        const padX = Math.round(c.width * 0.07);
        const padY = Math.round(c.height * 0.07);
        const rect = new cv.Rect(padX, padY, c.width - padX * 2, c.height - padY * 2);

        const bgdModel = new cv.Mat();
        const fgdModel = new cv.Mat();
        // GC_PR_BGD = 2 (certain-bg 0, certain-fg 1, probable-bg 2, probable-fg 3)
        const mask = new cv.Mat(c.rows, c.cols, cv.CV_8UC1, new cv.Scalar(2));
        cv.grabCut(bgr, mask, rect, bgdModel, fgdModel, 4, cv.GC_INIT_WITH_RECT);

        const outCanvas = document.createElement("canvas");
        outCanvas.width = c.width; outCanvas.height = c.height;
        const octx = outCanvas.getContext("2d");
        octx.fillStyle = "#f4f7f3"; // clean studio backdrop
        octx.fillRect(0, 0, outCanvas.width, outCanvas.height);
        const imgData = octx.getImageData(0, 0, outCanvas.width, outCanvas.height);
        const rgba = srcMat.data;
        for (let i = 0; i < mask.rows; i++) {
          for (let j = 0; j < mask.cols; j++) {
            const mv = mask.ucharPtr(i, j)[0];
            if (mv === 1 || mv === 3) { // foreground: paint the original pixels back
              const p = (i * mask.cols + j) * 4;
              imgData.data[p] = rgba[p];
              imgData.data[p + 1] = rgba[p + 1];
              imgData.data[p + 2] = rgba[p + 2];
              imgData.data[p + 3] = 255;
            }
          }
        }
        octx.putImageData(imgData, 0, 0);
        w.cutoutPhoto = outCanvas.toDataURL("image/jpeg", 0.92);

        [mask, bgdModel, fgdModel, bgr, srcMat].forEach(m => { try { m.delete(); } catch (e) {} });
        state.cvBusy = false;
        showToast("Background removed with GrabCut", "content_cut");
        if (state.currentScreen === 'artisan_sell') renderCurrentScreen();
      } catch (e) {
        state.cvBusy = false;
        showToast("GrabCut preview failed on this photo", "error");
        if (state.currentScreen === 'artisan_sell') renderCurrentScreen();
      }
    };
    img.onerror = () => { state.cvBusy = false; showToast("Could not load photo for cutout", "error"); };
    img.src = src;
  }, () => {
    state.cvBusy = false;
    showToast("OpenCV engine not ready for cutout yet", "hourglass_top");
  });
}

// ---------- Shared workflow helpers ----------
function updateComparePosition(val) {
  const p = parseInt(val);
  state.sellWorkflow.comparePosition = isNaN(p) ? 50 : p;
  const after = document.getElementById("compare-after-layer");
  const handle = document.getElementById("compare-handle");
  if (after) after.style.clipPath = `inset(0 ${100 - state.sellWorkflow.comparePosition}% 0 0)`;
  if (handle) handle.style.left = state.sellWorkflow.comparePosition + "%";
}

function updateWorkflowField(key, val) {
  state.sellWorkflow[key] = val;
}

function renderExtractionCard(info) {
  const route = info.confidence >= 90
    ? "HIGH → Auto preview on ONDC"
    : info.confidence >= 55
      ? "MEDIUM → Artisan confirms fields"
      : "LOW → Ambassador verification";
  const rows = [
    ["product_name", info.product_name || "— not detected —"],
    ["material", info.material || "—"],
    ["category_type", info.category_type || "—"],
    ["usage", info.usage || "—"],
    ["dimensions", info.dimensions || "—"],
    ["price_mentioned", (info.price_mentioned !== null && info.price_mentioned !== undefined) ? "₹" + info.price_mentioned : "—"],
    ["language", info.language_detected]
  ];
  const tone = info.confidence >= 90
    ? "bg-[#e8f8e7] text-[#1f5d3a]"
    : info.confidence >= 55
      ? "bg-tertiary-fixed text-tertiary"
      : "bg-error-container text-on-error-container";
  return `
    <div class="p-3 rounded-xl bg-white border border-primary/20 text-left text-xs space-y-2">
      <div class="flex items-center justify-between gap-2">
        <span class="font-bold text-primary flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">psychology</span> Extracted Product Information
        </span>
        <span class="px-2 py-0.5 rounded-full ${tone} text-[10px] font-bold whitespace-nowrap">${info.confidence}% confidence</span>
      </div>
      <div class="pipeline-json">${rows.map(r => `${r[0]}: ${r[1]}`).join("\n")}</div>
      <div class="text-[10px] text-on-surface-variant flex items-center gap-1">
        <span class="material-symbols-outlined text-[12px]">alt_route</span> Routing: ${route}
      </div>
      <div class="text-[10px] text-secondary font-medium">→ Auto-filled into the Step 4 form (you can correct anything)</div>
    </div>
  `;
}

function renderProductIntelligenceCard(w) {
  const merged = {
    product_name: w.title,
    category: w.category,
    material: (w.extractedInfo && w.extractedInfo.material) || w.materials,
    usage: (w.extractedInfo && w.extractedInfo.usage) || null,
    dimensions: w.dimensions,
    weight: w.weight,
    price: {
      suggested: w.suggestedPrice,
      market_range: `₹${w.marketMin}–₹${w.marketMax}`,
      cost_floor: w.costFloor
    },
    sources: {
      voice: w.voiceRecorded && w.extractedInfo
        ? `transcript extraction (${w.extractedInfo.confidence}%)`
        : "none",
      photo: w.photoAnalysis
        ? `${w.photoAnalysis.engine} material hint (${w.photoAnalysis.confidence}%)`
        : "none"
    },
    confidence: w.confidenceScore,
    routing: w.confidenceScore >= 90 ? "AUTO_PUBLISH" : "ARTISAN_REVIEW"
  };
  return `
    <div class="p-3 rounded-xl bg-surface-container-low border border-primary/20 text-xs space-y-2">
      <div class="flex items-center justify-between">
        <span class="font-bold text-primary flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">merge_type</span> Product Intelligence (voice + photo merged)
        </span>
        <span class="px-2 py-0.5 rounded-full bg-[#e8f8e7] text-[#1f5d3a] text-[10px] font-bold">${w.confidenceScore}%</span>
      </div>
      <div class="pipeline-json">${JSON.stringify(merged, null, 2)}</div>
    </div>
  `;
}

// ==========================================
// 6. CART & CHECKOUT ENGINE
// ==========================================
function addToCart(productId) {
  const product = JUNGLE_DATA.products.find(p => p.id === productId) || state.selectedProduct;
  const existing = state.cart.find(item => item.product.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ product, quantity: 1 });
  }
  updateHeaderAndNav();
  showToast(`Added ${product.title} to your basket`, "shopping_bag");
}

function updateCartQty(productId, delta) {
  const item = state.cart.find(i => i.product.id === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.product.id !== productId);
  }
  updateHeaderAndNav();
  renderCartSheet();
}

function renderCartSheet() {
  const itemsContainer = document.getElementById("cart-sheet-items");
  const subtotalEl = document.getElementById("cart-subtotal-text");
  if (!itemsContainer || !subtotalEl) return;

  if (state.cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="py-12 flex flex-col items-center justify-center text-center space-y-2">
        <span class="material-symbols-outlined text-4xl text-outline">remove_shopping_cart</span>
        <p class="font-semibold text-sm text-primary">Your basket is empty</p>
        <p class="text-xs text-on-surface-variant">Add handmade tribal crafts directly from village artisans.</p>
      </div>
    `;
    subtotalEl.innerText = "₹0";
    return;
  }

  let total = 0;
  itemsContainer.innerHTML = state.cart.map(item => {
    const itemTotal = item.product.price * item.quantity;
    total += itemTotal;
    return `
      <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container gap-3 shadow-earth-sm">
        <img src="${item.product.image}" alt="${item.product.title}" class="w-14 h-14 rounded-lg object-cover flex-shrink-0"/>
        <div class="flex-1 min-w-0">
          <h4 class="text-xs font-semibold text-primary truncate">${item.product.title}</h4>
          <span class="text-[11px] text-on-surface-variant block">${item.product.artisanName}</span>
          <span class="text-xs font-medium text-secondary">₹${item.product.price.toLocaleString()}</span>
        </div>
        <div class="flex items-center gap-2 bg-surface-container px-2 py-1 rounded-lg">
          <button onclick="updateCartQty('${item.product.id}', -1)" class="w-6 h-6 flex items-center justify-center text-xs font-bold text-on-surface hover:bg-white rounded">-</button>
          <span class="text-xs font-bold w-4 text-center">${item.quantity}</span>
          <button onclick="updateCartQty('${item.product.id}', 1)" class="w-6 h-6 flex items-center justify-center text-xs font-bold text-on-surface hover:bg-white rounded">+</button>
        </div>
      </div>
    `;
  }).join("");

  subtotalEl.innerText = `₹${total.toLocaleString()}`;
}

function proceedToCheckout() {
  closeCartSheet();
  navigateTo('checkout_screen');
}

function placeOrder() {
  if (state.cart.length === 0) return;
  const firstItem = state.cart[0];
  const newOrder = {
    id: `ORD-ONDC-${Math.floor(1000 + Math.random() * 9000)}`,
    buyerName: "Rahul Verma",
    buyerCity: "New Delhi",
    buyerApp: "Jungle Market Buyer App",
    date: "Just now",
    timestamp: Date.now(),
    status: "CONFIRMED",
    statusStep: 2,
    productTitle: firstItem.product.title,
    productId: firstItem.product.id,
    productImage: firstItem.product.image,
    quantity: firstItem.quantity,
    totalAmount: firstItem.product.price * firstItem.quantity,
    artisanPayout: Math.round((firstItem.product.price * firstItem.quantity) * 0.892),
    shippingProvider: "Delhivery Surface",
    trackingNumber: `DLV-ONDC-${Math.floor(100000 + Math.random() * 900000)}`,
    timeline: [
      { state: "PENDING", label: "Order Created by Buyer", time: "Just now", done: true },
      { state: "CONFIRMED", label: "Artisan Accepted & Paid on ONDC", time: "Just now", done: true },
      { state: "PROCESSING", label: "Artisan Packing in Bamboo Box", time: "Pending", done: false },
      { state: "READY_TO_SHIP", label: "Handed over to Pickup Van", time: "Pending", done: false },
      { state: "SHIPPED", label: "In Transit via Delhivery", time: "Pending", done: false },
      { state: "OUT_FOR_DELIVERY", label: "Courier Agent on Delivery Route", time: "Pending", done: false },
      { state: "DELIVERED", label: "Received by Buyer", time: "Pending", done: false }
    ]
  };

  state.cart = [];
  eventBus.emit('order_created', newOrder);
  state.selectedOrder = newOrder;
  navigateTo('order_success', { order: newOrder });
}

// ==========================================
// 7. HEADER & BOTTOM NAV UPDATER
// ==========================================
function updateHeaderAndNav() {
  const subtitle = document.getElementById("header-subtitle");
  const cartBadge = document.getElementById("cart-badge-count");
  const notifDot = document.getElementById("notif-badge-dot");
  const nav = document.getElementById("bottom-nav-bar");
  const totalCartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cartBadge) cartBadge.innerText = totalCartCount;
  if (notifDot) {
    const unreadCount = JUNGLE_DATA.notifications.filter(n => n.unread).length;
    notifDot.style.display = unreadCount > 0 ? "block" : "none";
  }

  if (subtitle) {
    if (state.currentRole === 'artisan') {
      subtitle.innerHTML = `<span class="material-symbols-outlined text-[12px] text-secondary">handyman</span><span>Artisan Studio • Ramesh</span>`;
    } else if (state.currentRole === 'ambassador') {
      subtitle.innerHTML = `<span class="material-symbols-outlined text-[12px] text-secondary">verified</span><span>Field Lead • Bastar</span>`;
    } else {
      subtitle.innerHTML = `<span class="material-symbols-outlined text-[12px] text-secondary">location_on</span><span>Bastar Forest Hub</span>`;
    }
  }

  if (!nav) return;

  if (state.currentRole === 'artisan') {
    nav.innerHTML = `
      <button onclick="navigateTo('artisan_dashboard')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'artisan_dashboard' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">dashboard</span>
        <span class="text-[10px]">Dashboard</span>
      </button>
      <button onclick="navigateTo('artisan_sell')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'artisan_sell' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center -mt-3 shadow-earth-sm">
          <span class="material-symbols-outlined text-[18px]">add</span>
        </div>
        <span class="text-[10px]">Sell Craft</span>
      </button>
      <button onclick="navigateTo('artisan_orders')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'artisan_orders' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">local_shipping</span>
        <span class="text-[10px]">Orders</span>
      </button>
      <button onclick="navigateTo('artisan_amount')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'artisan_amount' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">account_balance_wallet</span>
        <span class="text-[10px]">Amount</span>
      </button>
      <button onclick="navigateTo('artisan_guild')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'artisan_guild' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">qr_code_2</span>
        <span class="text-[10px]">Network QR</span>
      </button>
    `;
  } else if (state.currentRole === 'ambassador') {
    nav.innerHTML = `
      <button onclick="navigateTo('ambassador_dashboard')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'ambassador_dashboard' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">dashboard</span>
        <span class="text-[10px]">Dashboard</span>
      </button>
      <button onclick="navigateTo('ambassador_verification')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'ambassador_verification' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">fact_check</span>
        <span class="text-[10px]">Verify Queue</span>
      </button>
      <button onclick="navigateTo('ambassador_network')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'ambassador_network' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">group_add</span>
        <span class="text-[10px]">Network</span>
      </button>
      <button onclick="navigateTo('ambassador_reports')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'ambassador_reports' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">bar_chart</span>
        <span class="text-[10px]">Reports</span>
      </button>
    `;
  } else {
    // Buyer
    nav.innerHTML = `
      <button onclick="navigateTo('home')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'home' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">home</span>
        <span class="text-[10px]">Home</span>
      </button>
      <button onclick="navigateTo('categories')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'categories' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">category</span>
        <span class="text-[10px]">Categories</span>
      </button>
      <button onclick="navigateTo('bulk_buying')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'bulk_buying' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">inventory_2</span>
        <span class="text-[10px]">Bulk Sourcing</span>
      </button>
      <button onclick="navigateTo('buyer_orders')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'buyer_orders' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">receipt_long</span>
        <span class="text-[10px]">Orders</span>
      </button>
      <button onclick="navigateTo('buyer_profile')" class="flex flex-col items-center gap-1 ${state.currentScreen === 'buyer_profile' ? 'text-primary font-bold' : 'text-on-surface-variant'} py-1">
        <span class="material-symbols-outlined text-[20px]">person</span>
        <span class="text-[10px]">Profile</span>
      </button>
    `;
  }
}

// ==========================================
// 8. SCREEN RENDERERS
// ==========================================
function renderCurrentScreen() {
  const main = document.getElementById("app-main-content");
  if (!main) return;

  switch (state.currentScreen) {
    // ARTISAN SCREENS
    case 'artisan_dashboard':
      main.innerHTML = renderArtisanDashboard();
      break;
    case 'artisan_sell':
      main.innerHTML = renderArtisanSellingWorkflow();
      if (state.sellWorkflow.currentStep === 3) ensureEnhancedPhoto();
      break;
    case 'artisan_orders':
      main.innerHTML = renderArtisanOrders();
      break;
    case 'artisan_amount':
      main.innerHTML = renderArtisanAmount();
      break;
    case 'artisan_guild':
      main.innerHTML = renderArtisanGuildProfile();
      break;

    // BUYER SCREENS
    case 'home':
      main.innerHTML = renderBuyerHome();
      break;
    case 'categories':
      main.innerHTML = renderBuyerCategories();
      break;
    case 'product_detail':
      main.innerHTML = renderProductDetail();
      break;
    case 'bulk_buying':
      main.innerHTML = renderBulkBuying();
      break;
    case 'checkout_screen':
      main.innerHTML = renderCheckoutScreen();
      break;
    case 'order_success':
      main.innerHTML = renderOrderSuccess();
      break;
    case 'buyer_orders':
      main.innerHTML = renderBuyerOrders();
      break;
    case 'buyer_profile':
      main.innerHTML = renderBuyerProfile();
      break;

    // AMBASSADOR SCREENS
    case 'ambassador_dashboard':
      main.innerHTML = renderAmbassadorDashboard();
      break;
    case 'ambassador_verification':
      main.innerHTML = renderAmbassadorVerificationQueue();
      break;
    case 'ambassador_network':
      main.innerHTML = renderAmbassadorNetwork();
      break;
    case 'ambassador_reports':
      main.innerHTML = renderAmbassadorReports();
      break;

    // COMMON
    case 'notifications_screen':
      main.innerHTML = renderNotificationsScreen();
      break;

    default:
      main.innerHTML = renderBuyerHome();
  }
}

// ----------------------------------------------------
// SCREEN 1: ARTISAN DASHBOARD
// ----------------------------------------------------
function renderArtisanDashboard() {
  const user = JUNGLE_DATA.currentUser;
  const recentOrder = JUNGLE_DATA.orders[0];

  return `
    <div class="px-4 py-4 space-y-4">
      
      <!-- Welcome & GI Badge (Watermelon Budget & Stats Card Pattern) -->
      <div class="bg-primary text-white p-5 rounded-2xl shadow-earth-md relative overflow-hidden">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[11px] font-semibold border border-white/10 watermelon-card-cue">
              <span class="material-symbols-outlined text-[13px]">verified</span> GI Certified Master
            </span>
            <h2 class="font-headline text-xl font-bold text-white">Namaste, ${user.name}</h2>
            <p class="text-xs text-white/80">${user.village}</p>
          </div>
          <img src="${user.avatar}" alt="${user.name}" class="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/20"/>
        </div>

        <!-- Watermelon Animated Budget Progress Bar -->
        <div class="mt-4 pt-3 border-t border-white/10 space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-white/80">Monthly Payout Realization</span>
            <span class="font-bold text-[#94d4a7]">91.4% Direct Share</span>
          </div>
          <div class="w-full h-2.5 bg-black/30 rounded-full overflow-hidden flex">
            <div class="bg-[#94d4a7] h-full watermelon-budget-bar" style="width: 91.4%"></div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-3">
          <div class="bg-black/20 p-3 rounded-xl">
            <span class="text-[11px] text-white/70 block">Total Earnings</span>
            <span class="text-lg font-bold text-[#94d4a7]">₹${user.totalEarnings.toLocaleString()}</span>
          </div>
          <div class="bg-black/20 p-3 rounded-xl">
            <span class="text-[11px] text-white/70 block">Pending Payout</span>
            <span class="text-lg font-bold text-[#f1be65]">₹${user.pendingPayout.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- Quick Action: Sell New Craft CTA (Watermelon Shimmer Button) -->
      <div class="grid grid-cols-2 gap-3">
        <button onclick="navigateTo('artisan_sell')" class="h-14 p-3 rounded-xl bg-secondary text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-earth-sm hover:bg-secondary/90 active:scale-95 transition-all watermelon-shimmer-btn">
          <span class="material-symbols-outlined text-[20px]">add_circle</span>
          <span>Sell New Craft</span>
        </button>
        <button onclick="navigateTo('artisan_amount')" class="h-14 p-3 rounded-xl bg-surface-container-high text-on-surface font-semibold text-xs flex items-center justify-center gap-2 shadow-earth-sm hover:bg-surface-container active:scale-95 transition-all border border-surface-container-highest">
          <span class="material-symbols-outlined text-[20px] text-primary">account_balance_wallet</span>
          <span>View Wallet</span>
        </button>
      </div>

      <!-- Watermelon Expandable Activity Card (Live Order Alert) -->
      ${recentOrder ? `
        <div id="activity-order-card" class="watermelon-activity-card p-4 rounded-xl bg-surface-container-low border border-surface-container space-y-3 shadow-earth-sm cursor-pointer" onclick="toggleActivityDetails('activity-order-card')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span class="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
              <span>Active ONDC Order</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container">${recentOrder.status}</span>
              <span class="material-symbols-outlined text-[16px] text-on-surface-variant">expand_more</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <img src="${recentOrder.productImage}" alt="${recentOrder.productTitle}" class="w-12 h-12 rounded-lg object-cover"/>
            <div class="flex-1 min-w-0">
              <h4 class="text-xs font-medium text-on-surface truncate">${recentOrder.productTitle}</h4>
              <p class="text-[11px] text-on-surface-variant">${recentOrder.buyerName} • ${recentOrder.buyerCity}</p>
              <span class="text-xs font-semibold text-primary">₹${recentOrder.artisanPayout.toLocaleString()} direct payout</span>
            </div>
          </div>

          <!-- Expandable Details Section -->
          <div class="watermelon-accordion-content space-y-2 pt-2 border-t border-surface-container" onclick="event.stopPropagation()">
            <div class="text-[11px] space-y-1">
              <div class="flex justify-between text-on-surface-variant">
                <span>Shipping Carrier:</span>
                <strong class="text-on-surface">${recentOrder.shippingProvider}</strong>
              </div>
              <div class="flex justify-between text-on-surface-variant">
                <span>Tracking ID:</span>
                <strong class="font-mono text-primary">${recentOrder.trackingNumber}</strong>
              </div>
            </div>
            <div class="flex gap-2 pt-1">
              <button onclick="navigateTo('artisan_orders')" class="flex-1 h-10 rounded-lg bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-earth-sm">
                <span>Update Fulfillment</span>
                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Active Craft Listings -->
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <h3 class="font-headline font-semibold text-base text-primary">Your Active Listings (${JUNGLE_DATA.products.length})</h3>
          <span class="text-xs text-secondary font-medium">ONDC Broadcast Live</span>
        </div>
        <div class="space-y-2">
          ${JUNGLE_DATA.products.map(p => `
            <div class="p-3 rounded-xl bg-white border border-surface-container flex items-center justify-between gap-3 shadow-earth-sm">
              <img src="${p.image}" alt="${p.title}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0"/>
              <div class="flex-1 min-w-0">
                <h4 class="text-xs font-medium text-on-surface truncate">${p.title}</h4>
                <p class="text-[11px] text-on-surface-variant">${p.category} • ${p.stockQuantity} in stock</p>
                <span class="text-xs font-semibold text-primary">₹${p.price.toLocaleString()}</span>
              </div>
              <span class="px-2 py-1 rounded-full bg-[#e8f8e7] text-[#1f5d3a] text-[10px] font-bold">Active</span>
            </div>
          `).join("")}
        </div>
      </div>

    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 2: 11-STEP GUIDED SELLING WORKFLOW
// ----------------------------------------------------
function renderArtisanSellingWorkflow() {
  const w = state.sellWorkflow;

  return `
    <div class="px-4 py-4 space-y-4">
      
      <!-- Top Stepper Header -->
      <div class="flex items-center justify-between pb-3 border-b border-surface-container">
        <div>
          <span class="text-[11px] text-secondary font-bold uppercase tracking-wider">Guided Selling Workflow</span>
          <h2 class="font-headline text-lg font-semibold text-primary">Publish Craft to ONDC</h2>
        </div>
        <span class="px-2.5 py-1 rounded-full bg-primary-container text-white text-xs font-bold">Step ${w.currentStep} of 11</span>
      </div>

      <!-- Step Indicator Dots -->
      <div class="flex items-center justify-between px-1">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(s => `
          <div class="step-dot ${s === w.currentStep ? 'active' : (s < w.currentStep ? 'completed' : 'pending')}">
            ${s < w.currentStep ? '<span class="material-symbols-outlined text-[14px]">check</span>' : s}
          </div>
        `).join("")}
      </div>

      <!-- STEP CONTENT CONTAINER -->
      <div class="p-4 rounded-2xl bg-white border border-surface-container shadow-earth-md space-y-4">
        
        ${w.currentStep === 1 ? `
          <!-- STEP 1: VOICE INPUT (live pipeline: mic → transcript → extraction) -->
          <div class="space-y-3 text-center">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
              <span class="material-symbols-outlined text-[14px]">mic</span> Step 1: Voice Input
            </span>
            <h3 class="font-headline text-base font-semibold text-primary">Describe your handmade craft</h3>
            <p class="text-xs text-on-surface-variant">Speak in your language. Your voice is recorded and turned into product information automatically.</p>

            <!-- Language selection -->
            <div class="flex flex-wrap justify-center gap-1.5">
              ${SELL_VOICE_LANGUAGES.map(l => `
                <button onclick="setSellVoiceLanguage('${l.code}', '${l.label}')" class="px-3 py-1.5 rounded-full text-xs font-medium transition-all ${w.voiceLanguage === l.code ? 'bg-primary text-white shadow-earth-sm' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}">
                  ${l.label}
                </button>
              `).join("")}
            </div>

            <!-- Mic button -->
            <div class="flex justify-center py-2 relative">
              ${state.isSellVoiceRecording ? '<div class="absolute w-20 h-20 rounded-full border-2 border-secondary animate-ping opacity-60"></div>' : ''}
              <div onclick="toggleSellVoice()" class="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer shadow-earth-lg transition-all ${state.isSellVoiceRecording ? 'bg-error text-white recording-pulse' : 'bg-primary text-white'}">
                <span class="material-symbols-outlined text-3xl">${state.isSellVoiceRecording ? 'stop' : 'mic'}</span>
              </div>
            </div>

            ${state.isSellVoiceRecording ? `
              <div class="flex items-center justify-center gap-1.5 h-8 text-error">
                <div class="audio-waveform-bar"></div>
                <div class="audio-waveform-bar"></div>
                <div class="audio-waveform-bar"></div>
                <div class="audio-waveform-bar"></div>
                <div class="audio-waveform-bar"></div>
                <div class="audio-waveform-bar"></div>
                <div class="audio-waveform-bar"></div>
              </div>
            ` : ''}

            <!-- Live transcript -->
            <div class="p-3 rounded-xl bg-surface-container-low border border-surface-container text-left text-xs">
              <div class="flex items-center justify-between mb-1 gap-2">
                <span class="font-medium text-secondary">Live Transcript (${w.voiceLangLabel})</span>
                ${w.voiceAudioSize ? `<span class="text-[10px] text-on-surface-variant whitespace-nowrap">audio ${(w.voiceAudioSize / 1024).toFixed(0)} KB • queued for Whisper STT</span>` : ''}
              </div>
              <p id="sell-voice-final" class="text-on-surface italic">${w.voiceTranscript || (state.isSellVoiceRecording ? 'Listening...' : 'Tap the mic and describe your craft — name, material, size, price.')}</p>
              <p id="sell-voice-interim" class="text-outline italic mt-0.5">${w.voiceInterim}</p>
            </div>

            <!-- Typed fallback (browsers without speech support / denied mic) -->
            <div class="flex items-center gap-2">
              <input id="sell-voice-typed-input" type="text" placeholder="Or type instead: “Yeh bamboo tokri hai, 2 feet, 800 rupaye”" onkeydown="if(event.key==='Enter') commitTypedTranscript()" class="flex-1 h-10 px-3 rounded-xl bg-surface-container-low border border-surface-container text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"/>
              <button onclick="commitTypedTranscript()" class="h-10 px-3 rounded-xl bg-surface-container-high text-primary text-xs font-bold hover:bg-surface-container-highest">Use</button>
            </div>

            <!-- Extracted product information (auto-fills Step 4) -->
            ${w.extractedInfo ? renderExtractionCard(w.extractedInfo) : ''}
          </div>
        ` : ''}

        ${w.currentStep === 2 ? `
          <!-- STEP 2: PHOTO UPLOAD (real camera/gallery + OpenCV analysis) -->
          <div class="space-y-3">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
              <span class="material-symbols-outlined text-[14px]">photo_camera</span> Step 2: Craft Photos
            </span>
            <h3 class="font-headline text-base font-semibold text-primary">Upload clear photos</h3>
            <p class="text-xs text-on-surface-variant">Take a photo with your camera or pick from your gallery. OpenCV analyzes the first photo for material.</p>

            <div class="grid grid-cols-2 gap-3">
              ${w.photos.map((src, i) => `
                <div class="relative rounded-xl overflow-hidden aspect-square border-2 border-primary/30">
                  <img src="${src}" alt="Craft photo ${i + 1}" class="w-full h-full object-cover"/>
                  <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px]">Photo ${i + 1}</span>
                  <button onclick="removeWorkflowPhoto(${i})" title="Remove photo" class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90">
                    <span class="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              `).join("")}
              ${w.photos.length < MAX_WORKFLOW_PHOTOS ? `
                <div class="grid grid-rows-2 gap-2">
                  <button onclick="triggerPhotoCapture()" class="rounded-xl border-2 border-dashed border-primary/40 bg-surface-container-low flex flex-col items-center justify-center text-primary hover:bg-surface-container transition-all">
                    <span class="material-symbols-outlined text-2xl">photo_camera</span>
                    <span class="text-[11px] font-bold mt-1">Take Photo</span>
                  </button>
                  <button onclick="triggerPhotoGallery()" class="rounded-xl border-2 border-dashed border-surface-container-highest flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all">
                    <span class="material-symbols-outlined text-2xl">add_photo_alternate</span>
                    <span class="text-[11px] font-medium mt-1">From Gallery</span>
                  </button>
                </div>
              ` : ''}
            </div>

            ${w.photoAnalysis ? `
              <!-- OpenCV material analysis -->
              <div class="p-3 rounded-xl bg-white border border-primary/20 text-xs space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-semibold text-primary flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">memory</span> OpenCV Material Analysis
                  </span>
                  <span class="px-2 py-0.5 rounded-full ${w.photoAnalysis.confidence >= 80 ? 'bg-[#e8f8e7] text-[#1f5d3a]' : 'bg-tertiary-fixed text-tertiary'} text-[10px] font-bold whitespace-nowrap">${w.photoAnalysis.confidence}% confidence</span>
                </div>
                <div class="flex items-center justify-between bg-surface-container-low rounded-lg px-3 py-2">
                  <span class="text-on-surface-variant">Detected Material</span>
                  <span class="font-bold text-primary">${w.photoAnalysis.material}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[11px] text-on-surface-variant">
                  <span>Hue <strong class="text-on-surface">${w.photoAnalysis.signals.mean_hue_deg}°</strong></span>
                  <span>Saturation <strong class="text-on-surface">${w.photoAnalysis.signals.mean_saturation}</strong></span>
                  <span>Brightness <strong class="text-on-surface">${w.photoAnalysis.signals.mean_brightness}</strong></span>
                  <span>Edge density <strong class="text-on-surface">${w.photoAnalysis.signals.edge_density}</strong></span>
                </div>
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-on-surface-variant">Engine: ${w.photoAnalysis.engine}</span>
                  <span class="flex items-center gap-1 text-on-surface-variant">Dominant color <span class="w-4 h-4 rounded-full border border-outline-variant inline-block" style="background:${w.photoAnalysis.dominant_color}"></span></span>
                </div>
              </div>
            ` : (w.photos.length && !w.photoAnalysis ? `
              <p class="text-[11px] text-on-surface-variant px-1">${w.photos[0].startsWith('data:') ? 'Analyzing photo with OpenCV...' : 'Demo catalog photo — take or upload your own photo to run the OpenCV analysis.'}</p>
            ` : '')}
          </div>
        ` : ''}

        ${w.currentStep === 3 ? `
          <!-- STEP 3: OPENCV IMAGE ENHANCEMENT (BEFORE / AFTER COMPARISON) -->
          <div class="space-y-3">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
              <span class="material-symbols-outlined text-[14px]">auto_fix_high</span> Step 3: Image Enhancement (OpenCV)
            </span>
            <h3 class="font-headline text-base font-semibold text-primary">Studio Quality Enhancement</h3>
            <p class="text-xs text-on-surface-variant">Median denoise, CLAHE tone rescue and saturation balance run on-device with the OpenCV.js engine.</p>

            <!-- Engine status -->
            <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low text-[11px]">
              <span class="flex items-center gap-1.5 font-semibold text-on-surface-variant">
                <span class="material-symbols-outlined text-[14px] ${state.cvReady ? 'text-primary' : (state.cvLoadFailed ? 'text-error' : 'text-secondary animate-pulse')}">memory</span>
                ${cvStatusLabel()}
              </span>
              <span class="text-on-surface-variant">${w.enhanceEngine === 'opencv-clahe' ? 'CLAHE + LAB pipeline' : (w.enhanceEngine === 'canvas-fallback' ? 'Canvas fallback' : '')}</span>
            </div>

            ${w.photos[0] ? `
              <!-- Before / after compare slider -->
              <div class="relative rounded-xl overflow-hidden aspect-[4/3] border border-surface-container select-none">
                <img src="${w.photos[0]}" class="absolute inset-0 w-full h-full object-cover" alt="Original photo"/>
                <div id="compare-after-layer" class="absolute inset-0" style="clip-path: inset(0 ${100 - w.comparePosition}% 0 0)">
                  ${w.enhancedPhoto
                    ? `<img src="${w.enhancedPhoto}" class="w-full h-full object-cover" alt="Enhanced photo"/>`
                    : (w.enhanceFailed
                      ? `<div class="w-full h-full bg-white flex items-center justify-center text-center text-on-surface-variant text-xs p-4">Preview unavailable for this demo image — take or upload your own photo in Step 2 to see live enhancement.</div>`
                      : `<div class="w-full h-full bg-white flex flex-col items-center justify-center text-on-surface-variant text-xs gap-2">
                           <span class="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                           ${state.cvLoadFailed ? 'Processing with canvas fallback...' : 'Processing with OpenCV...'}
                         </div>`)}
                </div>
                <div id="compare-handle" class="absolute top-0 bottom-0 w-0.5 bg-white shadow-md" style="left:${w.comparePosition}%">
                  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-earth-md flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[16px]">compare_arrows</span>
                  </div>
                </div>
                <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px]">Before</span>
                <span class="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary/80 text-white text-[10px]">After</span>
              </div>
              <input type="range" min="0" max="100" value="${w.comparePosition}" oninput="updateComparePosition(this.value)" class="w-full accent-[#004525]"/>
              <div class="flex justify-between text-[10px] text-on-surface-variant"><span>◀ Original</span><span>Enhanced ▶</span></div>

              <!-- GrabCut background-removal preview -->
              <button onclick="runGrabCutCutout()" ${state.cvBusy ? 'disabled' : ''} class="w-full h-11 rounded-xl bg-surface-container-high text-primary font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-surface-container-highest ${state.cvBusy ? 'opacity-60' : ''}">
                <span class="material-symbols-outlined text-[16px]">content_cut</span>
                ${state.cvBusy ? 'GrabCut segmenting...' : 'Auto Cutout Preview (GrabCut)'}
              </button>
              ${w.cutoutPhoto ? `<img src="${w.cutoutPhoto}" class="w-full rounded-xl border border-surface-container" alt="Background removed preview"/>` : ''}
            ` : `
              <div class="p-4 rounded-xl bg-surface-container-low border border-dashed border-surface-container-highest text-center text-xs text-on-surface-variant">
                Add a photo in Step 2 first, then OpenCV will enhance it here.
              </div>
            `}
          </div>
        ` : ''}

        ${w.currentStep === 4 ? `
          <!-- STEP 4: PRODUCT & SEO DESCRIPTION (auto-filled from voice + photo) -->
          <div class="space-y-3 text-xs">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
              <span class="material-symbols-outlined text-[14px]">edit_note</span> Step 4: Product & SEO Description
            </span>
            <h3 class="font-headline text-base font-semibold text-primary">Verify Generated Details</h3>

            ${renderProductIntelligenceCard(w)}

            <div>
              <label class="block font-semibold text-on-surface mb-1">Craft Title</label>
              <input type="text" value="${w.title}" oninput="updateWorkflowField('title', this.value)" class="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-surface-container text-on-surface font-medium"/>
            </div>

            <div>
              <label class="block font-semibold text-on-surface mb-1">Materials Used</label>
              <input type="text" value="${w.materials}" oninput="updateWorkflowField('materials', this.value)" class="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-surface-container text-on-surface font-medium"/>
            </div>

            <div>
              <label class="block font-semibold text-on-surface mb-1">Dimensions & Weight</label>
              <div class="grid grid-cols-2 gap-2">
                <input type="text" value="${w.dimensions}" oninput="updateWorkflowField('dimensions', this.value)" class="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-surface-container text-on-surface font-medium"/>
                <input type="text" value="${w.weight}" oninput="updateWorkflowField('weight', this.value)" class="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-surface-container text-on-surface font-medium"/>
              </div>
            </div>

            <div>
              <label class="block font-semibold text-on-surface mb-1">Story Lore</label>
              <textarea rows="2" oninput="updateWorkflowField('storyText', this.value)" class="w-full p-2.5 rounded-xl bg-surface-container-low border border-surface-container text-on-surface font-medium">${w.storyText}</textarea>
            </div>
          </div>
        ` : ''}

        ${w.currentStep === 5 ? `
          <!-- STEP 5: AI PRICE PREDICTION -->
          <div class="space-y-3 text-xs">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
              <span class="material-symbols-outlined text-[14px]">trending_up</span> Step 5: Price Recommendation
            </span>
            <h3 class="font-headline text-base font-semibold text-primary">Fair Market Pricing</h3>

            <div class="p-4 rounded-xl bg-surface-container-low border border-surface-container space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-on-surface-variant font-medium">Suggested Retail Price</span>
                <span class="text-xl font-semibold text-primary">₹${w.suggestedPrice}</span>
              </div>
              <div class="flex items-center justify-between text-[11px] text-on-surface-variant border-t border-surface-container pt-2">
                <span>ONDC Market Range</span>
                <span class="font-bold">₹${w.marketMin} – ₹${w.marketMax}</span>
              </div>
              <div class="flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>Calculated Cost Floor</span>
                <span class="font-medium text-secondary">₹${w.costFloor}</span>
              </div>
            </div>

            <div>
              <label class="block font-semibold text-on-surface mb-1">Set Your Final Price (₹)</label>
              <input id="workflow-price-input" oninput="updateWorkflowPrice(this.value)" type="number" value="${w.userPrice}" class="w-full h-12 px-3 rounded-xl bg-surface-container-low border border-surface-container text-base font-semibold text-primary"/>
            </div>
          </div>
        ` : ''}

        ${w.currentStep === 6 ? `
          <!-- STEP 6: PRICE GUARD & MARGIN VALIDATION -->
          <div class="space-y-3 text-xs">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
              <span class="material-symbols-outlined text-[14px]">shield</span> Step 6: Price Guard
            </span>
            <h3 class="font-headline text-base font-semibold text-primary">Artisan Protection Check</h3>

            ${w.userPrice < w.costFloor ? `
              <div class="p-3.5 rounded-xl bg-error-container text-on-error-container space-y-1">
                <div class="flex items-center gap-1.5 font-bold">
                  <span class="material-symbols-outlined text-[18px]">warning</span> Price Guard Warning
                </div>
                <p>Your price (₹${w.userPrice}) is below your minimum cost floor of ₹${w.costFloor}. You may lose money on raw brass casting.</p>
              </div>
            ` : `
              <div class="p-3.5 rounded-xl bg-[#e8f8e7] text-[#1f5d3a] space-y-1">
                <div class="flex items-center gap-1.5 font-bold">
                  <span class="material-symbols-outlined text-[18px]">check_circle</span> Safe Profit Margin
                </div>
                <p>Your price provides a healthy 26.1% profit margin above metal casting costs.</p>
              </div>
            `}

            <div class="p-3 rounded-xl bg-surface-container-low flex justify-between font-bold">
              <span>Expected Direct Payout:</span>
              <span class="text-primary">₹${Math.round(w.userPrice * 0.892)}</span>
            </div>
          </div>
        ` : ''}

        ${w.currentStep === 7 ? `
          <!-- STEP 7: CONFIDENCE ROUTING -->
          <div class="space-y-3 text-xs text-center">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
              <span class="material-symbols-outlined text-[14px]">psychology</span> Step 7: Confidence Routing
            </span>
            <h3 class="font-headline text-base font-semibold text-primary">AI Confidence Score</h3>

            <div class="flex justify-center py-2">
              <div class="w-24 h-24 rounded-full border-4 border-primary flex flex-col items-center justify-center bg-surface-container-low shadow-earth-sm">
                <span class="text-2xl font-semibold text-primary">${w.confidenceScore}%</span>
                <span class="text-[10px] text-on-surface-variant font-medium">Confidence</span>
              </div>
            </div>

            <p class="text-on-surface-variant max-w-xs mx-auto">
              ${w.confidenceScore >= 90
                ? 'Confidence score is above 90%. Your craft qualifies for Instant Auto-Publishing on the ONDC Network.'
                : 'Confidence is below 90%. Your craft will be routed to a Field Ambassador for quick human verification before publishing.'}
            </p>
          </div>
        ` : ''}

        ${w.currentStep === 8 ? `
          <!-- STEP 8: ARTISAN VERIFICATION PRE-CHECK -->
          <div class="space-y-3 text-xs">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
              <span class="material-symbols-outlined text-[14px]">verified_user</span> Step 8: Pre-Publishing Check
            </span>
            <h3 class="font-headline text-base font-semibold text-primary">Compliance Verification</h3>

            <div class="space-y-2">
              <div class="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
                <span>GI Tag Certification</span>
                <span class="text-primary font-bold">Verified (Bastar Dokra)</span>
              </div>
              <div class="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
                <span>Direct Bank Account</span>
                <span class="text-primary font-bold">Connected (Bank of Baroda)</span>
              </div>
              <div class="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
                <span>ONDC Catalog Compliance</span>
                <span class="text-primary font-bold">100% Passed</span>
              </div>
            </div>
          </div>
        ` : ''}

        ${w.currentStep === 9 ? `
          <!-- STEP 9: ONDC PUBLISHING PROTOCOL SIMULATION -->
          <div class="space-y-4 text-xs text-center py-4">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
              <span class="material-symbols-outlined text-[14px]">hub</span> Step 9: ONDC Network Broadcast
            </span>
            <h3 class="font-headline text-base font-semibold text-primary">Broadcasting to Buyer Apps</h3>
            
            <div class="flex justify-center py-2">
              <div class="w-16 h-16 rounded-full bg-primary-container text-white flex items-center justify-center animate-spin">
                <span class="material-symbols-outlined text-2xl">sync</span>
              </div>
            </div>

            <p class="text-on-surface-variant">Connecting BPP Seller Node to ONDC Gateway. Paytm, Mystore, and Pincode buyer apps are syncing catalog item.</p>
          </div>
        ` : ''}

        ${w.currentStep === 10 ? `
          <!-- STEP 10: SUCCESS SCREEN -->
          <div class="space-y-3 text-center py-2">
            <div class="w-16 h-16 rounded-full bg-[#e8f8e7] text-[#1f5d3a] flex items-center justify-center mx-auto shadow-earth-sm">
              <span class="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <h3 class="font-headline text-lg font-semibold text-primary">Published to ONDC!</h3>
            <p class="text-xs text-on-surface-variant max-w-xs mx-auto">Your craft is now live across all ONDC buyer applications in India.</p>

            <div class="p-3 rounded-xl bg-surface-container-low border border-surface-container text-xs space-y-1">
              <span class="font-medium text-secondary">ONDC Product ID:</span>
              <p class="font-mono text-primary font-bold">${w.publishedOndcId}</p>
            </div>
          </div>
        ` : ''}

        ${w.currentStep === 11 ? `
          <!-- STEP 11: RETURN TO DASHBOARD -->
          <div class="space-y-3 text-center py-4">
            <h3 class="font-headline text-lg font-semibold text-primary">Ready to Fulfill Orders</h3>
            <p class="text-xs text-on-surface-variant">When buyers purchase on Paytm or Mystore, you will receive an immediate voice notification.</p>
          </div>
        ` : ''}

        <!-- CONTROLS FOOTER -->
        <div class="flex items-center gap-2 pt-2 border-t border-surface-container">
          ${w.currentStep > 1 && w.currentStep < 10 ? `
            <button onclick="workflowStep(-1)" class="h-12 px-4 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high">
              Back
            </button>
          ` : ''}

          ${w.currentStep < 10 ? `
            <button onclick="workflowStep(1)" class="flex-1 h-12 rounded-xl bg-primary text-white font-semibold text-xs shadow-earth-sm hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 active:scale-95">
              <span>Continue to Step ${w.currentStep + 1}</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ` : `
            <button onclick="finishSellWorkflow()" class="w-full h-12 rounded-xl bg-secondary text-white font-semibold text-xs shadow-earth-sm hover:bg-secondary/90 transition-all flex items-center justify-center gap-1.5 active:scale-95">
              <span class="material-symbols-outlined text-[16px]">dashboard</span>
              <span>Return to Artisan Dashboard</span>
            </button>
          `}
        </div>

      </div>

    </div>
  `;
}

function workflowStep(delta) {
  state.sellWorkflow.currentStep += delta;
  if (state.sellWorkflow.currentStep > 11) state.sellWorkflow.currentStep = 11;
  if (state.sellWorkflow.currentStep < 1) state.sellWorkflow.currentStep = 1;
  renderCurrentScreen();
}

function updateWorkflowPrice(val) {
  state.sellWorkflow.userPrice = parseInt(val) || 0;
}

function finishSellWorkflow() {
  state.sellWorkflow.currentStep = 1;
  navigateTo('artisan_dashboard');
  showToast("Craft catalog refreshed with live ONDC listing", "check_circle");
}

// ----------------------------------------------------
// SCREEN 3: ARTISAN AMOUNT STATUS
// ----------------------------------------------------
function renderArtisanAmount() {
  const user = JUNGLE_DATA.currentUser;

  return `
    <div class="px-4 py-4 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-surface-container">
        <div>
          <h2 class="font-headline text-lg font-semibold text-primary">Amount & Wallet Status</h2>
          <span class="text-xs text-on-surface-variant">Direct Bank Settlement on ONDC</span>
        </div>
        <span class="px-2.5 py-1 rounded-full bg-[#e8f8e7] text-[#1f5d3a] text-xs font-bold">Bank of Baroda</span>
      </div>

      <!-- Main Balance Card -->
      <div class="p-5 rounded-2xl bg-primary text-white space-y-3 shadow-earth-md">
        <span class="text-xs text-white/80">Available Wallet Balance</span>
        <div class="flex items-baseline justify-between">
          <span class="text-3xl font-bold font-headline text-white">₹${user.walletBalance.toLocaleString()}</span>
          <button onclick="withdrawFunds()" class="h-10 px-4 rounded-xl bg-secondary text-white text-xs font-bold shadow-earth-sm hover:bg-secondary/90 active:scale-95">
            Withdraw to Bank
          </button>
        </div>
      </div>

      <!-- Breakdown Cards (Pending vs Received vs Deductions) -->
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div class="p-3.5 rounded-xl bg-white border border-surface-container shadow-earth-sm">
          <span class="text-on-surface-variant block">Pending Settlement</span>
          <span class="text-base font-bold text-[#b45309] mt-1 block">₹${user.pendingPayout.toLocaleString()}</span>
          <span class="text-[10px] text-on-surface-variant">Releases on buyer delivery</span>
        </div>

        <div class="p-3.5 rounded-xl bg-white border border-surface-container shadow-earth-sm">
          <span class="text-on-surface-variant block">Platform Deductions</span>
          <span class="text-base font-semibold text-primary mt-1 block">0% Platform Fee</span>
          <span class="text-[10px] text-on-surface-variant">100% direct artisan network</span>
        </div>
      </div>

      <!-- Recent Payout Transactions -->
      <div class="space-y-2.5">
        <h3 class="font-headline font-semibold text-base text-primary">Recent Bank Transfers</h3>
        <div class="space-y-2">
          ${JUNGLE_DATA.orders.map(o => `
            <div class="p-3.5 rounded-xl bg-white border border-surface-container flex items-center justify-between text-xs shadow-earth-sm">
              <div class="space-y-0.5">
                <span class="font-bold text-on-surface">${o.productTitle}</span>
                <span class="text-[11px] text-on-surface-variant block">${o.id} • ${o.date}</span>
              </div>
              <div class="text-right">
                <span class="font-bold text-[#1f5d3a]">+₹${o.artisanPayout.toLocaleString()}</span>
                <span class="text-[10px] text-on-surface-variant block">${o.status === 'DELIVERED' ? 'Settled' : 'In Escrow'}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function withdrawFunds() {
  showToast("Transfer of ₹14,850 initiated to Bank of Baroda account", "account_balance");
}

// ----------------------------------------------------
// SCREEN 4: ARTISAN ORDERS & FULFILLMENT
// ----------------------------------------------------
function renderArtisanOrders() {
  return `
    <div class="px-4 py-4 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-surface-container">
        <div>
          <h2 class="font-headline text-lg font-semibold text-primary">Artisan Orders & Logistics</h2>
          <span class="text-xs text-on-surface-variant">Fulfill buyer orders through ONDC pickup</span>
        </div>
        <span class="px-2.5 py-1 rounded-full bg-primary-container text-white text-xs font-bold">${JUNGLE_DATA.orders.length} Active</span>
      </div>

      <div class="space-y-3">
        ${JUNGLE_DATA.orders.map(order => `
          <div class="p-4 rounded-2xl bg-white border border-surface-container space-y-3 shadow-earth-sm">
            <div class="flex items-center justify-between border-b border-surface-container pb-2 text-xs">
              <span class="font-mono font-semibold text-primary">${order.id}</span>
              <span class="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-medium text-[10px]">${order.status}</span>
            </div>

            <div class="flex items-center gap-3">
              <img src="${order.productImage}" alt="${order.productTitle}" class="w-14 h-14 rounded-xl object-cover flex-shrink-0"/>
              <div class="flex-1 min-w-0 text-xs">
                <h4 class="font-medium text-on-surface truncate">${order.productTitle}</h4>
                <p class="text-on-surface-variant">${order.buyerName} • ${order.buyerCity}</p>
                <div class="flex items-center justify-between mt-1">
                  <span class="text-on-surface-variant">Qty: ${order.quantity}</span>
                  <span class="font-semibold text-primary">₹${order.artisanPayout.toLocaleString()} Payout</span>
                </div>
              </div>
            </div>

            <!-- Action: Advance state machine -->
            <div class="flex items-center gap-2 pt-1">
              ${order.status === 'CONFIRMED' ? `
                <button onclick="advanceOrderStatus('${order.id}', 'PROCESSING')" class="flex-1 h-10 rounded-xl bg-primary text-white text-xs font-bold shadow-earth-sm active:scale-95">
                  Pack in Bamboo Box
                </button>
              ` : order.status === 'PROCESSING' ? `
                <button onclick="advanceOrderStatus('${order.id}', 'SHIPPED')" class="flex-1 h-10 rounded-xl bg-secondary text-white text-xs font-bold shadow-earth-sm active:scale-95">
                  Hand Over to Delhivery
                </button>
              ` : `
                <span class="text-xs text-[#1f5d3a] font-bold flex items-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span> In Transit / Delivered
                </span>
              `}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function advanceOrderStatus(orderId, nextState) {
  const order = JUNGLE_DATA.orders.find(o => o.id === orderId);
  if (order) {
    order.status = nextState;
    eventBus.emit('order_status_updated', order);
  }
}

// ----------------------------------------------------
// SCREEN 5: ARTISAN GUILD & NETWORK PROFILE
// ----------------------------------------------------
function renderArtisanGuildProfile() {
  const user = JUNGLE_DATA.currentUser;

  return `
    <div class="px-4 py-4 space-y-4">
      <div class="p-5 rounded-2xl bg-white border border-surface-container shadow-earth-md text-center space-y-3">
        <img src="${user.avatar}" alt="${user.name}" class="w-20 h-20 rounded-2xl object-cover mx-auto ring-4 ring-primary/20"/>
        <div>
          <h2 class="font-headline text-lg font-semibold text-primary">${user.name}</h2>
          <span class="text-xs text-on-surface-variant">${user.village}</span>
        </div>
        <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-white text-xs font-semibold">
          <span class="material-symbols-outlined text-[14px]">verified</span> ${user.giCertificateNumber}
        </div>
      </div>

      <!-- QR Code for Onboarding new village artisans -->
      <div class="p-5 rounded-2xl bg-surface-container-low border border-surface-container text-center space-y-3 shadow-earth-sm">
        <h3 class="font-headline font-semibold text-base text-primary">Artisan Network QR</h3>
        <p class="text-xs text-on-surface-variant max-w-xs mx-auto">Share this QR code with other artisans in your village to connect them to Jungle Market ONDC node.</p>
        
        <div class="w-40 h-40 bg-white p-2 rounded-xl mx-auto shadow-earth-sm flex items-center justify-center border border-surface-container">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://junglemarket.in/join/${user.referralCode}" alt="Artisan QR" class="w-full h-full"/>
        </div>

        <div class="text-xs font-medium text-secondary">
          Referral Code: <span class="font-mono">${user.referralCode}</span>
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 6: BUYER HOME
// ----------------------------------------------------
function renderBuyerHome() {
  const products = getFilteredBuyerProducts();
  const hasVoiceFilter = state.searchQuery || state.voiceSearchMaxPrice || state.voiceSearchCategory;
  return `
    <div class="px-4 py-4 space-y-5">
      
      <!-- Hero Banner -->
      <div class="p-5 rounded-2xl bg-primary text-white shadow-earth-md space-y-3 relative overflow-hidden">
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[11px] font-semibold">
          <span class="material-symbols-outlined text-[13px]">forest</span> Direct Tribal Sourcing
        </span>
        <h2 class="font-headline text-xl font-bold leading-snug">Handmade crafts from the heart of Bastar.</h2>
        <p class="text-xs text-white/80 max-w-xs">Every purchase transfers 89% directly into the artisan bank account through ONDC network.</p>
        
        <div class="flex items-center gap-2 pt-2">
          <button onclick="navigateTo('categories')" class="h-11 px-4 rounded-xl bg-secondary text-white font-semibold text-xs shadow-earth-sm hover:bg-secondary/90 active:scale-95 flex items-center gap-1.5">
            <span>Explore Crafts</span>
            <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
          <button onclick="openBulkModal()" class="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 active:scale-95">
            Bulk Inquiries
          </button>
        </div>
      </div>

      <!-- Categories Carousel -->
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <h3 class="font-headline font-semibold text-base text-primary">Craft Categories</h3>
          <button onclick="navigateTo('categories')" class="text-xs font-medium text-secondary hover:underline">View All</button>
        </div>
        <div class="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          ${JUNGLE_DATA.categories.map(c => `
            <div onclick="navigateTo('categories')" class="w-32 flex-shrink-0 p-3 rounded-xl bg-white border border-surface-container shadow-earth-sm cursor-pointer hover:border-primary transition-all">
              <img src="${c.image}" alt="${c.name}" class="w-full h-20 rounded-lg object-cover mb-2"/>
              <h4 class="text-xs font-medium text-on-surface truncate">${c.name}</h4>
              <span class="text-[10px] text-on-surface-variant block">${c.itemCount} items</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Featured Product Cards -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-headline font-semibold text-base text-primary">Featured Masterpieces</h3>
          <span class="text-xs text-secondary font-medium">GI Certified</span>
        </div>

        ${hasVoiceFilter ? `
          <!-- Active voice search filter -->
          <div class="flex items-center justify-between gap-2 p-3 rounded-xl bg-surface-container-low border border-primary/20">
            <div class="text-xs min-w-0">
              <span class="font-semibold text-primary flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">mic</span> Voice filter active
              </span>
              <p class="text-on-surface-variant truncate">"${state.searchQuery}"${state.voiceSearchMaxPrice ? ` • under ₹${state.voiceSearchMaxPrice.toLocaleString()}` : ""}${state.voiceSearchCategory ? ` • ${state.voiceSearchCategory}` : ""} — ${products.length} match${products.length === 1 ? "" : "es"}</p>
            </div>
            <button onclick="clearVoiceSearch()" title="Clear filter" class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant flex-shrink-0 active:scale-90">
              <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ` : ""}

        <div class="space-y-3">
          ${products.map(product => `
            <div class="p-3.5 rounded-2xl bg-white border border-surface-container shadow-earth-sm space-y-3">
              <div class="flex gap-3">
                <img src="${product.image}" alt="${product.title}" class="w-24 h-24 rounded-xl object-cover flex-shrink-0 cursor-pointer" onclick="navigateTo('product_detail', { product: ${JSON.stringify(product).replace(/"/g, '&quot;')} })"/>
                <div class="flex-1 min-w-0 text-xs space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-medium text-secondary uppercase">${product.category}</span>
                    <span class="flex items-center text-[11px] font-bold text-[#b45309]">
                      <span class="material-symbols-outlined text-[13px] fill-1">star</span> ${product.rating}
                    </span>
                  </div>
                  <h4 class="font-headline font-semibold text-sm text-primary truncate cursor-pointer" onclick="navigateTo('product_detail', { product: ${JSON.stringify(product).replace(/"/g, '&quot;')} })">${product.title}</h4>
                  <p class="text-on-surface-variant truncate">${product.artisanName} • ${product.artisanVillage}</p>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-sm font-semibold text-primary">₹${product.price.toLocaleString()}</span>
                    <span class="text-[10px] text-[#1f5d3a] font-bold">₹${product.payoutArtisan} to Artisan</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-1 border-t border-surface-container">
                <button onclick="addToCart('${product.id}')" class="flex-1 h-11 rounded-xl bg-primary text-white font-semibold text-xs shadow-earth-sm hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 active:scale-95 watermelon-shimmer-btn">
                  <span class="material-symbols-outlined text-[16px]">shopping_cart</span>
                  <span>Add to Basket</span>
                </button>
                <button onclick="navigateTo('product_detail', { product: ${JSON.stringify(product).replace(/"/g, '&quot;')} })" class="h-11 px-3.5 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high">
                  Story Lore
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 7: BUYER CATEGORIES
// ----------------------------------------------------
function renderBuyerCategories() {
  return `
    <div class="px-4 py-4 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-surface-container">
        <div>
          <h2 class="font-headline text-lg font-semibold text-primary">Craft Categories</h2>
          <span class="text-xs text-on-surface-variant">Explore traditional heritage crafts</span>
        </div>
        <button onclick="navigateHome()" class="text-xs font-medium text-secondary">Back Home</button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        ${JUNGLE_DATA.categories.map(c => `
          <div onclick="navigateTo('home')" class="p-3.5 rounded-2xl bg-white border border-surface-container shadow-earth-sm space-y-2 cursor-pointer hover:border-primary transition-all">
            <img src="${c.image}" alt="${c.name}" class="w-full h-28 rounded-xl object-cover"/>
            <h4 class="font-headline font-semibold text-xs text-primary">${c.name}</h4>
            <p class="text-[10px] text-on-surface-variant line-clamp-2">${c.description}</p>
            <div class="flex items-center justify-between pt-1 text-[11px] font-medium text-secondary">
              <span>${c.itemCount} Crafts</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 8: PRODUCT DETAIL SCREEN
// ----------------------------------------------------
function renderProductDetail() {
  const p = state.selectedProduct;

  return `
    <div class="space-y-4 pb-6">
      
      <!-- Top Image Hero -->
      <div class="relative w-full aspect-[4/3] bg-black">
        <img src="${p.image}" alt="${p.title}" class="w-full h-full object-cover"/>
        <button onclick="navigateTo('home')" class="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center">
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <span class="absolute bottom-3 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold">
          GI Certified Bastar Craft
        </span>
      </div>

      <div class="px-4 space-y-4">
        <!-- Title & Pricing -->
        <div class="space-y-1">
          <span class="text-xs font-medium text-secondary uppercase">${p.category}</span>
          <h2 class="font-headline text-xl font-semibold text-primary">${p.title}</h2>
          <div class="flex items-center justify-between pt-2">
            <span class="text-2xl font-bold font-headline text-primary">₹${p.price.toLocaleString()}</span>
            <span class="text-xs font-bold text-on-surface-variant">${p.stockQuantity} pieces in stock</span>
          </div>
        </div>

        <!-- Transparent Payout Meter (ONDC Architecture Feature) -->
        <div class="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container space-y-2 text-xs shadow-earth-sm">
          <div class="flex items-center justify-between font-bold">
            <span class="text-primary flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px] text-surface-tint">account_balance</span>
              <span>Transparent Artisan Payout</span>
            </span>
            <span class="text-secondary">89.2% Direct Share</span>
          </div>
          <div class="w-full h-2.5 rounded-full bg-surface-container overflow-hidden flex">
            <div class="bg-primary h-full" style="width: 89.2%"></div>
            <div class="bg-secondary h-full" style="width: 7.3%"></div>
            <div class="bg-outline h-full" style="width: 3.5%"></div>
          </div>
          <div class="flex items-center justify-between text-[10px] text-on-surface-variant">
            <span>₹${p.payoutArtisan} to Artisan</span>
            <span>₹${p.payoutLogistics} Logistics</span>
            <span>₹${p.payoutNetwork} Network</span>
          </div>
        </div>

        <!-- Audio Story Lore (Voice Lore Player) -->
        <div class="p-4 rounded-2xl bg-white border border-surface-container space-y-2 shadow-earth-sm">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">graphic_eq</span>
              </div>
              <div>
                <h4 class="font-semibold text-xs text-primary">Listen to Artisan Story</h4>
                <span class="text-[10px] text-on-surface-variant">${p.artisanName} in mother tongue</span>
              </div>
            </div>
            <button onclick="toggleAudioStory('product_lore')" class="h-9 px-3 rounded-lg ${state.isPlayingProductLoreAudio ? 'bg-secondary text-white' : 'bg-primary text-white'} text-xs font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">${state.isPlayingProductLoreAudio ? 'stop' : 'play_arrow'}</span>
              <span>${state.isPlayingProductLoreAudio ? 'Stop' : 'Play'}</span>
            </button>
          </div>
          
          ${state.isPlayingProductLoreAudio ? `
            <div class="flex items-center gap-1 h-6 text-primary pt-1">
              <div class="audio-waveform-bar"></div>
              <div class="audio-waveform-bar"></div>
              <div class="audio-waveform-bar"></div>
              <div class="audio-waveform-bar"></div>
              <div class="audio-waveform-bar"></div>
              <div class="audio-waveform-bar"></div>
              <div class="audio-waveform-bar"></div>
            </div>
            <p class="text-[11px] text-on-surface italic bg-surface-container-low p-2.5 rounded-lg">"${p.voiceLore}"</p>
          ` : ''}
        </div>

        <!-- Product Story Lore & Materials -->
        <div class="space-y-2 text-xs">
          <h3 class="font-headline font-semibold text-sm text-primary">Craft Heritage Story</h3>
          <p class="text-on-surface-variant leading-relaxed">${p.story}</p>
          
          <div class="grid grid-cols-2 gap-2 pt-2">
            <div class="p-2.5 rounded-xl bg-surface-container-low">
              <span class="text-on-surface-variant text-[10px] block">Materials</span>
              <span class="font-bold text-on-surface">${p.materials}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-container-low">
              <span class="text-on-surface-variant text-[10px] block">Dimensions</span>
              <span class="font-bold text-on-surface">${p.dimensions}</span>
            </div>
          </div>
        </div>

        <!-- Sticky Bottom CTA -->
        <div class="pt-4">
          <button onclick="addToCart('${p.id}')" class="w-full h-12 rounded-xl bg-primary text-white font-semibold text-sm shadow-earth-md hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2 watermelon-shimmer-btn">
            <span class="material-symbols-outlined text-[20px]">shopping_cart</span>
            <span>Add to Basket (₹${p.price.toLocaleString()})</span>
          </button>
        </div>

      </div>
    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 9: BULK BUYING PORTAL
// ----------------------------------------------------
function renderBulkBuying() {
  return `
    <div class="px-4 py-4 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-surface-container">
        <div>
          <h2 class="font-headline text-lg font-semibold text-primary">Bulk B2B Sourcing Hub</h2>
          <span class="text-xs text-on-surface-variant">Wholesale artisan procurement via ONDC</span>
        </div>
        <button onclick="openBulkModal()" class="h-10 px-3.5 rounded-xl bg-secondary text-white font-semibold text-xs shadow-earth-sm flex items-center gap-1 active:scale-95">
          <span class="material-symbols-outlined text-[16px]">add</span>
          <span>Request Quote</span>
        </button>
      </div>

      <!-- Value Props -->
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div class="p-3 rounded-xl bg-white border border-surface-container shadow-earth-sm">
          <span class="material-symbols-outlined text-primary text-xl">verified</span>
          <span class="font-medium block mt-1">GI Certified</span>
        </div>
        <div class="p-3 rounded-xl bg-white border border-surface-container shadow-earth-sm">
          <span class="material-symbols-outlined text-secondary text-xl">local_shipping</span>
          <span class="font-medium block mt-1">Direct Transit</span>
        </div>
        <div class="p-3 rounded-xl bg-white border border-surface-container shadow-earth-sm">
          <span class="material-symbols-outlined text-[#1f5d3a] text-xl">receipt</span>
          <span class="font-medium block mt-1">GST Invoices</span>
        </div>
      </div>

      <!-- Active RFQs & Bulk Inquiries -->
      <div class="space-y-2.5">
        <h3 class="font-headline font-semibold text-base text-primary">Active Sourcing RFQs (${JUNGLE_DATA.bulkRequests.length})</h3>
        <div class="space-y-2.5">
          ${JUNGLE_DATA.bulkRequests.map(req => `
            <div class="p-4 rounded-2xl bg-white border border-surface-container shadow-earth-sm space-y-2.5 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-primary">${req.buyerOrg}</span>
                <span class="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-medium text-[10px]">${req.status}</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-on-surface-variant">
                <div>Category: <strong class="text-on-surface">${req.productCategory}</strong></div>
                <div>Quantity: <strong class="text-on-surface">${req.targetQuantity} units</strong></div>
                <div>Target Unit Budget: <strong class="text-on-surface">₹${req.targetBudgetPerUnit}</strong></div>
                <div>Need By: <strong class="text-on-surface">${req.requiredDeliveryDate}</strong></div>
              </div>
              <p class="text-on-surface bg-surface-container-low p-2 rounded-lg italic">"${req.customRequirement}"</p>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 10: CHECKOUT SCREEN
// ----------------------------------------------------
function renderCheckoutScreen() {
  const total = state.cart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
  const artisanShare = Math.round(total * 0.892);

  return `
    <div class="px-4 py-4 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-surface-container">
        <div>
          <h2 class="font-headline text-lg font-semibold text-primary">Complete Your Order</h2>
          <span class="text-xs text-on-surface-variant">Secure ONDC Payment Protocol</span>
        </div>
        <button onclick="navigateTo('home')" class="text-xs font-medium text-secondary">Cancel</button>
      </div>

      <!-- Delivery Address -->
      <div class="p-4 rounded-2xl bg-white border border-surface-container space-y-2.5 shadow-earth-sm text-xs">
        <div class="flex items-center justify-between font-semibold text-primary">
          <span class="flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">pin_drop</span> Delivery Address
          </span>
          <span class="text-secondary cursor-pointer">Change</span>
        </div>
        <p class="text-on-surface font-medium">Rahul Verma • +91 98101 23456</p>
        <p class="text-on-surface-variant">Flat 402, Green Meadows, Vasant Kunj, New Delhi 110070</p>
      </div>

      <!-- Payment Breakdown -->
      <div class="p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-2.5 text-xs shadow-earth-sm">
        <h4 class="font-semibold text-primary">Direct Artisan Settlement</h4>
        <div class="flex justify-between text-on-surface-variant">
          <span>Items Total (${state.cart.length} craft)</span>
          <span class="font-bold text-on-surface">₹${total.toLocaleString()}</span>
        </div>
        <div class="flex justify-between text-on-surface-variant">
          <span>Delivery via Delhivery Surface</span>
          <span class="font-bold text-[#1f5d3a]">Free</span>
        </div>
        <div class="flex justify-between border-t border-surface-container pt-2 text-sm font-semibold text-primary">
          <span>Total Payment</span>
          <span>₹${total.toLocaleString()}</span>
        </div>
        <div class="p-2.5 rounded-xl bg-white text-[#1f5d3a] font-medium text-[11px] flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">account_balance</span>
          <span>₹${artisanShare.toLocaleString()} transfers directly to the artisan bank account.</span>
        </div>
      </div>

      <button onclick="placeOrder()" class="w-full h-13 py-3.5 rounded-xl bg-secondary text-white font-semibold text-sm shadow-earth-md hover:bg-secondary/90 active:scale-95 transition-all flex items-center justify-center gap-2">
        <span>Pay ₹${total.toLocaleString()} & Confirm Order</span>
        <span class="material-symbols-outlined text-[18px]">lock</span>
      </button>
    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 11: ORDER SUCCESS & ONDC TRACKING
// ----------------------------------------------------
function renderOrderSuccess() {
  const o = state.selectedOrder;

  return `
    <div class="px-4 py-8 text-center space-y-4">
      <div class="w-20 h-20 rounded-full bg-[#e8f8e7] text-[#1f5d3a] flex items-center justify-center mx-auto shadow-earth-md">
        <span class="material-symbols-outlined text-4xl">check_circle</span>
      </div>
      
      <div class="space-y-1">
        <span class="text-xs font-medium text-secondary uppercase">Order Confirmed</span>
        <h2 class="font-headline text-2xl font-semibold text-primary">Payment Complete!</h2>
        <p class="text-xs text-on-surface-variant max-w-xs mx-auto">The artisan was notified. Your craft is being packed in a traditional bamboo case.</p>
      </div>

      <div class="p-4 rounded-2xl bg-white border border-surface-container text-left space-y-3 shadow-earth-sm text-xs">
        <div class="flex justify-between border-b border-surface-container pb-2 font-bold">
          <span class="text-primary">${o.id}</span>
          <span class="text-secondary">₹${o.totalAmount.toLocaleString()}</span>
        </div>
        <p class="font-bold text-on-surface">${o.productTitle}</p>
        <p class="text-on-surface-variant">Tracking: <span class="font-mono text-primary font-bold">${o.trackingNumber}</span></p>
      </div>

      <div class="flex gap-2 pt-2">
        <button onclick="navigateTo('buyer_orders')" class="flex-1 h-12 rounded-xl bg-primary text-white font-semibold text-xs shadow-earth-sm">
          Track Delivery
        </button>
        <button onclick="navigateTo('home')" class="h-12 px-4 rounded-xl bg-surface-container text-on-surface font-semibold text-xs">
          Continue Shopping
        </button>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 12: BUYER ORDERS TRACKING
// ----------------------------------------------------
function renderBuyerOrders() {
  return `
    <div class="px-4 py-4 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-surface-container">
        <div>
          <h2 class="font-headline text-lg font-semibold text-primary">Your Orders</h2>
          <span class="text-xs text-on-surface-variant">Live ONDC order status</span>
        </div>
        <span class="px-2.5 py-1 rounded-full bg-primary-container text-white text-xs font-bold">${JUNGLE_DATA.orders.length} Orders</span>
      </div>

      <div class="space-y-3">
        ${JUNGLE_DATA.orders.map(order => `
          <div class="p-4 rounded-2xl bg-white border border-surface-container space-y-3 shadow-earth-sm text-xs">
            <div class="flex items-center justify-between border-b border-surface-container pb-2">
              <span class="font-mono font-semibold text-primary">${order.id}</span>
              <span class="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-medium text-[10px]">${order.status}</span>
            </div>

            <div class="flex items-center gap-3">
              <img src="${order.productImage}" alt="${order.productTitle}" class="w-14 h-14 rounded-xl object-cover flex-shrink-0"/>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-on-surface truncate">${order.productTitle}</h4>
                <p class="text-on-surface-variant">${order.date} • ${order.shippingProvider}</p>
                <span class="font-semibold text-primary">₹${order.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <!-- Order Timeline State Stepper -->
            <div class="pt-2 border-t border-surface-container space-y-1.5">
              ${order.timeline.slice(0, 4).map(step => `
                <div class="flex items-center gap-2 text-[11px]">
                  <span class="material-symbols-outlined text-[14px] ${step.done ? 'text-primary font-bold' : 'text-outline'}">
                    ${step.done ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span class="${step.done ? 'font-bold text-on-surface' : 'text-on-surface-variant'}">${step.label}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 13: BUYER PROFILE
// ----------------------------------------------------
function renderBuyerProfile() {
  return `
    <div class="px-4 py-4 space-y-4">
      <div class="p-5 rounded-2xl bg-white border border-surface-container shadow-earth-sm text-center space-y-2">
        <div class="w-16 h-16 rounded-full bg-primary text-white font-semibold text-2xl flex items-center justify-center mx-auto">
          RV
        </div>
        <h2 class="font-headline text-lg font-semibold text-primary">Rahul Verma</h2>
        <span class="text-xs text-on-surface-variant">Verified Buyer • New Delhi</span>
      </div>

      <div class="space-y-2">
        <button onclick="navigateTo('buyer_orders')" class="w-full p-3.5 rounded-xl bg-white border border-surface-container flex items-center justify-between text-xs font-bold text-on-surface shadow-earth-sm">
          <span class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[18px]">receipt_long</span>
            <span>Order History</span>
          </span>
          <span class="material-symbols-outlined text-[16px] text-on-surface-variant">arrow_forward_ios</span>
        </button>

        <button onclick="navigateTo('bulk_buying')" class="w-full p-3.5 rounded-xl bg-white border border-surface-container flex items-center justify-between text-xs font-bold text-on-surface shadow-earth-sm">
          <span class="flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary text-[18px]">inventory_2</span>
            <span>My Bulk Requests</span>
          </span>
          <span class="material-symbols-outlined text-[16px] text-on-surface-variant">arrow_forward_ios</span>
        </button>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 14: AMBASSADOR DASHBOARD
// ----------------------------------------------------
function renderAmbassadorDashboard() {
  const amb = JUNGLE_DATA.ambassador;

  return `
    <div class="px-4 py-4 space-y-4">
      <div class="p-5 rounded-2xl bg-primary text-white shadow-earth-md space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[11px] text-on-primary-container font-bold uppercase">Field Ambassador Hub</span>
            <h2 class="font-headline text-xl font-bold text-white">${amb.name}</h2>
            <p class="text-xs text-white/80">${amb.location}</p>
          </div>
          <img src="${amb.avatar}" alt="${amb.name}" class="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/20"/>
        </div>

        <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center text-xs">
          <div class="bg-black/20 p-2.5 rounded-xl">
            <span class="text-white/70 text-[10px] block">Verified</span>
            <span class="font-semibold text-base text-[#94d4a7]">${amb.verifiedCount}</span>
          </div>
          <div class="bg-black/20 p-2.5 rounded-xl">
            <span class="text-white/70 text-[10px] block">In Queue</span>
            <span class="font-semibold text-base text-[#f1be65]">${amb.pendingQueueCount}</span>
          </div>
          <div class="bg-black/20 p-2.5 rounded-xl">
            <span class="text-white/70 text-[10px] block">Honorarium</span>
            <span class="font-semibold text-base text-white">₹${amb.earnedHonorarium.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button onclick="navigateTo('ambassador_verification')" class="h-14 p-3 rounded-xl bg-secondary text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-earth-sm active:scale-95">
          <span class="material-symbols-outlined text-[20px]">fact_check</span>
          <span>Inspect Queue</span>
        </button>
        <button onclick="navigateTo('ambassador_network')" class="h-14 p-3 rounded-xl bg-surface-container-high text-on-surface font-semibold text-xs flex items-center justify-center gap-2 shadow-earth-sm active:scale-95 border border-surface-container-highest">
          <span class="material-symbols-outlined text-[20px] text-primary">group_add</span>
          <span>Onboard Artisans</span>
        </button>
      </div>

      <!-- Pending Verification Highlights -->
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <h3 class="font-headline font-semibold text-base text-primary">Crafts Awaiting Inspection</h3>
          <button onclick="navigateTo('ambassador_verification')" class="text-xs font-medium text-secondary">View All</button>
        </div>
        <div class="space-y-2">
          ${amb.verificationQueue.slice(0, 2).map(item => `
            <div class="p-3.5 rounded-2xl bg-white border border-surface-container flex items-center justify-between gap-3 shadow-earth-sm text-xs">
              <img src="${item.image}" alt="${item.productTitle}" class="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-on-surface truncate">${item.productTitle}</h4>
                <p class="text-on-surface-variant">${item.artisanName} • ${item.category}</p>
                <span class="text-[#b45309] font-bold">AI Score: ${item.aiConfidenceScore}%</span>
              </div>
              <button onclick="navigateTo('ambassador_verification')" class="h-9 px-3 rounded-lg bg-primary text-white font-medium text-[11px]">
                Inspect
              </button>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 15: AMBASSADOR VERIFICATION QUEUE
// ----------------------------------------------------
function renderAmbassadorVerificationQueue() {
  const amb = JUNGLE_DATA.ambassador;

  return `
    <div class="px-4 py-4 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-surface-container">
        <div>
          <h2 class="font-headline text-lg font-semibold text-primary">Verification Inspection Queue</h2>
          <span class="text-xs text-on-surface-variant">Field lead physical verification</span>
        </div>
        <span class="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">${amb.verificationQueue.length} Items</span>
      </div>

      <div class="space-y-4">
        ${amb.verificationQueue.map(item => `
          <div class="p-4 rounded-2xl bg-white border border-surface-container space-y-3 shadow-earth-sm text-xs">
            <div class="flex items-center justify-between border-b border-surface-container pb-2">
              <span class="font-semibold text-primary">${item.id}</span>
              <span class="px-2 py-0.5 rounded ${item.status === 'APPROVED' ? 'bg-[#e8f8e7] text-[#1f5d3a]' : 'bg-secondary-container text-on-secondary-container'} font-medium text-[10px]">${item.status}</span>
            </div>

            <div class="flex gap-3">
              <img src="${item.image}" alt="${item.productTitle}" class="w-20 h-20 rounded-xl object-cover flex-shrink-0"/>
              <div class="flex-1 min-w-0 space-y-1">
                <h4 class="font-medium text-on-surface truncate">${item.productTitle}</h4>
                <p class="text-on-surface-variant">${item.artisanName} (${item.artisanVillage})</p>
                <p class="text-on-surface font-bold">Price: ₹${item.price} • Cost Floor: ₹${item.costFloor}</p>
                <div class="text-[#b45309] font-bold">AI Flag: ${item.reasonForFlag}</div>
              </div>
            </div>

            <div class="p-2.5 rounded-xl bg-surface-container-low text-on-surface italic">
              <span class="font-medium text-secondary">Audio Inspection Note:</span> "${item.audioNote}"
            </div>

            ${item.status === 'PENDING' ? `
              <div class="flex items-center gap-2 pt-1">
                <button onclick="approveVerification('${item.id}')" class="flex-1 h-11 rounded-xl bg-primary text-white font-semibold text-xs shadow-earth-sm active:scale-95">
                  Approve for ONDC
                </button>
                <button onclick="rejectVerification('${item.id}')" class="h-11 px-4 rounded-xl bg-surface-container text-error font-semibold text-xs hover:bg-error-container">
                  Request Changes
                </button>
              </div>
            ` : `
              <div class="text-[#1f5d3a] font-bold flex items-center gap-1">
                <span class="material-symbols-outlined text-[18px]">verified</span>
                <span>Approved & Synced to ONDC Network</span>
              </div>
            `}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function approveVerification(verifId) {
  const item = JUNGLE_DATA.ambassador.verificationQueue.find(v => v.id === verifId);
  if (item) {
    item.status = 'APPROVED';
    showToast(`Approved ${item.productTitle} for live ONDC broadcast!`, "verified");
    renderCurrentScreen();
  }
}

function rejectVerification(verifId) {
  showToast("Change request sent to artisan", "edit");
}

// ----------------------------------------------------
// SCREEN 16: AMBASSADOR NETWORK & QR
// ----------------------------------------------------
function renderAmbassadorNetwork() {
  const amb = JUNGLE_DATA.ambassador;

  return `
    <div class="px-4 py-4 space-y-4">
      <div class="p-5 rounded-2xl bg-surface-container-low border border-surface-container text-center space-y-3 shadow-earth-sm">
        <h2 class="font-headline font-semibold text-base text-primary">Onboard Rural Artisans</h2>
        <p class="text-xs text-on-surface-variant max-w-xs mx-auto">Let artisans scan this QR on their phones to register their village workshop to ONDC.</p>
        
        <div class="w-44 h-44 bg-white p-2 rounded-2xl mx-auto shadow-earth-sm flex items-center justify-center border border-surface-container">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://junglemarket.in/ambassador/${amb.referralCode}" alt="Ambassador QR" class="w-full h-full"/>
        </div>

        <span class="text-xs font-medium text-secondary">Referral Code: ${amb.referralCode}</span>
      </div>

      <div class="space-y-2.5">
        <h3 class="font-headline font-semibold text-base text-primary">Connected Artisans (${amb.networkMembers.length})</h3>
        <div class="space-y-2">
          ${amb.networkMembers.map(m => `
            <div class="p-3.5 rounded-xl bg-white border border-surface-container flex items-center justify-between text-xs shadow-earth-sm">
              <div>
                <h4 class="font-bold text-on-surface">${m.name}</h4>
                <span class="text-[11px] text-on-surface-variant">${m.village} • ${m.craftsCount} crafts</span>
              </div>
              <div class="text-right">
                <span class="font-semibold text-primary">${m.activeSales}</span>
                <span class="text-[10px] text-[#1f5d3a] block font-bold">${m.status}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 17: AMBASSADOR REPORTS
// ----------------------------------------------------
function renderAmbassadorReports() {
  return `
    <div class="px-4 py-4 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-surface-container">
        <div>
          <h2 class="font-headline text-lg font-semibold text-primary">Field Performance Reports</h2>
          <span class="text-xs text-on-surface-variant">Regional quality & verification analytics</span>
        </div>
        <span class="text-xs font-medium text-secondary">Bastar Region</span>
      </div>

      <div class="p-4 rounded-2xl bg-white border border-surface-container space-y-3 shadow-earth-sm text-xs">
        <h4 class="font-semibold text-primary">Quality Pass Rate (Last 30 Days)</h4>
        <div class="flex items-center justify-between text-lg font-semibold text-primary">
          <span>94.8% Pass Rate</span>
          <span class="text-xs text-[#1f5d3a]">+3.2% vs last month</span>
        </div>
        <div class="w-full h-3 rounded-full bg-surface-container overflow-hidden flex">
          <div class="bg-primary h-full" style="width: 94.8%"></div>
          <div class="bg-error h-full" style="width: 5.2%"></div>
        </div>
        <p class="text-on-surface-variant">84 verified craft items successfully cleared physical and GI inspections.</p>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// SCREEN 18: NOTIFICATIONS SCREEN
// ----------------------------------------------------
function renderNotificationsScreen() {
  return `
    <div class="px-4 py-4 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-surface-container">
        <div>
          <h2 class="font-headline text-lg font-semibold text-primary">Notifications</h2>
          <span class="text-xs text-on-surface-variant">Orders, payouts, and verifications</span>
        </div>
        <button onclick="markAllNotifsRead()" class="text-xs font-medium text-secondary">Mark All Read</button>
      </div>

      <div class="space-y-2.5">
        ${JUNGLE_DATA.notifications.map(n => `
          <div class="p-3.5 rounded-2xl bg-white border border-surface-container space-y-2 shadow-earth-sm text-xs ${n.unread ? 'border-primary/40 bg-surface-container-low/40' : ''}">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-primary flex items-center gap-1.5">
                ${n.unread ? '<span class="w-2 h-2 rounded-full bg-secondary"></span>' : ''}
                ${n.title}
              </span>
              <span class="text-[10px] text-on-surface-variant">${n.time}</span>
            </div>
            <p class="text-on-surface leading-relaxed">${n.message}</p>
            <div class="flex items-center justify-between pt-1">
              <span class="font-medium text-secondary">${n.amount || ''}</span>
              <button onclick="navigateTo('${n.actionScreen}')" class="h-8 px-3 rounded-lg bg-primary text-white font-medium text-[11px] shadow-earth-sm">
                ${n.actionLabel}
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function markAllNotifsRead() {
  JUNGLE_DATA.notifications.forEach(n => n.unread = false);
  updateHeaderAndNav();
  renderCurrentScreen();
  showToast("All notifications marked as read", "done_all");
}

// ==========================================
// 9. INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Prime the voice extraction preview from the demo transcript (display only,
  // field merging happens when the artisan records or types a new description)
  state.sellWorkflow.extractedInfo = extractProductFromSpeech(state.sellWorkflow.voiceTranscript);
  setRole('artisan');
  updateHeaderAndNav();
  renderCurrentScreen();
});
