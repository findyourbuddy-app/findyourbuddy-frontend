import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Baloo2_600SemiBold, Baloo2_700Bold } from "@expo-google-fonts/baloo-2";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { AuthProvider } from "./src/context/AuthContext";
import { MessagesProvider } from "./src/context/MessagesContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors } from "./src/theme";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AuthProvider>
          <MessagesProvider>
            <RootNavigator />
          </MessagesProvider>
        </AuthProvider>
        <StatusBar style="dark" />
      </View>
    </SafeAreaProvider>
  );
}
