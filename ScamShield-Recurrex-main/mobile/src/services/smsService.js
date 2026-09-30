import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const AUTO_SCAN_KEY = '@scamshield_auto_sms_protection';
const SMS_HISTORY_KEY = '@scamshield_sms_scan_history';

// Native module reference if available in Expo Development Build / Custom Build
const { SmsModule } = NativeModules;
const smsEmitter = SmsModule ? new NativeEventEmitter(SmsModule) : null;

let isNotificationsConfigured = false;
let Notifications = null;

try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  isNotificationsConfigured = true;
} catch {
  // Graceful fallback if expo-notifications is not installed in the environment
}

/**
 * Checks current Android SMS permissions.
 */
export async function checkSmsPermissions() {
  if (Platform.OS !== 'android') {
    return { granted: false, reason: 'SMS scanning is supported on Android devices.' };
  }

  try {
    if (SmsModule && SmsModule.checkPermission) {
      const isGranted = await SmsModule.checkPermission();
      return { granted: isGranted };
    }

    const receiveGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
    const readGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    return { granted: receiveGranted && readGranted };
  } catch (err) {
    return { granted: false, error: err.message };
  }
}

/**
 * Requests Android SMS permissions with user explanation.
 */
export async function requestSmsPermissions() {
  if (Platform.OS !== 'android') {
    return { granted: false, reason: 'SMS scanning is supported on Android devices.' };
  }

  try {
    if (SmsModule && SmsModule.requestPermission) {
      const granted = await SmsModule.requestPermission();
      return { granted };
    }

    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    ]);

    const receiveOk = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
    const readOk = granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;

    return { granted: receiveOk && readOk };
  } catch (err) {
    return { granted: false, error: err.message };
  }
}

/**
 * Opens system settings to allow permission grant.
 */
export async function openAppSettings() {
  try {
    if (SmsModule && SmsModule.openSettings) {
      return await SmsModule.openSettings();
    }
    return await Linking.openSettings();
  } catch (err) {
    console.error('Failed to open app settings:', err);
  }
}

/**
 * Check notification permission status.
 */
export async function checkNotificationPermission() {
  if (!Notifications) return { granted: false };
  try {
    const settings = await Notifications.getPermissionsAsync();
    return { granted: settings.granted || settings.ios?.status === 3 };
  } catch {
    return { granted: false };
  }
}

/**
 * Request notification permission.
 */
export async function requestNotificationPermission() {
  if (!Notifications) return { granted: false };
  try {
    const status = await Notifications.requestPermissionsAsync();
    return { granted: status.granted };
  } catch {
    return { granted: false };
  }
}

/**
 * Toggle or read Automatic Protection setting.
 */
export async function getAutoProtectionSetting() {
  try {
    const val = await AsyncStorage.getItem(AUTO_SCAN_KEY);
    return val !== null ? JSON.parse(val) : true; // Default ON
  } catch {
    return true;
  }
}

export async function setAutoProtectionSetting(enabled) {
  try {
    await AsyncStorage.setItem(AUTO_SCAN_KEY, JSON.stringify(Boolean(enabled)));
  } catch (err) {
    console.error('Failed to save auto protection setting:', err);
  }
}

/**
 * Displays a privacy-conscious local notification if incoming SMS is suspicious or dangerous.
 */
export async function sendScamAlertNotification({ sender, riskLevel, summary }) {
  if (!Notifications || !isNotificationsConfigured) return;

  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;

    // Privacy-conscious message body (hides sensitive SMS payload text from lock screen)
    const title = riskLevel === 'DANGEROUS' ? '🚨 Scam Alert Detected' : '⚠️ Suspicious SMS Received';
    const body = sender
      ? `Received a suspicious SMS from ${sender}. Tap to view risk details.`
      : 'A newly received SMS appears suspicious. Tap to view risk details.';

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { screen: 'SMSScanner', sender, riskLevel },
        sound: true,
      },
      trigger: null, // Instant delivery
    });
  } catch (err) {
    console.error('Failed to dispatch notification:', err);
  }
}

/**
 * Saves scan to local SMS Scan History.
 */
export async function saveSmsScanHistory(scanItem) {
  try {
    const existingRaw = await AsyncStorage.getItem(SMS_HISTORY_KEY);
    const history = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [scanItem, ...history].slice(0, 100); // Keep latest 100
    await AsyncStorage.setItem(SMS_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save SMS history:', err);
    return [];
  }
}

export async function getSmsScanHistory() {
  try {
    const existingRaw = await AsyncStorage.getItem(SMS_HISTORY_KEY);
    return existingRaw ? JSON.parse(existingRaw) : [];
  } catch {
    return [];
  }
}

export async function clearSmsScanHistory() {
  try {
    await AsyncStorage.removeItem(SMS_HISTORY_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Process an incoming SMS message.
 * Called automatically by Native SMS Receiver or manually.
 */
export async function processIncomingSms({ sender, body, timestamp = new Date().toISOString() }) {
  const isAutoOn = await getAutoProtectionSetting();
  if (!isAutoOn) {
    return null; // Automatic scanning is turned OFF by user
  }

  if (!body || !body.trim()) return null;

  try {
    const result = await api.scanMessage({ text: body.trim(), save: true });
    
    const record = {
      id: result.id || `sms_${Date.now()}`,
      sender: sender || 'Unknown Sender',
      body,
      risk_level: result.risk_level,
      risk_score: result.risk_score,
      summary: result.summary,
      reasons: result.reasons || [],
      recommendations: result.recommendations || [],
      timestamp,
      scanned_at: result.scanned_at || timestamp,
    };

    await saveSmsScanHistory(record);

    if (result.risk_level === 'SUSPICIOUS' || result.risk_level === 'DANGEROUS') {
      await sendScamAlertNotification({
        sender,
        riskLevel: result.risk_level,
        summary: result.summary,
      });
    }

    return record;
  } catch (err) {
    console.error('Failed to analyze incoming SMS:', err);
    return null;
  }
}

/**
 * Subscribes to native Android incoming SMS broadcasts.
 */
export function subscribeToIncomingSms(onSmsReceived) {
  if (!smsEmitter) return () => {};

  const subscription = smsEmitter.addListener('onSmsReceived', async (event) => {
    const { sender, body, timestamp } = event;
    const processed = await processIncomingSms({ sender, body, timestamp });
    if (onSmsReceived) {
      onSmsReceived(processed || { sender, body, timestamp });
    }
  });

  return () => {
    subscription.remove();
  };
}
