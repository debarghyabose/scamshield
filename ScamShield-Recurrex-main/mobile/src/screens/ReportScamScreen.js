import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../services/api';
import { colors } from '../theme/colors';

export default function ReportScamScreen() {
  const [scamType, setScamType] = useState('Phishing SMS / Link');
  const [content, setContent] = useState('');
  const [phone, setPhone] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!content.trim() || content.trim().length < 10) {
      setError('Content is required and must be at least 10 characters.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await api.submitReport({
        scam_type: scamType,
        content: content.trim(),
        phone_number: phone.trim() || null,
        url: url.trim() || null,
        description: description.trim() || null,
      });
      Alert.alert('Report Submitted', 'Thank you for reporting this scam attempt to ScamShield.');
      setContent('');
      setPhone('');
      setUrl('');
      setDescription('');
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Report Scam</Text>
      <Text style={styles.subtitle}>Help expand community awareness by reporting fraudulent activity.</Text>

      {Boolean(error) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.label}>Scam Category</Text>
      <TextInput
        style={styles.input}
        value={scamType}
        onChangeText={setScamType}
        placeholder="Category"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Scam Content / Text *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Paste full scam message text or email body here..."
        placeholderTextColor={colors.textMuted}
        value={content}
        onChangeText={setContent}
        multiline
      />

      <Text style={styles.label}>Sender Phone Number (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="+1 555 123 4567"
        placeholderTextColor={colors.textMuted}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Scam URL (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="https://scam-site.com"
        placeholderTextColor={colors.textMuted}
        value={url}
        onChangeText={setUrl}
        keyboardType="url"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Additional Details (Optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Any additional context, how you were contacted, requested money, etc."
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Submit Scam Report</Text>
        )}
      </TouchableOpacity>
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
    marginTop: 6,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
