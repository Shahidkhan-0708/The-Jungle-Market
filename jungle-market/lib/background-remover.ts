/**
 * Client & fallback pipeline for background removal and photo enhancement.
 * Produces clean PNG catalog assets with isolated background.
 */

export async function removeBackgroundClient(imageSrc: string | File): Promise<{ pngUrl: string; blob: Blob }> {
  return new Promise(async (resolve, reject) => {
    try {
      let src = "";
      if (typeof imageSrc === "string") {
        src = imageSrc;
      } else {
        src = URL.createObjectURL(imageSrc);
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // Limit dimensions for fast processing
        const maxDim = 1200;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Sample corner pixels to determine background tone
        const cornerCoords = [
          [0, 0],
          [w - 1, 0],
          [0, h - 1],
          [w - 1, h - 1],
          [Math.floor(w / 2), 0],
          [0, Math.floor(h / 2)],
          [w - 1, Math.floor(h / 2)],
        ];

        let bgR = 0, bgG = 0, bgB = 0;
        let sampleCount = 0;
        for (const [cx, cy] of cornerCoords) {
          const idx = (cy * w + cx) * 4;
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
          sampleCount++;
        }
        bgR = Math.round(bgR / sampleCount);
        bgG = Math.round(bgG / sampleCount);
        bgB = Math.round(bgB / sampleCount);

        const colorDist = (r: number, g: number, b: number) => {
          return Math.sqrt(
            (r - bgR) * (r - bgR) * 0.299 +
            (g - bgG) * (g - bgG) * 0.587 +
            (b - bgB) * (b - bgB) * 0.114
          );
        };

        // Determine dynamic threshold
        const threshold = 32;
        const feather = 18;

        // Radial distance weighting: items near borders are more likely background
        const cx = w / 2;
        const cy = h / 2;
        const maxDist = Math.sqrt(cx * cx + cy * cy);

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const diff = colorDist(r, g, b);
            const distFromCenter = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxDist;

            // Increase background sensitivity towards edges
            const adjustedThreshold = threshold - distFromCenter * 8;

            if (diff < adjustedThreshold) {
              data[idx + 3] = 0; // completely transparent
            } else if (diff < adjustedThreshold + feather) {
              // Smooth soft edge feathering
              const alphaRatio = (diff - adjustedThreshold) / feather;
              data[idx + 3] = Math.round(alphaRatio * 255);
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to export clean PNG"));
              return;
            }
            const pngUrl = URL.createObjectURL(blob);
            resolve({ pngUrl, blob });
          },
          "image/png"
        );
      };
      img.onerror = (e) => reject(e);
      img.src = src;
    } catch (err) {
      reject(err);
    }
  });
}
