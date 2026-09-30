import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { api } from '../services/api';
import {
  checkSmsPermissions,
  requestSmsPermissions,
  openAppSettings,
  getAutoProtectionSetting,
  setAutoProtectionSetting,
  getSmsScanHistory,
  saveSmsScanHistory,
  subscribeToIncomingSms,
} from '../services/smsService';

export default function SMSScannerScreen() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionChecking, setPermissionChecking] = useState(true);
  const [autoProtection, setAutoProtection] = useState(true);

  // Manual Scan state
  const [smsText, setSmsText] = useState('');
  const [sender, setSender] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // History state
  const [recentScans, setRecentScans] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInitialData();

    // Subscribe to real-time incoming SMS events from Android receiver
    const unsubscribe = subscribeToIncomingSms((newRecord) => {
      if (newRecord) {
        setRecentScans((prev) => [newRecord, ...prev]);
        setResult(newRecord);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadInitialData = async () => {
    setPermissionChecking(true);
    const perm = await checkSmsPermissions();
    setPermissionGranted(perm.granted);

    const isAutoOn = await getAutoProtectionSetting();
    setAutoProtection(isAutoOn);

    const history = await getSmsScanHistory();
    setRecentScans(history);
    setPermissionChecking(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleRequestPermission = async () => {
    setPermissionChecking(true);
    const res = await requestSmsPermissions();
    setPermissionGranted(res.granted);
    setPermissionChecking(false);

    if (!res.granted) {
      Alert.alert(
        'SMS Permission Required',
        'ScamShield needs SMS access to automatically detect scam messages sent to your phone. Please grant permission in Android Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openAppSettings },
        ]
      );
    }
  };

  const handleToggleAutoProtection = async (val) => {
    setAutoProtection(val);
    await setAutoProtectionSetting(val);
  };

  const handleManualScan = async () => {
    if (!smsText.trim()) {
      setError('Please paste or type an SMS message to scan.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const res = await api.scanMessage({ text: smsText.trim(), save: true });

      const scanRecord = {
        id: res.id || `manual_${Date.now()}`,
        sender: sender.trim() || 'Manual Input',
        body: smsText.trim(),
        risk_level: res.risk_level,
        risk_score: res.risk_score,
        summary: res.summary,
        reasons: res.reasons || [],
        recommendations: res.recommendations || [],
        timestamp: new Date().toISOString(),
        scanned_at: res.scanned_at || new Date().toISOString(),
      };

      setResult(scanRecord);
      const updatedHistory = await saveSmsScanHistory(scanRecord);
      setRecentScans(updatedHistory);
    } catch (err) {
      setError(err.message || 'Unable to connect to fraud detection server.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    if (level === 'DANGEROUS' || level === 'HIGH') return colors.dangerous;
    if (level === 'SUSPICIOUS' || level === 'MEDIUM') return colors.suspicious;
    return colors.safe;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>SMS Scanner</Text>
      <Text style={styles.subtitle}>
        Real-time SMS scam detection powered by ScamShield AI risk analysis engine.
      </Text>

      {/* Permission Status Card */}
      <View style={[styles.card, permissionGranted ? styles.cardPermGranted : styles.cardPermDenied]}>
        <View style={styles.cardRow}>
          <View style={styles.permTextGroup}>
            <Text style={styles.cardHeader}>SMS Permission Status</Text>
            {permissionChecking ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
            ) : permissionGranted ? (
              <Text style={styles.statusGranted}>✓ SMS Permission Granted</Text>
            ) : (
              <Text style={styles.statusDenied}>✕ SMS Permission Not Granted</Text>
            )}
          </View>
        </View>

        <Text style={styles.permExplanation}>
          We require SMS access to analyze incoming messages and warn you about potential scams, phishing links, and fake bank alerts.
        </Text>

        {!permissionGranted && (
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleRequestPermission}>
              <Text style={styles.btnPrimaryText}>Request Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={openAppSettings}>
              <Text style={styles.btnSecondaryText}>Open Android Settings</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Automatic Protection Toggle Card */}
      <View style={styles.card}>
        <View style={styles.cardRowBetween}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.cardHeader}>Automatic Protection</Text>
            <Text style={styles.cardDesc}>
              Automatically scan incoming SMS messages in real time and alert you if suspicious.
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

      {/* Manual SMS Scanning Input Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Manual SMS Scanner</Text>
        <Text style={styles.cardDesc}>
          Paste or type any suspicious SMS text below to instantly evaluate scam risk.
        </Text>

        {Boolean(error) && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleManualScan}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          style={styles.textInput}
          placeholder="Sender ID / Phone Number (Optional, e.g. +91 98765 43210)"
          placeholderTextColor={colors.textSubtle}
          value={sender}
          onChangeText={setSender}
        />

        <TextInput
          style={styles.textArea}
          placeholder="Paste SMS content... e.g. 'Your account has been blocked. Click http://example.com immediately to verify.'"
          placeholderTextColor={colors.textSubtle}
          value={smsText}
          onChangeText={setSmsText}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.btnScan, loading && styles.btnDisabled]}
          onPress={handleManualScan}
          disabled={loading}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={[styles.btnScanText, { marginLeft: 8 }]}>Analyzing Message...</Text>
            </View>
          ) : (
            <Text style={styles.btnScanText}>Scan Message</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Scan Result Card */}
      {result && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Scan Result</Text>

          <View style={[styles.badgeContainer, { borderColor: getRiskColor(result.risk_level) }]}>
            <Text style={[styles.badgeText, { color: getRiskColor(result.risk_level) }]}>
              {result.risk_level} • Risk Score: {result.risk_score ?? 0}/100
            </Text>
          </View>

          {result.sender && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sender:</Text>
              <Text style={styles.detailValue}>{result.sender}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Scanned At:</Text>
            <Text style={styles.detailValue}>
              {new Date(result.scanned_at || result.timestamp).toLocaleString()}
            </Text>
          </View>

          <Text style={styles.resultSummary}>{result.summary}</Text>

          {Array.isArray(result.reasons) && result.reasons.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={styles.resultSectionHeader}>Risk Indicators / Reasons:</Text>
              {result.reasons.map((r, idx) => (
                <Text key={idx} style={styles.reasonText}>
                  ⚠️ {r}
                </Text>
              ))}
            </View>
          )}

          {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={styles.resultSectionHeader}>Recommended Action:</Text>
              {result.recommendations.map((rec, idx) => (
                <Text key={idx} style={styles.recText}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Recent Scanned Messages */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Recent Scanned Messages</Text>

        {recentScans.length === 0 ? (
          <Text style={styles.emptyText}>No recent SMS scans recorded.</Text>
        ) : (
          recentScans.slice(0, 10).map((item, index) => (
            <TouchableOpacity
              key={item.id || index}
              style={styles.historyItem}
              onPress={() => setResult(item)}
            >
              <View style={styles.historyHeader}>
                <Text style={styles.historySender}>{item.sender || 'Unknown Sender'}</Text>
                <View style={[styles.miniBadge, { borderColor: getRiskColor(item.risk_level) }]}>
                  <Text style={[styles.miniBadgeText, { color: getRiskColor(item.risk_level) }]}>
                    {item.risk_level}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyBody} numberOfLines={2}>
                "{item.body}"
              </Text>
              <Text style={styles.historyTime}>
                {new Date(item.timestamp || item.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardPermGranted: {
    borderLeftWidth: 5,
    borderLeftColor: colors.safe,
  },
  cardPermDenied: {
    borderLeftWidth: 5,
    borderLeftColor: colors.dangerous,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permTextGroup: {
    flex: 1,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  statusGranted: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.safe,
  },
  statusDenied: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dangerous,
  },
  permExplanation: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 18,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  btnPrimary: {
    backgroundColor: '#0b1220',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: '#ffffff',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnSecondaryText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#ffffff',
    borderColor: colors.dangerous,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: colors.dangerous,
    fontSize: 13,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: colors.dangerous,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  btnScan: {
    backgroundColor: '#0b1220',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnScanText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    fontWeight: '800',
    fontSize: 13,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    width: 90,
  },
  detailValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  resultSummary: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  resultSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  resultSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 13,
    color: colors.dangerous,
    marginBottom: 4,
  },
  recText: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
  },
  historyItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historySender: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  miniBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  historyBody: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 11,
    color: colors.textSubtle,
  },
});
