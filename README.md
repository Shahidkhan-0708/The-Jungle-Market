# 🌿 The Jungle Market

**Bridging the Digital Literacy Gap for Rural Artisans via Zero-Instruction AI Architecture.**

The Jungle Market is a next-generation, ONDC-compliant e-commerce platform designed to empower grassroots artisans in India. By utilizing edge-based Speech Recognition and Multimodal AI, we allow rural makers to publish premium, globally discoverable crafts using only their natural voice and a single raw photograph—completely eliminating the need for complex forms or digital literacy.

---

## ✨ Core AI Integrations

* **🎙️ Voice-to-Listing AI Scribe:** Artisans speak naturally in their regional dialect. The native Web Speech API transcribes the audio on the edge, and the Gemini 2.5 API structures it into a pristine ONDC-compliant listing (Title, Category, Materials, Story).
* **📸 AI Image Metrology & Background Removal:** A custom local ML pipeline (`rembg` + PyTorch) automatically isolates the craft from cluttered workbench backgrounds and estimates physical dimensions (L x W x H) for logistics metadata.
* **🤖 Generative UI Chatbot:** An interactive AI assistant that streams live React components (Product Cards, Pricing Spectrums) directly into the chat interface for urban buyers.
* **⚖️ Fair Pricing Valuation:** A custom CatBoost (`.cbm`) machine learning model cross-references artisan crafts against market data to guarantee a fair minimum payout (e.g., P50 Fair, P80 Premium).
* **🛋️ 3D & AR Previews:** React Three Fiber integration allowing buyers to view premium `.glb` craft models in 3D and project them into their physical space via Augmented Reality.

---

## 🏗️ Architecture

We employ a highly resilient **Hybrid Machine Learning Architecture**:
1. **Primary Pipeline (Local Cloud):** The Next.js frontend routes heavy tasks to our dedicated Python FastAPI server (CatBoost, PyTorch) for highly specialized predictions.
2. **Fallback Pipeline (Gemini Cloud):** If the local server is down or times out, the backend instantly and seamlessly falls back to the Google Gemini API to ensure 100% platform uptime.

---

## 💻 Tech Stack
* **Frontend / Core:** Next.js (App Router), TypeScript, Tailwind CSS, Radix UI.
* **3D Engine:** React Three Fiber, Three.js, Drei.
* **AI & Compute:** Vercel AI SDK, Google Gemini 2.5 Flash, Web Speech API.
* **Local Backend:** Python, FastAPI, CatBoost, PyTorch.

---

## 🚀 Getting Started

### 1. Frontend Setup (Next.js)
```bash
cd jungle-market
pnpm install
# Add your Gemini/OpenRouter keys to .env
npm run dev
```
The app will be available at `http://localhost:3000`.

### 2. Local ML Backend Setup (Python)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn jungle_market.main:app --reload
```
The local ML server will start at `http://127.0.0.1:8000`.
