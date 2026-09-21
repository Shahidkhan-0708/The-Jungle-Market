# Jungle Market

A connected craft marketplace design for artisans, field ambassadors, and buyers.

## Open the working prototype

Open the Jungle Market Site supplied with this package. Select **Screens & states** for the 28-screen index, state previews, design system, or responsive atlas.

The same basket moves through all three portals. Use **Switch portal** in the header. The sample record is Devki Bai Marawi’s Wild Grass Smoked Bamboo Basket from Mandla Forest Ridge, Madhya Pradesh, verified by Rajesh Sahu. Its price is ₹1,250: ₹1,137 artisan, ₹80 logistics and insurance, ₹33 network.

## Three connected flows

1. **Artisan:** Switch portal → Artisan → Sell New Craft. Record the sample story, use sample photographs, review details, protect the price, check compliance, then send to the field ambassador. After the signature, open the live listing and fulfillment readiness.
2. **Ambassador:** Full Inspection → complete four checklist items → save the sample audio stamp → add inspector notes → Sign & Publish ONDC. Open the buyer listing or notify the artisan.
3. **Buyer:** Open Devki’s basket → Add to Basket → Checkout → enter a sample address → Pay Preview → Track Delivery. Follow the maker’s side to advance fulfillment. Delivered orders release the payout to the artisan wallet; withdrawals are simulated.

Quote requests, saved crafts, filters, search, image replacement, price changes, order quantities, draft cancellation, and error recovery can also be explored. Progress persists in this browser. **About this prototype → Reset preview data** restores the starting record.

## Import editable frames into Figma

This folder is a local Figma development plugin. It contains the complete frame dataset and all imagery; the importer makes no network requests.

1. Open a blank **Design** file in Figma’s desktop app. Ensure Outfit, Plus Jakarta Sans, and Fraunces are available.
2. Choose **Plugins → Development → Import plugin from manifest…** and select this folder’s `manifest.json`. If Figma asks for a plugin ID, use **Development → New Plugin → With UI** first. Keep the `id` that Figma assigns, add it to this package’s manifest, and import again. Do not reuse another published plugin’s ID. [Figma manifest reference](https://developers.figma.com/docs/plugins/manifest/).
3. Run **Jungle Market — Import Design** and click **Create the Jungle Market design**. Keep the plugin open until it reports completion.
4. Use **Present** to start the Artisan, Field Ambassador, or Buyer flow.

The importer creates one connected page, with three role areas and a component library. A single page allows cross-role prototype links. A nonempty current page is preserved and a new page is created.

## Included design

- **174 separate, named frames:** 28 base screens at 375, 768, 1024, and 1440px; 48 additional critical states; 13 dialogs; and a design-system frame.
- Native editable text, image fills, SVG vectors, shapes, and component instances, reconstructed from the browser’s rendered layout.
- Reusable component families for cards, inputs, badges, workflow progress, audio, payouts, timelines, QR panels, navigation, upload tiles, sheets, feedback, and empty states. Captured families expose state, width and example variants. Core buttons include Primary/Secondary/Gold × Default/Hover/Focus/Disabled variants and an editable label property.
- Primitive and semantic color variables with aliases, geometry variables, text styles, and fixed mobile navigation in Figma presentation mode.
- Three flow starting points, screen navigation and cross-role handoffs. The browser prototype supports live form editing and shared state; Figma links demonstrate the corresponding prepared states.

## Validation and limits

The browser prototype passed TypeScript checks and was visually inspected on desktop and mobile. All 174 frame captures were checked for horizontal overflow and missing imagery, with no issues found. The approval → buyer purchase → tracking → artisan fulfillment → wallet transfer journey was exercised successfully. Importer syntax and Figma API usage were checked against the bundled Figma Plugin API type definitions.

**The importer has not been run inside Figma:** the connected account’s Starter-plan tool quota blocked direct design creation. Inspect the imported result before treating it as a final Figma deliverable. Captured layouts use native, editable fixed-position layers to preserve each breakpoint; core buttons use auto layout. Responsive reflow lives in the accompanying app source. Shadows and gradients may simplify during import, and forms in Figma are prepared states.

The available browser did not expose WebMCP modelContext, so optional agent-navigation hooks could not be exercised. They feature-detect support and do not affect the visible interface.

Images are generated craft concepts, including one basket photograph reused across its sample angle slots. Names, certificates, analytics, orders, and payouts are sample records. ONDC, payments, field recording, AI enhancement, and courier operations are simulated. No funds move and no external messages are sent. Voice playback uses the browser’s speech-synthesis preview. Production certification, payments, commerce, voice AI, logistics and authentication require real service integration.

## Files

- `manifest.json`, `code.js`, `ui.html`: self-contained Figma importer.
- `jungle-market-frames.json`: rendered native-node dataset.
- `design-tokens.json`: color, type, geometry and motion values.
- `frame-audit.json`: per-frame layout audit.
- `screen-inventory.md`: complete frame list.
