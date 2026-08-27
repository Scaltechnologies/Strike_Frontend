// src/modules/store/components/StoreCategorySelectorSheet.tsx
// Bottom sheet for picking a store's category from the admin-curated list
// (StoreCategoryOption — name only, no thumbnails, unlike menu items'
// CategorySelectorSheet). Selecting closes the sheet immediately.

import { useState, useMemo, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import TextInput from '../../../components/TextInput';
import type { StoreCategoryOption } from '../types/store.types';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primarySoft: '#FFF0EE',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

const SEARCH_THRESHOLD = 8;

interface Props {
  visible: boolean;
  categories: StoreCategoryOption[];
  selectedName: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}

export default function StoreCategorySelectorSheet({ visible, categories, selectedName, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setQuery('');
      enter.setValue(0);
      Animated.spring(enter, { toValue: 1, useNativeDriver: true, friction: 9, tension: 68 }).start();
    }
  }, [visible, enter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  const overlayStyle = { opacity: enter };
  const sheetStyle = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }],
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.veil, overlayStyle]} />
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Select Category</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={DS.text2} />
          </TouchableOpacity>
        </View>

        {categories.length > SEARCH_THRESHOLD && (
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={DS.text3} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search categories"
              placeholderTextColor={DS.text3}
              style={styles.searchInput}
              autoFocus
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={DS.text3} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={c => String(c.id)}
          style={{ maxHeight: 380 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const sel = item.name === selectedName;
            return (
              <TouchableOpacity
                style={[styles.row, sel && styles.rowActive]}
                onPress={() => onSelect(item.name)}
                activeOpacity={0.8}
              >
                <Text style={[styles.rowText, sel && styles.rowTextActive]} numberOfLines={1}>
                  {item.name}
                </Text>
                {sel && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={28} color={DS.border} />
              <Text style={styles.emptyText}>
                {query ? `No categories match "${query}"` : 'No categories yet — ask an admin to add some'}
              </Text>
            </View>
          }
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: { backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    maxHeight: '80%',
    backgroundColor: DS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: DS.border, alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: '800', color: DS.text },
  closeBtn: {
    width: 30, height: 30, borderRadius: 8,
    borderWidth: 1, borderColor: DS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DS.bg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, gap: 8, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: DS.text, padding: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: DS.bg, borderRadius: 14, padding: 12,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  rowActive: { borderColor: DS.primary, backgroundColor: DS.primarySoft },
  rowText: { flex: 1, fontSize: 14.5, fontWeight: '600', color: DS.text },
  rowTextActive: { color: DS.primary },
  checkBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: DS.primary, alignItems: 'center', justifyContent: 'center',
  },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
  emptyText: { fontSize: 13, color: DS.text3, textAlign: 'center' },
});
