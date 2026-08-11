import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { FloatingTabBar } from "../components/navigation/FloatingTabBar";
import { colors } from "../theme";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { DiscoverScreen } from "../screens/DiscoverScreen";
import { SwipeScreen } from "../screens/SwipeScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type SwipeParams = { eventId: number; eventTitle: string } | undefined;

export type MainTabParamList = {
  Discover: undefined;
  Swipe: SwipeParams;
  Messages: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Chat: { matchId: number; otherUserName: string };
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <MainTabs.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <MainTabs.Screen name="Discover" component={DiscoverScreen} />
      <MainTabs.Screen name="Swipe" component={SwipeScreen} />
      <MainTabs.Screen name="Messages" component={MessagesScreen} />
    </MainTabs.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator>
      <MainStack.Screen name="Tabs" component={MainTabNavigator} options={{ headerShown: false }} />
      <MainStack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.otherUserName })}
      />
      <MainStack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profil" }} />
    </MainStack.Navigator>
  );
}

export function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <NavigationContainer>{user ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
