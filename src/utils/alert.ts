import { Alert as RNAlert, Platform } from "react-native";

export type AlertButtonStyle = "default" | "cancel" | "destructive";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
}

type AlertHostListener = (title: string, message: string | undefined, buttons: AlertButton[]) => void;

let hostListener: AlertHostListener | null = null;

export function registerAlertHost(listener: AlertHostListener | null): void {
  hostListener = listener;
}

// react-native-web's Alert.alert() is a no-op, so every confirm/menu dialog
// in the app (block/report/unmatch, safety menus, etc.) silently did nothing
// on web. This shim keeps the same Alert.alert(title, message, buttons) API
// but routes web through a real rendered modal (see AlertHost).
function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== "web") {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const resolvedButtons = buttons && buttons.length > 0 ? buttons : [{ text: "Tamam" }];
  if (hostListener) {
    hostListener(title, message, resolvedButtons);
  } else {
    window.alert([title, message].filter(Boolean).join("\n\n"));
  }
}

export const Alert = { alert };
