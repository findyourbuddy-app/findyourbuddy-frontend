export const colors = {
  background: "#FBF6E9",
  surface: "#FFFFFF",
  primary: "#6C4CF1",
  primaryMuted: "#EDE7FB",
  accentYellow: "#FFC93C",
  accentGreen: "#3DD68C",
  accentRed: "#FF4D5E",
  textPrimary: "#1C1B29",
  textSecondary: "#7A7788",
  border: "#EFE9DA",
} as const;

export type ColorToken = keyof typeof colors;
