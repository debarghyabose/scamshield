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

export default function PaymentScanScreen() {
  const [amount, setAmount] = useState('');
  const [avgAmount, setAvgAmount] = useState('50');
  const [payeeType, setPayeeType] = useState('individual');
  const [time, setTime] = useState('late_night');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async () => {
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    const payload = {
      amount: amtNum,
      average_amount: parseFloat(avgAmount) || 50,
      payee_type: payeeType,
      time: time,
      frequency_24h: 3,
      flags: ['first_time_payee', 'urgent_request'],
      save: true,
    };

    try {
      const res = await api.scanTransaction(payload);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Payment risk analysis failed.');
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
      <Text style={styles.title}>Payment Risk Analyzer</Text>
      <Text style={styles.subtitle}>Evaluate transaction parameters before transferring funds.</Text>

      {Boolean(error) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.label}>Transaction Amount ($ / ₹)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 500"
        placeholderTextColor={colors.textMuted}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Your Typical Transaction Amount</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 50"
        placeholderTextColor={colors.textMuted}
        value={avgAmount}
        onChangeText={setAvgAmount}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Payee Type</Text>
      <View style={styles.radioGroup}>
        {['individual', 'new_merchant', 'verified_merchant'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.radioButton, payeeType === t && styles.radioButtonSelected]}
            onPress={() => setPayeeType(t)}
          >
            <Text style={[styles.radioText, payeeType === t && styles.radioTextSelected]}>
              {t.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleScan}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Evaluate Payment Risk</Text>
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
              <Text style={styles.sectionHeader}>Risk Factors:</Text>
              {result.reasons.map((reason, idx) => (
                <Text key={idx} style={styles.reasonItem}>
                  ⚠️ {reason}
                </Text>
              ))}
            </View>
          )}

          {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Recommended Safeguards:</Text>
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 4,
  },
  radioButton: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 6,
  },
  radioButtonSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  radioText: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  radioTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  button: {
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
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
