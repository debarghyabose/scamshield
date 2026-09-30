import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { api } from '../services/api';
import { colors } from '../theme/colors';

export default function HistoryScreen() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);

  const fetchHistory = async () => {
    try {
      const data = await api.listScans();
      setScans(data?.items || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Scan', 'Are you sure you want to delete this scan from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteScan(id);
            setScans((prev) => prev.filter((s) => s.id !== id));
            if (selectedScan?.id === id) setSelectedScan(null);
          } catch (e) {
            Alert.alert('Error', 'Unable to delete scan.');
          }
        },
      },
    ]);
  };

  const riskBadgeColor = (level) => {
    if (level === 'DANGEROUS') return colors.dangerous;
    if (level === 'SUSPICIOUS') return colors.suspicious;
    return colors.safe;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedScan(item)}>
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.scan_type.toUpperCase()}</Text>
        </View>
        <Text style={[styles.riskBadge, { color: riskBadgeColor(item.risk_level) }]}>
          ● {item.risk_level} ({item.risk_score})
        </Text>
      </View>
      <Text style={styles.cardText} numberOfLines={2}>
        {item.input_text}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan History</Text>
      <Text style={styles.subtitle}>Your saved scam analysis history.</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : scans.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No Scans Found</Text>
          <Text style={styles.emptyDesc}>Scans performed while signed in will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}

      {selectedScan && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scan Detail</Text>
            <Text style={styles.modalSummary}>{selectedScan.summary}</Text>
            <Text style={styles.modalInput}>Input: {selectedScan.input_text}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedScan(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: colors.inputBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  riskBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  deleteText: {
    color: colors.dangerous,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  modalSummary: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  modalInput: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  closeBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
