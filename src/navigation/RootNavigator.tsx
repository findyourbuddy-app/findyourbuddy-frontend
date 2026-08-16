import { ActivityIndicator, Pressable, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { AlertHost } from "../components/ui/AlertHost";
import { FloatingTabBar } from "../components/navigation/FloatingTabBar";
import { colors, spacing } from "../theme";
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
import { LikesReceivedScreen } from "../screens/LikesReceivedScreen";
import { CandidateProfileScreen } from "../screens/CandidateProfileScreen";
import { ChangePasswordScreen } from "../screens/ChangePasswordScreen";
import { SavedEventsScreen } from "../screens/SavedEventsScreen";
import { ViewProfileScreen } from "../screens/ViewProfileScreen";
import { CommunityGuidelinesScreen } from "../screens/CommunityGuidelinesScreen";
import { CallScreen } from "../screens/CallScreen";
import { AIRecommendationsScreen } from "../screens/AIRecommendationsScreen";
import { VerifyPhoneScreen } from "../screens/VerifyPhoneScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import type { User } from "../types";

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
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Chat: { matchId: number; otherUserId: number; otherUserName: string; needsFeedback?: boolean };
  Call: {
    matchId: number;
    otherUserName: string;
    otherUserPhoto: string | null;
    isCaller: boolean;
    callType: "voice" | "video";
  };
  AIRecommendations: undefined;
  Profile: undefined;
  EditProfile: undefined;
  ViewProfile: undefined;
  CommunityGuidelines: undefined;
  Settings: undefined;
  ChangePassword: undefined;
  SavedEvents: undefined;
  BlockedUsers: undefined;
  CreateEvent: undefined;
  EventDetail: { eventId: number };
  Notifications: undefined;
  LikesReceived: undefined;
  CandidateProfile: {
    candidate: User;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    onSwipeUp: () => void;
  };
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
  const { user, justRegistered } = useAuth();
  const isNewOrIncomplete =
    justRegistered ||
    !user?.photo_url ||
    (!user?.date_of_birth && !user?.age) ||
    (!user?.hobbies || user.hobbies.length === 0);

  return (
    <MainStack.Navigator initialRouteName={isNewOrIncomplete ? "Onboarding" : "Tabs"}>
      <MainStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="Tabs" component={MainTabNavigator} options={{ headerShown: false }} />
      <MainStack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.otherUserName })}
      />
      <MainStack.Screen
        name="Call"
        component={CallScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="AIRecommendations"
        component={AIRecommendationsScreen}
        options={{ title: "AI Uyum Önerileri" }}
      />
      <MainStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          title: "Profil",
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              accessibilityRole="button"
              accessibilityLabel="Ayarlar"
              style={{ paddingHorizontal: spacing.sm }}
            >
              <Feather name="settings" size={22} color={colors.textPrimary} />
            </Pressable>
          ),
        })}
      />
      <MainStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "Profili Düzenle" }}
      />
      <MainStack.Screen
        name="ViewProfile"
        component={ViewProfileScreen}
        options={{ title: "Profilimi Görüntüle" }}
      />
      <MainStack.Screen
        name="CommunityGuidelines"
        component={CommunityGuidelinesScreen}
        options={{ title: "Topluluk Kuralları" }}
      />
      <MainStack.Screen name="Settings" component={SettingsScreen} options={{ title: "Ayarlar" }} />
      <MainStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: "Şifre Değiştir" }}
      />
      <MainStack.Screen
        name="SavedEvents"
        component={SavedEventsScreen}
        options={{ title: "Kaydedilenler" }}
      />
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
      <MainStack.Screen
        name="LikesReceived"
        component={LikesReceivedScreen}
        options={{ title: "Seni Beğenenler" }}
      />
      <MainStack.Screen
        name="CandidateProfile"
        component={CandidateProfileScreen}
        options={({ route }) => ({ title: route.params.candidate.display_name })}
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

  return (
    <NavigationContainer>
      {user ? (user.phone_verified ? <MainNavigator /> : <VerifyPhoneScreen />) : <AuthNavigator />}
      <AlertHost />
    </NavigationContainer>
  );
}
