// Jungle Market React Native Design System & Theme Tokens
// Lush Tribal & Earthy Artisan Sanctuary palette with Outfit & Plus Jakarta Sans typography

export const THEME = {
  colors: {
    // Primary deep jungle greens
    primary: "#0A3D2E",
    primaryDark: "#072B1E",
    primaryLight: "#186851",
    primaryContainer: "#0E4C3A",
    onPrimary: "#FFFFFF",
    onPrimaryContainer: "#E8F3EE",
    primaryFixed: "#D1EADB",

    // Secondary warm amber / ochre bark
    secondary: "#C87A28",
    bark: "#C87A28",
    secondaryContainer: "#FDF5E8",
    onSecondary: "#FFFFFF",
    onSecondaryContainer: "#8A4E12",

    // Tertiary / gold accents
    tertiary: "#D97706",
    tertiaryContainer: "#FEF3C7",
    tertiaryAccent: "#F59E0B",
    gold: "#E8A246",

    // Surfaces & Parchment background
    surface: "#FAF7EE",
    surfaceDim: "#F2EDE0",
    surfaceBright: "#FFFFFF",
    surfaceContainerLowest: "#FFFFFF",
    surfaceContainerLow: "#FAF7EE",
    surfaceContainer: "#F4EFE2",
    surfaceContainerHigh: "#EDE6D4",
    surfaceContainerHighest: "#E6DEC8",

    // Alias tokens
    surfaceCard: "#FFFFFF",
    surfaceWarm: "#FAF7EE",

    // Background & Canvas
    background: "#FAF7EE",
    onBackground: "#0A3D2E",

    // Text tokens
    onSurface: "#0A3D2E",
    textDark: "#0A3D2E",
    onSurfaceVariant: "#526259",
    textMuted: "#6B7D73",

    // Borders & strokes
    outline: "#85968C",
    outlineVariant: "#D6CEB8",
    border: "#E6DEC8",
    borderLight: "#F0EAD8",

    // Inverse
    inverseSurface: "#141E18",
    inverseOnSurface: "#E8F3EE",
    inversePrimary: "#10B981",

    // Semantic colors
    success: "#059669",
    warning: "#D97706",
    error: "#DC2626",
    errorContainer: "#FEE2E2",
    onErrorContainer: "#991B1B",

    // Quote & Tribal Banner darks
    quoteDark: "#1E311A",
    quoteText: "#D5DFD1",
  },

  // Typography tokens with fallback hierarchy
  fonts: {
    regular: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    medium: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    semibold: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    bold: "'Outfit', 'Plus Jakarta Sans', -apple-system, sans-serif",
    display: "'Outfit', sans-serif",
    serif: "'Fraunces', Georgia, serif",
    mono: "'Space Grotesk', monospace",
  },
  typography: {
    fontRegular: "'Plus Jakarta Sans', -apple-system, sans-serif",
    fontMedium: "'Plus Jakarta Sans', -apple-system, sans-serif",
    fontSemibold: "'Outfit', 'Plus Jakarta Sans', -apple-system, sans-serif",
    fontDisplay: "'Outfit', sans-serif",
  },

  // Border radius tokens
  borderRadius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },

  shadows: {
    sm: {
      shadowColor: "#0A3D2E",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: "#0A3D2E",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 4,
    },
    lg: {
      shadowColor: "#0A3D2E",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 28,
      elevation: 8,
    },
  },
};
