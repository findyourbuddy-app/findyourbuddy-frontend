import { Platform } from "react-native";

export const shadows = {
  card: Platform.select({
    web: { boxShadow: "0 8px 24px rgba(28, 27, 41, 0.08)" },
    default: {
      shadowColor: "#1C1B29",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
  }),
  soft: Platform.select({
    web: { boxShadow: "0 4px 12px rgba(28, 27, 41, 0.06)" },
    default: {
      shadowColor: "#1C1B29",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  }),
} as const;
