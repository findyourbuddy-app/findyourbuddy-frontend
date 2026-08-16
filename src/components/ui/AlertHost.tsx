import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radius, spacing } from "../../theme";
import { AlertButton, registerAlertHost } from "../../utils/alert";

interface AlertState {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

export function AlertHost() {
  const [state, setState] = useState<AlertState | null>(null);

  useEffect(() => {
    registerAlertHost((title, message, buttons) => setState({ title, message, buttons }));
    return () => registerAlertHost(null);
  }, []);

  if (!state) {
    return null;
  }

  function handlePress(button: AlertButton) {
    setState(null);
    button.onPress?.();
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setState(null)}>
      <Pressable style={styles.backdrop} onPress={() => setState(null)}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{state.title}</Text>
          {state.message ? <Text style={styles.message}>{state.message}</Text> : null}
          <View style={styles.buttonColumn}>
            {state.buttons.map((button, index) => (
              <Pressable key={`${button.text}-${index}`} style={styles.button} onPress={() => handlePress(button)}>
                <Text
                  style={[
                    styles.buttonText,
                    button.style === "destructive" && styles.buttonTextDestructive,
                    button.style === "cancel" && styles.buttonTextCancel,
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 40, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  message: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  buttonColumn: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  buttonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.primary,
    textAlign: "center",
  },
  buttonTextDestructive: {
    color: colors.accentRed,
  },
  buttonTextCancel: {
    color: colors.textSecondary,
    fontFamily: fontFamily.body,
  },
});
