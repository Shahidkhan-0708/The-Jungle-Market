// Jungle Market React Native Design System & Theme Tokens
// Earthy Artisan Sanctuary palette with Inter typography hierarchy
// Unified token set used by all screen files

export const THEME = {
  colors: {
    // Primary greens
    primary: "#004525",
    primaryDark: "#002B16",
    primaryLight: "#94d4a7",
    primaryContainer: "#1f5d3a",
    onPrimary: "#ffffff",
    onPrimaryContainer: "#94d4a7",
    primaryFixed: "#b1f1c3",

    // Secondary / bark browns
    secondary: "#835331",
    bark: "#835331",
    secondaryContainer: "#ffbe94",
    onSecondary: "#ffffff",
    onSecondaryContainer: "#7a4b2a",

    // Tertiary golds
    tertiary: "#503700",
    tertiaryContainer: "#6e4c00",
    tertiaryAccent: "#c99a45",

    // Surfaces — Material Design 3 tokens
    surface: "#eefeed",
    surfaceDim: "#cfdece",
    surfaceBright: "#eefeed",
    surfaceContainerLowest: "#ffffff",
    surfaceContainerLow: "#e8f8e7",
    surfaceContainer: "#e3f2e1",
    surfaceContainerHigh: "#ddecdc",
    surfaceContainerHighest: "#d7e7d6",

    // Alias tokens used by App.js and AmbassadorScreens.js
    surfaceCard: "#ffffff",
    surfaceWarm: "#FBF9F5",

    // Background
    background: "#eefeed",
    onBackground: "#121e14",

    // Text tokens
    onSurface: "#121e14",
    textDark: "#121e14",
    onSurfaceVariant: "#404942",
    textMuted: "#404942",

    // Borders
    outline: "#707971",
    outlineVariant: "#c0c9bf",
    border: "#E5E0D8",
    borderLight: "#F0EDE8",

    // Inverse
    inverseSurface: "#263428",
    inverseOnSurface: "#e5f5e4",
    inversePrimary: "#95d5a8",

    // Semantic
    success: "#1f5d3a",
    warning: "#b45309",
    error: "#ba1a1a",
    errorContainer: "#ffdad6",
    onErrorContainer: "#93000a",
  },

  // Typography tokens — alias names used by different screen files
  fonts: {
    regular: "Inter",
    medium: "Inter",
    semibold: "Inter",
    serif: "Playfair Display",
  },
  typography: {
    fontRegular: "Inter",
    fontMedium: "Inter",
    fontSemibold: "Inter",
  },

  // Border radius — both naming conventions
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  shadows: {
    sm: {
      shadowColor: "#121e14",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: "#121e14",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: "#004525",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 20,
      elevation: 8,
    },
  },
};
