Status: decision-ready, 2026-09-15. Source: uploaded doc "Jungle Market Architecture v4 — Hardened." Built with the Project Clarifier method: every gap was either asked (now closed → Decision Log) or logged (→ Open Questions). No gap was filled with a silent guess. Superseded decisions stay visible; nothing is silently edited.
1. Project Brief (one page)
What. An artisan marketplace with an AI-assisted verification-and-listing pipeline. Artisans onboard voice-first, upload product photos and audio, and the system verifies each product end-to-end — image preprocessing, foreground extraction, category/material classification, dimension verification, grounded SEO copy, and fair-price estimation. Human ambassadors resolve low-confidence or conflicting records, and nothing publishes until it clears a trust gate. Buyers (consumers and businesses) search, purchase, and track orders; listings also flow to ONDC/external channels. A staged ML loop (shadow → canary → promote/rollback) eventually learns from ambassador corrections and commerce outcomes.
For whom. Artisans (sellers), Ambassadors (human reviewers), Buyers (B2C + B2B), Admin.
Why. ❓ Still unstated → Q24. Working assumption (to confirm): the goal is the success criterion below.
Deliverable. A working MVP slice (D3) — one live end-to-end path (onboard → verify → publish → sell), broad in feature coverage.
v1 scope (D7, D11). Core spine (voice+photo onboarding → AI verification → ambassador review → publish → search) plus fair-pricing, commerce (checkout/orders/payout), ONDC/external distribution, and governance+trust (consent/PII, deletion, audit, listing risk gate). No feature cut was taken — the give is time.
Out of scope / deferred. Post-publish trust re-evaluation, the ML retraining/rollout loop, and GPU scaling. Doc-level "no use": MODNet, LLaVA, InternVL. Optional/later: CLIP, SAM/SAM2, BiRefNet, Qwen2.5-VL, scikit-image, LightGBM, XGBoost.
Market & catalogue. India first, expand later (D10). All four verticals (D15): textiles/handloom, jewellery/accessories, home decor/furniture, pottery/metal/other. Both consumer and business buyers (D14).
Models & compute. Off-the-shelf pretrained + light fine-tuning, seeded via pseudo-labels from larger models (D8, D12). CPU-only for v1 (D18).
Business model. Commission on sales — buyers pay, artisans list free (D4).
Compliance. India DPDP Act governs consent/deletion (D16). Listings are presented as AI-assisted; the artisan confirms final facts before publish (D20).
Success criteria. ~100 artisans onboarded with accurate, published listings (D5, D13).
Live risks (accepted, not resolved). (1) No binding constraint (D6) + founder-led capacity (D9) + full scope (D11) → the real risk is sequencing/drift, not features. (2) An all-vertical catalogue multiplies model classes and reference statistics (D15).
2. Known / Unknown / Assumed (intake record — 2026-09-15)
KNOWN (explicitly stated in the source doc)
Product: artisan marketplace; voice-first onboarding; upload photos/audio; enter or verify dimensions; manage listings.
Roles & access: Artisan, Ambassador (human reviewer), Buyer, Admin — authentication + RBAC.
Trust & governance: consent/PII gate (media + voice consent); retention choice; revocation + deletion workflow; provenance/audit log; publish risk gate; manual risk review; post-publish trust re-evaluation; unpublish/suspend.
Platform stack: FastAPI API layer; Celery + Redis async jobs; PostgreSQL (MVP search = FTS/trigram; scale = OpenSearch/vector, optional); object storage for media.
Image ingest: Pillow (safe open, verify, EXIF, RGB) → NumPy → OpenCV (resize, blur/contrast/light checks).
Voice: faster-whisper (CPU INT8, optional VAD) → transcript-confidence gate → fallback (re-record or ambassador).
Vision: rembg → OpenCV mask cleanup → RT-DETRv2-S → validated crop → MobileNetV3-Large (category, top-K) + MobileNetV3/EfficientNet-B0 (materials, multi-label).
Dimensions: ArUco/ChArUco marker → OpenCV calibrate/rectify/geometry → verified; else manual entry → category plausibility check; future phone AR.
Fact fusion: deterministic authority rules (voice = story/process/location/effort; vision = category/material/appearance; dimension provenance preserved) → Pydantic schema → confidence/consistency gate → ambassador review.
SEO: Qwen3 4B Instruct GGUF via llama.cpp, JSON-constrained, drafts only from verified Product JSON, forbidden-claim checks.
Pricing: CatBoost multi-quantile (p20/p50/p80) + market snapshot + artisan cost floor → decision engine → final range, else review.
Market intel: permitted offline observations → normalize/match → drop outliers → timestamped snapshot.
Commerce: payment/checkout, fulfilment/tracking, artisan payout, ONDC/external distribution, inventory sync.
ML lifecycle: corrections + outcomes → versioned dataset → offline eval → threshold recalibration → shadow → canary → promote/rollback → model registry; batch/GPU scaling; regional-language eval.
Doc-level exclusions: MODNet, LLaVA, InternVL ("no use"). Optional/later: CLIP, SAM/SAM2, BiRefNet, Qwen2.5-VL, scikit-image, LightGBM, XGBoost.
UNKNOWN (not addressed by the source doc)
Business model / who pays; target geography and artisan verticals; the real MVP boundary vs. the 18-layer vision; timeline, budget, team, funding; success metrics; applicable data-protection regime; model provenance and training-data rights; scale targets; payments/logistics/returns providers; ambassador staffing and SLA; liability for verification errors. (All since closed → Decision Log, or logged → Open Questions.)
ASSUMED (surfaced at intake, then resolved — this is the method's main value)
❌ India-only and primarily consumer-facing → corrected by D10 (India first, expand later) and D14 (B2C + B2B).
✅ A real product to be built now → confirmed by D3 (working MVP slice).
✅ Buyers pay; artisans do not → confirmed by D4 (commission on sales).
✅ Hardened consent/PII/audit layers are in v1 → confirmed by D7.
✏️ Models used purely off-the-shelf → amended by D8 (pretrained + light fine-tuning, seeded via pseudo-labels).
✅ CPU-only inference acceptable for v1 → confirmed by D18.
3. Decision Log
| # | Date | Decision | Reason |
| --- | --- | --- | --- |
| D1 | 2026-09-15 | Adopt the supplied *"Jungle Market Architecture v4 — Hardened"* as the working reference architecture. | It is the source artifact the client provided; supersedes earlier versions by the doc's own "v4" label. |
| D2 | 2026-09-15 | Use the Project Clarifier method: every gap is asked or logged, never silently assumed. | Requested method; prevents invisible assumptions reaching delivery. |
| D3 | 2026-09-15 | Primary deliverable = a **working MVP slice** \(onboard → verify → publish → sell\); everything else deferred. | Client chose "Working MVP slice". Answers Q1. |
| D4 | 2026-09-15 | Business model = **commission on sales** \(buyers pay, artisans list free\). | Client chose commission. Answers Q3. |
| D5 | 2026-09-15 | Success = **verified listings at scale**. | Client chose it. Answers Q4. Numeric target set later in D13. |
| D6 | 2026-09-15 | **No fixed constraints yet** — deadline, budget, and team are all flexible. | Client chose "None fixed yet". Answers Q11/Q12. Carries the drift risk. |
| D7 | 2026-09-15 | v1 clusters **in scope**: core spine + fair-pricing + commerce + ONDC/external distribution + governance+trust. | Client selected all four clusters. Answers Q2/Q8. |
| D8 | 2026-09-15 | Models = **off-the-shelf pretrained + light fine-tuning**. | Client chose it. Answers Q9 \(source\). Data source set in D12. |
| D9 | 2026-09-15 | Build capacity = **very small / founder-led**. | Client chose it. Answers capacity. |
| D10 | 2026-09-15 | Market = **India first, expand later** \(design for portability\). | Client chose it. Answers Q5. |
| D11 | 2026-09-15 | **No feature cut** — keep the full v1 scope; the give is **time**. | Client chose "Keep all, accept a longer timeline". Closes the scope trade. ⚠️ Risk: with no deadline, "later" becomes "never". |
| D12 | 2026-09-15 | Fine-tuning cold-start = **pseudo-labels from larger models** \(e.g. CLIP\). | Client chose "Seed from bigger models". Answers Q22. |
| D13 | 2026-09-15 | v1 scale target = **pilot, \~100 artisans / a few hundred listings**. | Client chose pilot scale. Answers Q21/Q10. |
| D14 | 2026-09-15 | Buyers = **both consumers and businesses from day one**. | Client chose "Both". Answers Q20. Adds B2B catalogue/pricing complexity. |
| D15 | 2026-09-15 | v1 catalogue = **all four verticals** \(textiles/handloom, jewellery/accessories, home decor/furniture, pottery/metal/other\). | Client selected all. Answers Q6. |
| D16 | 2026-09-15 | Data-protection regime = **India DPDP Act**. | Client chose it. Answers Q7. |
| D17 | 2026-09-15 | Languages = **English + several regional \(3–4\)** for voice and SEO. | Client chose it. Answers Q15. Exact set open → Q23. |
| D18 | 2026-09-15 | Compute = **CPU-only for v1**. | Client chose it. Answers Q14. Consistent with deferred GPU scaling. |
| D19 | 2026-09-15 | Payments & logistics = **payment gateway + logistics aggregator**. | Client chose it. Answers Q16. |
| D20 | 2026-09-15 | Liability = listings shown as **AI-assisted**; artisan confirms final facts before publish. | Client chose it. Answers Q18. |
| D21 | 2026-09-15 | Approver / veto = **founder only**. | Client chose it. Answers Q19. |
No decision has been superseded yet.
4. Open Questions (remaining, non-blocking)
| # | Question | Who can answer | Default if unanswered | Risk carried by the default |
| --- | --- | --- | --- | --- |
| Q11 | Budget ceiling and funding status? | Sponsor | Minimal / self-funded | Unbuildable scope if underestimated |
| Q12 | Deadline or launch date? | Sponsor | No fixed date | Endless iteration \(see D6/D11 risk\) |
| Q13 | Team skills, and the plan for heavy ML / infra \(build vs. outsource\)? | Sponsor | Founder-led; outsource heavy ML | Skill gaps; delivery delay |
| Q17 | Who staffs Ambassador review, at what volume and SLA? | Ops | Founder reviews at pilot volume | Review bottleneck as scale grows |
| Q23 | Which regional languages exactly \(the D17 set\)? | Ops | English + Hindi + 2 \(e.g. Tamil, Bengali\) | Rework if the set changes later |
| Q24 | The motivating problem — *why* does this exist? | Sponsor | Goal = the success criterion \(D13\) | Misaligned product decisions |
Closed and mapped to decisions: Q1→D3, Q2/Q8→D7, Q3→D4, Q4→D5, Q5→D10, Q6→D15, Q7→D16, Q9→D8, Q10/Q21→D13, Q11/Q12 constraints→D6, Q14→D18, Q15→D17, Q16→D19, Q18→D20, Q19→D21, Q20→D14, Q22→D12.
5. How to use this
Hand this brief to a developer, agency, or in-house team as-is — it is decision-ready, with every known gap either resolved or explicitly carried as an open question with a default.

Insist that any change to it goes through the same Decision Log (a new numbered entry that references and supersedes the old one) — never through memory or a passing conversation. That is what keeps "why did we do it this way?" answerable months later.
Before build starts, close the two highest-leverage opens: Q24 (the "why", so scope decisions have a reference point) and Q12 (any date at all, so "time as the give" cannot silently mean "never"). Neither is blocking for design, but both are blocking for sequencing.