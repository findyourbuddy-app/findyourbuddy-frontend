import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { calculateProfileCompletion } from "../../utils/profileCompletion";
import { useAppTheme } from "../../context/ThemeContext";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../../theme";
import type { MainStackParamList } from "../../navigation/RootNavigator";
import type { User } from "../../types";

import type { FieldKey } from "../../utils/profileCompletion";

interface Props {
  user: User | null;
  onPressFieldKey?: (key: FieldKey) => void;
}

export function ProfileCompletionCard({ user, onPressFieldKey }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { language, t } = useAppTheme();
  const [expanded, setExpanded] = useState(true);

  const completion = calculateProfileCompletion(user);
  const isComplete = completion.percentage >= 100;
  const missingItems = completion.missingItems;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconBadge, { backgroundColor: isComplete ? "rgba(46, 204, 113, 0.15)" : "rgba(74, 194, 226, 0.15)" }]}>
            <Feather
              name={isComplete ? "check-circle" : "pie-chart"}
              size={18}
              color={isComplete ? "#2ECC71" : "#4AC2E2"}
            />
          </View>
          <View style={styles.titleTextGroup}>
            <Text style={styles.cardTitle}>
              {t("profileCompletion")}
            </Text>
            <Text style={styles.percentageText}>
              %{completion.percentage}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={isComplete ? ["#2ECC71", "#27AE60"] : ["#4AC2E2", "#FF6B6B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${completion.percentage}%` }]}
        />
      </View>

      {/* Missing items section if incomplete */}
      {!isComplete && missingItems.length > 0 ? (
        <View style={styles.missingBox}>
          <Pressable
            style={styles.toggleRow}
            onPress={() => setExpanded((prev) => !prev)}
          >
            <Text style={styles.missingHint}>
              {t("p0ItemsLeftFor100", { p0: missingItems.length })}
            </Text>
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          {expanded ? (
            <View style={styles.chipsRow}>
              {missingItems.map((item) => (
                <Pressable
                  key={item.key}
                  style={styles.missingChip}
                  onPress={() => {
                    if (onPressFieldKey) {
                      onPressFieldKey(item.key);
                    } else {
                      navigation.navigate("EditProfile");
                    }
                  }}
                >
                  <Feather name="plus" size={13} color="#FF6B6B" />
                  <Text style={styles.missingChipText}>{language === "en" ? item.labelEn : item.labelTr}</Text>
                  <Feather name="arrow-right" size={11} color="#E74C3C" style={{ marginLeft: 2 }} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : isComplete ? (
        <Text style={styles.perfectText}>
          {t("yourProfileIs100Complete")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    gap: spacing.xs,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  titleTextGroup: {
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  percentageText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 12,
    backgroundColor: "#E2E8F0",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  missingBox: {
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  missingHint: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.xs,
  },
  missingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 107, 107, 0.08)",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.2)",
  },
  missingChipText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: "#E74C3C",
  },
  perfectText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: "#2ECC71",
    marginTop: 4,
  },
});
