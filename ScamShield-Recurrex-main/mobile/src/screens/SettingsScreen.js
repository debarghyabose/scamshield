import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import {
  checkSmsPermissions,
  requestSmsPermissions,
  checkNotificationPermission,
  requestNotificationPermission,
  openAppSettings,
  getAutoProtectionSetting,
  setAutoProtectionSetting,
  clearSmsScanHistory,
} from '../services/smsService';

export default function SettingsScreen() {
  const { user, profile, logout } = useAuth();

  const [smsPermission, setSmsPermission] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [autoProtection, setAutoProtection] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const smsStatus = await checkSmsPermissions();
    setSmsPermission(smsStatus.granted);

    const notifStatus = await checkNotificationPermission();
    setNotificationPermission(notifStatus.granted);

    const isAutoOn = await getAutoProtectionSetting();
    setAutoProtection(isAutoOn);
  };

  const handleRequestSmsPermission = async () => {
    const res = await requestSmsPermissions();
    setSmsPermission(res.granted);
    if (!res.granted) {
      openAppSettings();
    }
  };

  const handleRequestNotificationPermission = async () => {
    const res = await requestNotificationPermission();
    setNotificationPermission(res.granted);
    if (!res.granted) {
      openAppSettings();
    }
  };

  const handleToggleAutoProtection = async (val) => {
    setAutoProtection(val);
    await setAutoProtectionSetting(val);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Local Scan History',
      'Are you sure you want to delete all locally stored SMS scan records from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: async () => {
            const success = await clearSmsScanHistory();
            if (success) {
              Alert.alert('History Cleared', 'Local SMS scan records have been deleted.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings & Permissions</Text>
      <Text style={styles.subtitle}>
        Manage privacy preferences, app permissions, and security controls.
      </Text>

      {/* Permissions Management Section */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Permission Management</Text>

        {/* SMS Permission Item */}
        <View style={styles.permItem}>
          <View style={styles.permRow}>
            <Text style={styles.permName}>SMS Access Permission</Text>
            <Text style={[styles.permStatus, smsPermission ? styles.statusGranted : styles.statusDenied]}>
              {smsPermission ? '✓ Granted' : '✕ Not Granted'}
            </Text>
          </View>
          <Text style={styles.permDesc}>
            Required to inspect incoming SMS text messages in real time for fraud and phishing detection.
          </Text>
          <TouchableOpacity
            style={styles.btnAction}
            onPress={smsPermission ? openAppSettings : handleRequestSmsPermission}
          >
            <Text style={styles.btnActionText}>
              {smsPermission ? 'Manage in Android Settings' : 'Grant SMS Permission'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notification Permission Item */}
        <View style={[styles.permItem, { borderBottomWidth: 0 }]}>
          <View style={styles.permRow}>
            <Text style={styles.permName}>Notification Permission</Text>
            <Text style={[styles.permStatus, notificationPermission ? styles.statusGranted : styles.statusDenied]}>
              {notificationPermission ? '✓ Granted' : '✕ Not Granted'}
            </Text>
          </View>
          <Text style={styles.permDesc}>
            Required to dispatch privacy-conscious lock screen alerts when high-risk scam messages arrive.
          </Text>
          <TouchableOpacity
            style={styles.btnAction}
            onPress={notificationPermission ? openAppSettings : handleRequestNotificationPermission}
          >
            <Text style={styles.btnActionText}>
              {notificationPermission ? 'Manage in Android Settings' : 'Grant Notification Permission'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Protection Settings Section */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Protection Preferences</Text>

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.settingTitle}>Automatic SMS Protection</Text>
            <Text style={styles.settingDesc}>
              Automatically scan incoming SMS messages in the background.
            </Text>
          </View>
          <Switch
            value={autoProtection}
            onValueChange={handleToggleAutoProtection}
            trackColor={{ false: colors.cardBorder, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* SMS Privacy & Storage Section */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>SMS Privacy & Data Protection</Text>
        <Text style={styles.privacyText}>
          🔒 ScamShield processes message content solely for fraud risk analysis. Messages are sent securely to your designated ScamShield API server and are never sold or shared with third-party tracking services.
        </Text>

        <TouchableOpacity style={styles.btnDanger} onPress={handleClearHistory}>
          <Text style={styles.btnDangerText}>Clear Local SMS Scan History</Text>
        </TouchableOpacity>
      </View>

      {/* Account Info Section */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Account</Text>
        <Text style={styles.accountText}>
          Signed in as: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{profile?.email || user?.email || 'Guest / User'}</Text>
        </Text>

        <TouchableOpacity style={styles.btnLogout} onPress={logout}>
          <Text style={styles.btnLogoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  permItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  permName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  permStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusGranted: {
    color: colors.safe,
  },
  statusDenied: {
    color: colors.dangerous,
  },
  permDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  btnAction: {
    alignSelf: 'flex-start',
    backgroundColor: colors.inputBg,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  privacyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  btnDanger: {
    backgroundColor: colors.dangerousBg,
    borderColor: colors.dangerousBorder,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDangerText: {
    color: colors.dangerous,
    fontSize: 13,
    fontWeight: '700',
  },
  accountText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  btnLogout: {
    backgroundColor: colors.inputBg,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnLogoutText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
