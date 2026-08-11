import { colors } from "./colors";

export const fontFamily = {
  displayBold: "Baloo2_700Bold",
  displaySemiBold: "Baloo2_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
} as const;

export const typeScale = {
  display: {
    fontFamily: fontFamily.displayBold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  h1: {
    fontFamily: fontFamily.displayBold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  h2: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  bodyMuted: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  caption: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  eyebrow: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    color: colors.primary,
  },
} as const;
