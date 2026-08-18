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
  const { language } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

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
              {language === "en" ? "Profile Completion" : "Profil Tamamlanma Oranı"}
            </Text>
            <Text style={[typeScale.h2, styles.percentageText]}>
              %{completion.percentage} {isComplete ? "🎉" : ""}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.editButtonTouch}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Text style={styles.editButtonText}>
            {isComplete
              ? (language === "en" ? "Edit Profile" : "Düzenle")
              : (language === "en" ? "Complete Profile ⚡" : "Tamamla ⚡")}
          </Text>
        </Pressable>
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
              {language === "en"
                ? `${missingItems.length} items left for %100 completion`
                : `%100 tamamlanma için ${missingItems.length} eksik bilgi`}
            </Text>
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
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
                  <Feather name="plus" size={12} color="#FF6B6B" />
                  <Text style={styles.missingChipText}>{language === "en" ? item.labelEn : item.labelTr}</Text>
                  <Feather name="arrow-right" size={10} color="#E74C3C" style={{ marginLeft: 2 }} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : isComplete ? (
        <Text style={styles.perfectText}>
          {language === "en"
            ? "Your profile is 100% complete! You get 2x more match suggestions."
            : "Profilin %100 tamamlandı! 2 kat daha fazla eşleşme önerisi alıyorsun."}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: radius.card,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    ...shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  titleTextGroup: {
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  percentageText: {
    color: colors.textPrimary,
  },
  editButtonTouch: {
    backgroundColor: "rgba(74, 194, 226, 0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(74, 194, 226, 0.3)",
  },
  editButtonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  missingBox: {
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  missingHint: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.xs,
  },
  missingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 107, 107, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.2)",
  },
  missingChipText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    color: "#E74C3C",
  },
  perfectText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: "#2ECC71",
    marginTop: 4,
  },
});
