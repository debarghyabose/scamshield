import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import { checkSmsPermissions, getAutoProtectionSetting } from '../services/smsService';

export default function HomeScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [smsProtectionActive, setSmsProtectionActive] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch {
      /* ignore if offline or guest */
    }

    const perm = await checkSmsPermissions();
    const autoOn = await getAutoProtectionSetting();
    setSmsProtectionActive(perm.granted && autoOn);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const displayName = profile?.full_name || user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {displayName} 👋</Text>
        <View style={styles.protectionStatusRow}>
          <Text style={styles.statusDot}>●</Text>
          <Text style={styles.subtitle}>
            ScamShield Protection is {smsProtectionActive ? 'Active' : 'Partially Active'}
          </Text>
        </View>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Protection Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats?.total ?? stats?.total_scans ?? 0}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.dangerous }]}>
              {stats?.by_level?.DANGEROUS ?? stats?.risk_breakdown?.DANGEROUS ?? 0}
            </Text>
            <Text style={styles.statLabel}>Threats Blocked</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.safe }]}>
              {stats?.by_level?.SAFE ?? stats?.risk_breakdown?.SAFE ?? 0}
            </Text>
            <Text style={styles.statLabel}>Safe Scans</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Scam Detection Tools</Text>

      {/* Featured SMS Scanner Card */}
      <TouchableOpacity
        style={[styles.toolCard, styles.featuredToolCard]}
        onPress={() => navigation.navigate('SMS Scanner')}
      >
        <View style={[styles.toolIconContainer, { backgroundColor: colors.safeBg }]}>
          <Text style={styles.toolIcon}>📱</Text>
        </View>
        <View style={styles.toolInfo}>
          <View style={styles.toolHeaderRow}>
            <Text style={styles.toolTitle}>SMS Scanner</Text>
            <View style={styles.badgeFeatured}>
              <Text style={styles.badgeFeaturedText}>REAL-TIME</Text>
            </View>
          </View>
          <Text style={styles.toolDesc}>
            Real-time incoming SMS protection & manual scam message scanner with risk score analysis.
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toolCard}
        onPress={() => navigation.navigate('SMS Scanner')}
      >
        <View style={styles.toolIconContainer}>
          <Text style={styles.toolIcon}>💬</Text>
        </View>
        <View style={styles.toolInfo}>
          <Text style={styles.toolTitle}>Manual Message Scan</Text>
          <Text style={styles.toolDesc}>Paste SMS, WhatsApp, or email text to evaluate scam risk.</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>💡 Safety Tip of the Day</Text>
        <Text style={styles.tipText}>
          Never click links sent from unknown numbers claiming your bank account or SIM card is blocked. Always verify using official bank apps.
        </Text>
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
    paddingTop: 32,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  protectionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    color: colors.safe,
    fontSize: 14,
    marginRight: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  toolCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredToolCard: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  toolHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeFeatured: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeFeaturedText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  toolIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  toolIcon: {
    fontSize: 22,
  },
  toolInfo: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  toolDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  tipCard: {
    backgroundColor: colors.safeBg,
    borderColor: colors.safeBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.safe,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
  },
});
