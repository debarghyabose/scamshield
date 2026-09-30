import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import { colors } from '../theme/colors';

export default function URLScanScreen() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async () => {
    if (!url.trim()) {
      setError('Please paste or type a URL to analyze.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const res = await api.scanUrl({ url: url.trim(), save: true });
      setResult(res);
    } catch (err) {
      setError(err.message || 'URL analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (level) => {
    if (level === 'DANGEROUS') return colors.dangerous;
    if (level === 'SUSPICIOUS') return colors.suspicious;
    return colors.safe;
  };

  const riskBg = (level) => {
    if (level === 'DANGEROUS') return colors.dangerousBg;
    if (level === 'SUSPICIOUS') return colors.suspiciousBg;
    return colors.safeBg;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scan URL / Link</Text>
      <Text style={styles.subtitle}>Check suspicious website links safely without opening them.</Text>

      {Boolean(error) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="https://example-phishing-link.com"
        placeholderTextColor={colors.textMuted}
        value={url}
        onChangeText={setUrl}
        keyboardType="url"
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleScan}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Scan Link</Text>
        )}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultCard}>
          <View style={[styles.badgeContainer, { backgroundColor: riskBg(result.risk_level) }]}>
            <Text style={[styles.badgeText, { color: riskColor(result.risk_level) }]}>
              {result.risk_level} • Risk Score {result.risk_score}/100
            </Text>
          </View>

          <Text style={styles.resultSummary}>{result.summary}</Text>

          {Array.isArray(result.reasons) && result.reasons.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Detected Threat Indicators:</Text>
              {result.reasons.map((reason, idx) => (
                <Text key={idx} style={styles.reasonItem}>
                  🚨 {reason}
                </Text>
              ))}
            </View>
          )}

          {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Safety Advice:</Text>
              {result.recommendations.map((rec, idx) => (
                <Text key={idx} style={styles.recItem}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: colors.dangerousBg,
    borderColor: colors.dangerous,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.dangerous,
    fontSize: 13,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  badgeText: {
    fontWeight: '800',
    fontSize: 13,
  },
  resultSummary: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 16,
  },
  section: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  reasonItem: {
    fontSize: 13,
    color: colors.dangerous,
    marginBottom: 6,
  },
  recItem: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 6,
  },
});
