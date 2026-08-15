import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { FloatingTabBar } from "../components/navigation/FloatingTabBar";
import { colors } from "../theme";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { LegalScreen } from "../screens/LegalScreen";
import { DiscoverScreen } from "../screens/DiscoverScreen";
import { SwipeScreen } from "../screens/SwipeScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { EditProfileScreen } from "../screens/EditProfileScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { BlockedUsersScreen } from "../screens/BlockedUsersScreen";
import { CreateEventScreen } from "../screens/CreateEventScreen";
import { EventDetailScreen } from "../screens/EventDetailScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Legal: { kind: "terms" | "privacy" };
};

export type SwipeParams = { eventId: number; eventTitle: string } | undefined;

export type MainTabParamList = {
  Discover: undefined;
  Swipe: SwipeParams;
  Messages: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Chat: { matchId: number; otherUserId: number; otherUserName: string };
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  BlockedUsers: undefined;
  CreateEvent: undefined;
  EventDetail: { eventId: number };
  Notifications: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: true, title: "Şifreni Sıfırla" }}
      />
      <AuthStack.Screen
        name="Legal"
        component={LegalScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.kind === "terms" ? "Kullanım Şartları" : "Gizlilik Politikası",
        })}
      />
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
  const { justRegistered } = useAuth();

  return (
    <MainStack.Navigator initialRouteName={justRegistered ? "EditProfile" : "Tabs"}>
      <MainStack.Screen name="Tabs" component={MainTabNavigator} options={{ headerShown: false }} />
      <MainStack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.otherUserName })}
      />
      <MainStack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profil" }} />
      <MainStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "Profili Düzenle" }}
      />
      <MainStack.Screen name="Settings" component={SettingsScreen} options={{ title: "Ayarlar" }} />
      <MainStack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ title: "Engellenen Kullanıcılar" }}
      />
      <MainStack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ title: "Etkinlik Oluştur" }}
      />
      <MainStack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: "Etkinlik" }}
      />
      <MainStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Bildirimler" }}
      />
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
