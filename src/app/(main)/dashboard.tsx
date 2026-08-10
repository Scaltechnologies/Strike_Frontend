import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyDashboard } from '../../modules/dashboard/services/dashboardService';
import type { DashboardSummaryResponse, ActiveCardSummary } from '../../modules/dashboard/types/dashboard.types';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primarySoft: '#FFF0EE',
  success:     '#16A34A',
  successSoft: '#F0FDF4',
  warning:     '#D97706',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

const DARK = {
  bg:    '#1A1A1A',
  card:  '#2A2A2A',
  text:  '#FFFFFF',
  text2: '#CCCCCC',
  text3: '#888888',
};

function formatCurrency(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)   return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n.toLocaleString('en-IN');
}

function SkeletonBlock({ w, h, radius = 8 }: { w: number | string; h: number; radius?: number }) {
  return <View style={{ width: w as any, height: h, borderRadius: radius, backgroundColor: '#3A3A3A' }} />;
}

function SkeletonDark() {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[styles.statCard, { flex: 1 }]}>
          <SkeletonBlock w="60%" h={28} />
          <SkeletonBlock w="80%" h={11} radius={5} />
        </View>
        <View style={[styles.statCard, { flex: 1 }]}>
          <SkeletonBlock w="60%" h={28} />
          <SkeletonBlock w="80%" h={11} radius={5} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[styles.statCard, { flex: 1 }]}>
          <SkeletonBlock w="60%" h={28} />
          <SkeletonBlock w="80%" h={11} radius={5} />
        </View>
        <View style={[styles.statCard, { flex: 1 }]}>
          <SkeletonBlock w="60%" h={28} />
          <SkeletonBlock w="80%" h={11} radius={5} />
        </View>
      </View>
    </View>
  );
}

function StatGrid({ data }: { data: DashboardSummaryResponse }) {
  const stats = [
    {
      icon: 'trending-up-outline' as const,
      label: 'Total Revenue',
      value: formatCurrency(data.totalRevenue),
      color: DS.success,
    },
    {
      icon: 'card-outline' as const,
      label: 'Cards Sold',
      value: String(data.totalCardsSold),
      color: '#3B82F6',
    },
    {
      icon: 'people-outline' as const,
      label: 'Active Subs',
      value: String(data.totalActiveSubscriptions),
      color: '#8B5CF6',
    },
    {
      icon: 'arrow-up-circle-outline' as const,
      label: 'Redemptions',
      value: String(data.totalRedemptions),
      color: DS.warning,
    },
  ];

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {stats.slice(0, 2).map(s => (
          <View key={s.label} style={[styles.statCard, { flex: 1 }]}>
            <Ionicons name={s.icon} size={20} color={s.color} style={{ marginBottom: 8 }} />
            <Text style={styles.statVal}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {stats.slice(2).map(s => (
          <View key={s.label} style={[styles.statCard, { flex: 1 }]}>
            <Ionicons name={s.icon} size={20} color={s.color} style={{ marginBottom: 8 }} />
            <Text style={styles.statVal}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CardRow({ card, onPress }: { card: ActiveCardSummary; onPress: () => void }) {
  const name     = card.name ?? 'Card #' + (card.id ?? '—');
  const isActive = card.isActive !== false;
  return (
    <TouchableOpacity style={styles.cardRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardRowIcon}>
        <Ionicons name="card-outline" size={18} color={isActive ? DS.primary : DS.text3} />
      </View>
      <View style={styles.cardRowBody}>
        <Text style={styles.cardRowName} numberOfLines={1}>{name}</Text>
      </View>
      <View style={[styles.cardRowBadge, { backgroundColor: isActive ? DS.successSoft : DS.bg }]}>
        <View style={[styles.dot, { backgroundColor: isActive ? DS.success : DS.text3 }]} />
        <Text style={[styles.cardRowBadgeText, { color: isActive ? DS.success : DS.text3 }]}>
          {isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={DS.text3} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData]             = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const d = await getMyDashboard();
      setData(d);
    } catch (e: any) {
      setError(e?.message ??'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activeCards: ActiveCardSummary[] = data?.activeCards ?? [];
  const filteredCards = activeCards.filter(c => {
    const q = search.toLowerCase();
    return !q || (c.name ?? '').toLowerCase().includes(q) || String(c.id ?? '').includes(q);
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />

      {/* Dark header */}
      <View style={[styles.darkSection, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.pageTitle}>Dashboard</Text>

        {loading ? (
          <SkeletonDark />
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={18} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => load()} style={styles.retryDarkBtn}>
              <Text style={styles.retryDarkText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : data ? (
          <StatGrid data={data} />
        ) : null}
      </View>

      {/* White sheet */}
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Active Cards</Text>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={15} color={DS.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search card name or ID…"
            placeholderTextColor={DS.text3}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={15} color={DS.text3} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filteredCards}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              colors={[DS.primary]}
              tintColor={DS.primary}
            />
          }
          renderItem={({ item }) => (
            <CardRow
              card={item}
              onPress={() => {
                if (item.id == null) return;
                router.push({ pathname: '/(main)/card-detail', params: { id: String(item.id) } });
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="card-outline" size={48} color={DS.text3} />
              <Text style={styles.emptyTitle}>
                {loading ? 'Loading…' : search ? 'No matching cards' : 'No active cards'}
              </Text>
            </View>
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.bg },

  darkSection: {
    backgroundColor: DARK.bg,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  pageTitle: { fontSize: 26, fontWeight: '800', color: DARK.text, marginBottom: 20 },

  statCard: {
    backgroundColor: DARK.card, borderRadius: 14,
    padding: 16, gap: 4,
  },
  statVal:   { fontSize: 26, fontWeight: '800', color: DARK.text, marginBottom: 2 },
  statLabel: { fontSize: 12, color: DARK.text3, fontWeight: '500' },

  errorBox: {
    backgroundColor: DARK.card, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 8,
  },
  errorText:     { fontSize: 13, color: '#f87171', textAlign: 'center' },
  retryDarkBtn:  { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, backgroundColor: '#CC2200', marginTop: 4 },
  retryDarkText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  sheet: {
    flex: 1, backgroundColor: DS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: DS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: DS.text, marginBottom: 12 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: DS.bg, borderRadius: 12, borderWidth: 1, borderColor: DS.border,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: DS.text, padding: 0 },

  listContent: { flexGrow: 1 },

  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  cardRowIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: DS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  cardRowBody:    { flex: 1 },
  cardRowName:    { fontSize: 14, fontWeight: '600', color: DS.text },
  cardRowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  dot:               { width: 6, height: 6, borderRadius: 3 },
  cardRowBadgeText:  { fontSize: 12, fontWeight: '600' },

  emptyWrap:  { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyTitle: { fontSize: 15, color: DS.text2, fontWeight: '600' },
});
