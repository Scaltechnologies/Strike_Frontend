import { useCallback } from 'react';
import { View, TouchableOpacity, FlatList, StyleSheet, StatusBar, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/Text';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../modules/notifications/hooks/useNotifications';
import NotificationCard from '../../modules/notifications/components/NotificationCard';
import { resolveNotificationTarget } from '../../modules/notifications/push/notificationRouting';
import { NotificationResponse } from '../../modules/notifications/types/notification.types';

const DS = {
  bg:      '#F6F7FA',
  surface: '#FFFFFF',
  border:  '#EAECEF',
  primary: '#CC2200',
  text:    '#1A1A1A',
  text2:   '#5A6272',
  text3:   '#9BA3AF',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function groupByDate(items: NotificationResponse[]) {
  const map = new Map<string, NotificationResponse[]>();
  for (const n of items) {
    const key = formatDate(n.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(n);
  }
  return map;
}

function SkeletonRow() {
  return (
    <View style={styles.skeletonCard}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8EAED' }} />
      <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
        <View style={{ width: '55%', height: 12, borderRadius: 6, backgroundColor: '#E8EAED' }} />
        <View style={{ width: '80%', height: 10, borderRadius: 6, backgroundColor: '#E8EAED' }} />
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    items, loading, refreshing, error, unreadCount,
    loadNotifications, markAsRead, markAllAsRead,
  } = useNotifications();

  useFocusEffect(useCallback(() => { loadNotifications(); }, [loadNotifications]));

  const grouped = groupByDate(items);
  const dateKeys = Array.from(grouped.keys());

  type ListItem =
    | { kind: 'header'; date: string; key: string }
    | { kind: 'item'; n: NotificationResponse; key: string };

  const listData: ListItem[] = dateKeys.flatMap(date => [
    { kind: 'header' as const, date, key: `h-${date}` },
    ...grouped.get(date)!.map(n => ({ kind: 'item' as const, n, key: `n-${n.id}` })),
  ]);

  function handlePress(n: NotificationResponse) {
    if (!n.isRead) markAsRead(n.id);
    const target = resolveNotificationTarget(n);
    if (target) router.push({ pathname: target.pathname as any, params: target.params });
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={22} color={DS.text} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Notifications</Text>
          <TouchableOpacity
            onPress={markAllAsRead}
            disabled={unreadCount === 0}
            hitSlop={8}
            style={{ opacity: unreadCount === 0 ? 0.35 : 1 }}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.listContent}>
          {Array(6).fill(0).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={DS.text3} />
          <Text style={styles.emptyTitle}>Could not load notifications</Text>
          <Text style={styles.emptyDesc}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadNotifications()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => item.key}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              colors={[DS.primary]}
              tintColor={DS.primary}
            />
          }
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>{item.date}</Text>
                  <View style={styles.dateHeaderLine} />
                </View>
              );
            }
            return <NotificationCard notification={item.n} onPress={() => handlePress(item.n)} />;
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={48} color={DS.text3} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyDesc}>We'll let you know when something needs your attention.</Text>
            </View>
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.bg },

  header: {
    backgroundColor: DS.surface, paddingHorizontal: 12, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: DS.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontSize: 17, fontWeight: '800', color: DS.text },
  markAllText: { fontSize: 13, fontWeight: '700', color: DS.primary },

  listContent: { paddingHorizontal: 16, paddingTop: 16 },

  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 6 },
  dateHeaderText: { fontSize: 12, fontWeight: '700', color: DS.text3 },
  dateHeaderLine: { flex: 1, height: 1, backgroundColor: DS.border },

  skeletonCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DS.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: DS.border,
  },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: DS.text, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: DS.text3, marginTop: 4, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: DS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
