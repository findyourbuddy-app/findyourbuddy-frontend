import { ActivityIndicator, Pressable, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { AlertHost } from "../components/ui/AlertHost";
import { AppSplashScreen } from "../components/ui/AppSplashScreen";
import { FloatingTabBar } from "../components/navigation/FloatingTabBar";
import { colors, spacing } from "../theme";
import { WelcomeScreen } from "../screens/WelcomeScreen";
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
import { MyPhotosScreen } from "../screens/MyPhotosScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { PhoneVerificationScreen } from "../screens/PhoneVerificationScreen";
import type { User, Event as AppEvent } from "../types";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Legal: { kind: "terms" | "privacy" };
  PhoneVerification: { fromSocialSignIn: boolean };
};

export type SwipeParams = { eventId: number; eventTitle: string } | { openStore: true } | undefined;

export type MainTabParamList = {
  Discover: undefined;
  Swipe: SwipeParams;
  Messages: undefined;
};

export type MainStackParamList = {
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Chat: {
    matchId: number;
    otherUserId: number;
    otherUserName: string;
    otherUserPhoto?: string | null;
    needsFeedback?: boolean;
    eventTitle?: string;
    isGroupEvent?: boolean;
    eventCreatorId?: number;
  };
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
  MyPhotos: undefined;
  CommunityGuidelines: undefined;
  Settings: undefined;
  ChangePassword: undefined;
  SavedEvents: undefined;
  BlockedUsers: undefined;
  CreateEvent: undefined;
  EventDetail: { eventId: number; initialEvent?: AppEvent };
  Notifications: undefined;
  LikesReceived: undefined;
  CandidateProfile: {
    candidate: User;
    eventTitle?: string;
    onExitGroupSwipe?: () => void;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    onSwipeUp: () => void;
  };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  const { language } = useAppTheme();

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="Legal"
        component={LegalScreen}
        options={({ route }) => ({
          headerShown: true,
          title:
            route.params.kind === "terms"
              ? (language === "en" ? "Terms of Service" : "Kullanım Şartları")
              : (language === "en" ? "Privacy Policy" : "Gizlilik Politikası"),
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
  const { t, language, bgGradient } = useAppTheme();
  const isNewOrIncomplete =
    justRegistered ||
    !user?.photo_url ||
    (!user?.date_of_birth && !user?.age) ||
    (!user?.hobbies || user.hobbies.length === 0);

  return (
    <MainStack.Navigator
      initialRouteName={isNewOrIncomplete ? "Onboarding" : "Tabs"}
      screenOptions={{
        contentStyle: { backgroundColor: bgGradient[0] },
        headerBackTitle: language === "en" ? "Home" : "Anasayfa",
      }}
    >
      <MainStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="Tabs" component={MainTabNavigator} options={{ headerShown: false, title: language === "en" ? "Home" : "Anasayfa" }} />
      <MainStack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params.otherUserName,
          headerTitleAlign: "left",
        })}
      />
      <MainStack.Screen
        name="Call"
        component={CallScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="AIRecommendations"
        component={AIRecommendationsScreen}
        options={{ title: t("aiMatchTitle") }}
      />
      <MainStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          title: t("tabProfile"),
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              accessibilityRole="button"
              accessibilityLabel={t("settings")}
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
        options={{ title: t("editProfile") }}
      />
      <MainStack.Screen
        name="ViewProfile"
        component={ViewProfileScreen}
        options={{ title: t("viewMyProfile") }}
      />
      <MainStack.Screen
        name="MyPhotos"
        component={MyPhotosScreen}
        options={{ title: t("myPhotos") }}
      />
      <MainStack.Screen
        name="CommunityGuidelines"
        component={CommunityGuidelinesScreen}
        options={{ title: t("communityGuidelines") }}
      />
      <MainStack.Screen name="Settings" component={SettingsScreen} options={{ title: t("settingsTitle") }} />
      <MainStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: t("changePassword") }}
      />
      <MainStack.Screen
        name="SavedEvents"
        component={SavedEventsScreen}
        options={{ title: t("savedEvents") }}
      />
      <MainStack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ title: t("blockedUsers") }}
      />
      <MainStack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ title: t("createEventTitle") }}
      />
      <MainStack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: t("eventDetailsLabel") }}
      />
      <MainStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t("notificationsTitle") }}
      />
      <MainStack.Screen
        name="LikesReceived"
        component={LikesReceivedScreen}
        options={{ title: t("likesReceivedTitle") }}
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
    return <AppSplashScreen />;
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
      <AlertHost />
    </NavigationContainer>
  );
}
