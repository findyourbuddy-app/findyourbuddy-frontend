import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { PrimaryButton } from "../ui/PrimaryButton";
import { colors, fontFamily, radius, spacing } from "../../theme";
import { formatMatchScore } from "../../utils/match";
import type { Match } from "../../types";

import { useAppTheme } from "../../context/ThemeContext";

interface MatchPreviewCardProps {
  match: Match;
  subtitle?: string;
  onPressMessage: () => void;
}

export function MatchPreviewCard({ match, subtitle, onPressMessage }: MatchPreviewCardProps) {
  const { language } = useAppTheme();

  return (
    <LinearGradient colors={[colors.primary, "#4E32C4"]} style={styles.card}>
      <View style={styles.topRow}>
        <Avatar name={match.other_user.display_name} photoUrl={match.other_user.photo_url} size={56} />
        <View style={styles.textColumn}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{match.other_user.display_name}</Text>
            <Badge label={formatMatchScore(match.score)} variant="yellow" />
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <PrimaryButton label={language === "en" ? "Send Message" : "Mesaj Gönder"} onPress={onPressMessage} variant="outline" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  textColumn: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 17,
    color: colors.surface,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
});
