import React from 'react';
import { StyleSheet, ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

import HomeScreen from '../screens/HomeScreen';
import SMSScannerScreen from '../screens/SMSScannerScreen';
import MessageScanScreen from '../screens/MessageScanScreen';
import URLScanScreen from '../screens/URLScanScreen';
import PaymentScanScreen from '../screens/PaymentScanScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ReportScamScreen from '../screens/ReportScamScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ScanStack = createNativeStackNavigator();

function ScannerStack() {
  return (
    <ScanStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <ScanStack.Screen name="SMSScanner" component={SMSScannerScreen} options={{ title: 'SMS Scanner' }} />
      <ScanStack.Screen name="MessageScan" component={MessageScanScreen} options={{ title: 'Message Scan' }} />
      <ScanStack.Screen name="URLScan" component={URLScanScreen} options={{ title: 'URL Scan' }} />
      <ScanStack.Screen name="PaymentScan" component={PaymentScanScreen} options={{ title: 'Payment Scan' }} />
    </ScanStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.cardBorder,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          let icon = '🛡️';
          if (route.name === 'Home') icon = '🏠';
          if (route.name === 'SMS Scanner') icon = '💬';
          if (route.name === 'History') icon = '📜';
          if (route.name === 'Settings') icon = '⚙️';
          return <Text style={{ fontSize: 20 }}>{icon}</Text>;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="SMS Scanner" component={SMSScannerScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AuthStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
