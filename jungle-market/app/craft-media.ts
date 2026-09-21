export type FilmAsset = { src: string | null; poster: string; seconds: number };

// Keep sources null until the corresponding reference-matched film is approved.
// A missing source renders the real poster, without an empty player or a request to a nonexistent file.
export const craftMedia = {
  hero: { src: null, poster: '/basket.png', seconds: 10 },
  mobile: { src: null, poster: '/basket.png', seconds: 8 },
  story: { src: null, poster: '/basket.png', seconds: 30 },
  detail: { src: null, poster: '/basket.png', seconds: 6 },
} satisfies Record<string, FilmAsset>;
