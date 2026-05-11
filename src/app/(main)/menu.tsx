import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Switch,
  Image,
  Alert,
  Modal,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Share,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Design Tokens ─────────────────────────────────────────────────
const C = {
  primary:   '#E85D04',
  primaryBg: '#FFF1E8',

  bg:        '#F5F5F5',
  surface:   '#FFFFFF',
  border:    '#EBEBEB',

  text:      '#1A1A1A',
  text2:     '#6B6B6B',
  text3:     '#ADADAD',

  green:     '#16A34A',
  greenBg:   '#F0FDF4',
  red:       '#DC2626',
  redBg:     '#FFF1F1',
};

// ─── Types ─────────────────────────────────────────────────────────
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  active: boolean;
  cat: 'main' | 'side' | 'drink' | 'dessert';
  desc?: string;
  image?: string;
  prep?: number;
  cal?: number;
  orders?: number;
}

type FilterKey = 'all' | 'active' | 'inactive';

const CAT_LABELS: Record<string, string> = {
  main: 'Main', side: 'Side', drink: 'Drink', dessert: 'Dessert',
};

const DEF_IMAGES: Record<string, string> = {
  main:    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200',
  side:    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200',
  drink:   'https://images.unsplash.com/photo-1571167366136-b57e973b8b41?w=200',
  dessert: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200',
};

// ─── Mock Data ──────────────────────────────────────────────────────
const MOCK_MENU: MenuItem[] = [
  { id:'1',  name:'Chicken Curry',   price:180, active:true,  cat:'main',    desc:'Rich creamy tomato-based curry',       prep:25, cal:420, orders:48, image:'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200' },
  { id:'2',  name:'Veg Curry',       price:120, active:true,  cat:'main',    desc:'Seasonal vegetables in spiced gravy',  prep:20, cal:280, orders:32, image:'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200' },
  { id:'3',  name:'Curd',            price:40,  active:true,  cat:'side',    desc:'Fresh home-style curd',                prep:5,  cal:110, orders:61, image:'https://images.unsplash.com/photo-1571167530149-c1105da4bfe4?w=200' },
  { id:'4',  name:'Dal Fry',         price:100, active:false, cat:'main',    desc:'Yellow lentils tempered with garlic',  prep:30, cal:310, orders:19, image:'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=200' },
  { id:'5',  name:'White Rice',      price:60,  active:true,  cat:'side',    desc:'Steamed basmati rice',                 prep:15, cal:200, orders:74, image:'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=200' },
  { id:'6',  name:'Breakfast Thali', price:120, active:true,  cat:'main',    desc:'Complete morning meal combo',          prep:15, cal:490, orders:27, image:'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=200' },
  { id:'7',  name:'Dal Tadka',       price:100, active:false, cat:'main',    desc:'Smoked lentils with tempering',        prep:25, cal:320, orders:11, image:'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=200' },
  { id:'8',  name:'Butter Naan',     price:40,  active:true,  cat:'side',    desc:'Soft buttered flatbread',              prep:10, cal:180, orders:88, image:'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200' },
  { id:'9',  name:'Lassi',           price:60,  active:false, cat:'drink',   desc:'Chilled sweet yogurt drink',           prep:5,  cal:160, orders:22, image:'https://images.unsplash.com/photo-1571167366136-b57e973b8b41?w=200' },
  { id:'10', name:'Paneer Masala',   price:160, active:true,  cat:'main',    desc:'Cottage cheese in spiced onion gravy', prep:30, cal:380, orders:55, image:'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200' },
  { id:'11', name:'Gulab Jamun',     price:50,  active:true,  cat:'dessert', desc:'Soft milk-solid dumplings in syrup',   prep:5,  cal:240, orders:36, image:'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200' },
  { id:'12', name:'Mango Lassi',     price:80,  active:true,  cat:'drink',   desc:'Thick mango-blended yogurt drink',     prep:5,  cal:210, orders:43, image:'https://images.unsplash.com/photo-1571167366136-b57e973b8b41?w=200' },
];

// ─── Toast ─────────────────────────────────────────────────────────
function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState('');
  const [type, setType] = useState<'ok' | 'warn'>('ok');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, t: 'ok' | 'warn' = 'ok') => {
    setMsg(message);
    setType(t);
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    }, 2200);
  }, [opacity]);

  const ToastView = useCallback(() => (
    <Animated.View style={[styles.toast, { opacity }]}>
      <View style={[styles.toastDot, { backgroundColor: type === 'ok' ? C.green : C.red }]} />
      <Text style={styles.toastText}>{msg}</Text>
    </Animated.View>
  ), [opacity, msg, type]);

  return { show, ToastView };
}

// ─── Item Form Modal ────────────────────────────────────────────────
let _nextId = 13;

interface ItemFormProps {
  visible: boolean;
  initial?: MenuItem | null;
  onSave: (data: Partial<MenuItem>) => void;
  onClose: () => void;
}

function ItemFormModal({ visible, initial, onSave, onClose }: ItemFormProps) {
  const [name, setName]     = useState('');
  const [price, setPrice]   = useState('');
  const [cat, setCat]       = useState<MenuItem['cat']>('main');
  const [desc, setDesc]     = useState('');
  const [image, setImage]   = useState('');
  const [prep, setPrep]     = useState('');
  const [cal, setCal]       = useState('');
  const [active, setActive] = useState(true);

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setPrice(initial?.price ? String(initial.price) : '');
      setCat(initial?.cat ?? 'main');
      setDesc(initial?.desc ?? '');
      setImage(initial?.image ?? '');
      setPrep(initial?.prep ? String(initial.prep) : '');
      setCal(initial?.cal ? String(initial.cal) : '');
      setActive(initial?.active ?? true);
    }
  }, [visible, initial]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a name'); return; }
    onSave({
      name: name.trim(),
      price: parseInt(price) || 0,
      cat,
      desc: desc.trim(),
      image: image.trim() || DEF_IMAGES[cat],
      prep: parseInt(prep) || 0,
      cal: parseInt(cal) || 0,
      active,
    });
  };

  const CATS: MenuItem['cat'][] = ['main', 'side', 'drink', 'dessert'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.veil} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={styles.formSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{initial ? 'Edit Item' : 'New Item'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={C.text2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Category */}
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              <View style={styles.catRow}>
                {CATS.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCat(c)}
                    style={[styles.catPill, cat === c && styles.catPillActive]}
                  >
                    <Text style={[styles.catPillText, cat === c && styles.catPillTextActive]}>
                      {CAT_LABELS[c]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Image preview */}
            {!!image && (
              <Image source={{ uri: image }} style={styles.imgPreview} resizeMode="cover" />
            )}

            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Butter Chicken"
              placeholderTextColor={C.text3}
            />

            <View style={styles.twoCol}>
              <View style={styles.colHalf}>
                <Text style={styles.fieldLabel}>Price (₹)</Text>
                <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="120" placeholderTextColor={C.text3} />
              </View>
              <View style={styles.colHalf}>
                <Text style={styles.fieldLabel}>Prep time (min)</Text>
                <TextInput style={styles.input} value={prep} onChangeText={setPrep} keyboardType="numeric" placeholder="20" placeholderTextColor={C.text3} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={desc}
              onChangeText={setDesc}
              placeholder="Short description…"
              placeholderTextColor={C.text3}
              multiline
            />

            <Text style={styles.fieldLabel}>Image URL</Text>
            <TextInput
              style={styles.input}
              value={image}
              onChangeText={setImage}
              placeholder="https://…"
              placeholderTextColor={C.text3}
              autoCapitalize="none"
            />

            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Available now</Text>
              <Switch
                value={active}
                onValueChange={setActive}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor="#fff"
                ios_backgroundColor={C.border}
              />
            </View>
          </ScrollView>

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{initial ? 'Save Changes' : 'Add Item'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Detail Bottom Sheet ────────────────────────────────────────────
function DetailSheet({
  item,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  item: MenuItem | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { width: SW } = useWindowDimensions();

  if (!item) return null;

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.veil} onPress={onClose} activeOpacity={1} />
      <View style={styles.detailSheet}>
        <View style={styles.sheetHandle} />

        {/* Image */}
        <Image
          source={{ uri: item.image || DEF_IMAGES[item.cat] }}
          style={[styles.detailImg, { width: SW - 32 }]}
          resizeMode="cover"
        />

        <View style={styles.detailBody}>
          {/* Name + Price */}
          <View style={styles.detailTopRow}>
            <View style={styles.detailTitleWrap}>
              <Text style={styles.detailName} numberOfLines={2} ellipsizeMode="tail">
                {item.name}
              </Text>
              <Text style={styles.detailCat}>{CAT_LABELS[item.cat]}</Text>
            </View>
            <Text style={styles.detailPrice}>₹{item.price}</Text>
          </View>

          {/* Status chip */}
          <View style={[styles.statusChip, { backgroundColor: item.active ? C.greenBg : C.redBg }]}>
            <View style={[styles.statusDot, { backgroundColor: item.active ? C.green : C.red }]} />
            <Text style={[styles.statusText, { color: item.active ? C.green : C.red }]}>
              {item.active ? 'Available' : 'Not available'}
            </Text>
          </View>

          {/* Description */}
          {!!item.desc && <Text style={styles.detailDesc}>{item.desc}</Text>}

          {/* Stats */}
          <View style={styles.detailStats}>
            {[
              { label: 'Orders', value: String(item.orders ?? 0) },
              { label: 'Prep', value: item.prep ? `${item.prep} min` : '—' },
              { label: 'Calories', value: item.cal ? `${item.cal} cal` : '—' },
            ].map(s => (
              <View key={s.label} style={styles.statPill}>
                <Text style={styles.statPillVal}>{s.value}</Text>
                <Text style={styles.statPillLbl}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Primary action */}
          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.editBtnText}>Edit Item</Text>
          </TouchableOpacity>

          {/* Secondary actions */}
          <View style={styles.detailSecondaryRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => Share.share({ message: `${item.name} – ₹${item.price}` })}
            >
              <Ionicons name="share-outline" size={15} color={C.text2} />
              <Text style={styles.secondaryBtnText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={onDuplicate}>
              <Ionicons name="copy-outline" size={15} color={C.text2} />
              <Text style={styles.secondaryBtnText}>Duplicate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryBtn, styles.secondaryBtnDanger]} onPress={onDelete}>
              <Ionicons name="trash-outline" size={15} color={C.red} />
              <Text style={[styles.secondaryBtnText, { color: C.red }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Menu Item Row ──────────────────────────────────────────────────
function MenuRow({
  item,
  onToggle,
  onPress,
}: {
  item: MenuItem;
  onToggle: () => void;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.row, !item.active && styles.rowInactive]}
    >
      {/* Left accent strip for inactive */}
      {!item.active && <View style={styles.inactiveStrip} />}

      {/* Thumbnail */}
      <Image
        source={{ uri: item.image || DEF_IMAGES[item.cat] }}
        style={styles.rowImg}
        resizeMode="cover"
      />

      {/* Info */}
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1} ellipsizeMode="tail">
          {item.name}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={styles.rowPrice}>₹{item.price}</Text>
          <Text style={styles.rowDot}>·</Text>
          <Text style={styles.rowCat}>{CAT_LABELS[item.cat]}</Text>
        </View>
      </View>

      {/* Toggle */}
      <Switch
        value={item.active}
        onValueChange={onToggle}
        trackColor={{ false: C.border, true: C.primary }}
        thumbColor="#fff"
        ios_backgroundColor={C.border}
      />
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────
export default function MenuScreen() {
  const [items, setItems]             = useState<MenuItem[]>(MOCK_MENU);
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState<FilterKey>('all');
  const [formVisible, setFormVisible] = useState(false);
  const [editItem, setEditItem]       = useState<MenuItem | null>(null);
  const [detailItem, setDetailItem]   = useState<MenuItem | null>(null);

  const { show: showToast, ToastView } = useToast();

  // ── Derived ──
  const counts = useMemo(() => ({
    all:      items.length,
    active:   items.filter(i => i.active).length,
    inactive: items.filter(i => !i.active).length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter(i => {
      const matchSearch = !q
        || i.name.toLowerCase().includes(q)
        || (i.desc || '').toLowerCase().includes(q)
        || String(i.price).includes(q);
      const matchFilter =
        filter === 'all'
        || (filter === 'active' && i.active)
        || (filter === 'inactive' && !i.active);
      return matchSearch && matchFilter;
    });
  }, [items, search, filter]);

  // ── Actions ──
  const toggleActive = useCallback((id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, active: !i.active } : i));
    const item = items.find(i => i.id === id);
    if (item) showToast(item.active ? 'Item turned off' : 'Item is now live', item.active ? 'warn' : 'ok');
  }, [items, showToast]);

  const deleteItem = useCallback((id: string) => {
    Alert.alert('Delete Item', 'This item will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setItems(prev => prev.filter(i => i.id !== id));
          setDetailItem(null);
          showToast('Item deleted', 'warn');
        },
      },
    ]);
  }, [showToast]);

  const duplicateItem = useCallback((id: string) => {
    const src = items.find(i => i.id === id);
    if (!src) return;
    const copy: MenuItem = { ...src, id: String(_nextId++), name: `${src.name} (copy)`, orders: 0 };
    setItems(prev => [...prev, copy]);
    setDetailItem(null);
    showToast(`"${src.name}" duplicated`, 'ok');
  }, [items, showToast]);

  const handleSave = useCallback((data: Partial<MenuItem>) => {
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...data } : i));
      showToast('Item updated', 'ok');
    } else {
      setItems(prev => [...prev, { id: String(_nextId++), orders: 0, ...data } as MenuItem]);
      showToast('Item added', 'ok');
    }
    setFormVisible(false);
    setEditItem(null);
  }, [editItem, showToast]);

  const openEdit = useCallback((item: MenuItem) => {
    setEditItem(item);
    setDetailItem(null);
    setFormVisible(true);
  }, []);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: `All (${counts.all})` },
    { key: 'active',   label: `Live (${counts.active})` },
    { key: 'inactive', label: `Off (${counts.inactive})` },
  ];

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── Header ── */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Menu</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditItem(null); setFormVisible(true); }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={C.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search items…"
            placeholderTextColor={C.text3}
            style={styles.searchInput}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={C.text3} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs — 3 max */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <MenuRow
            item={item}
            onToggle={() => toggleActive(item.id)}
            onPress={() => setDetailItem(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={40} color={C.border} />
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* ── Modals ── */}
      <ItemFormModal
        visible={formVisible}
        initial={editItem}
        onSave={handleSave}
        onClose={() => { setFormVisible(false); setEditItem(null); }}
      />

      <DetailSheet
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={() => { if (detailItem) openEdit(detailItem); }}
        onDelete={() => { if (detailItem) deleteItem(detailItem.id); }}
        onDuplicate={() => { if (detailItem) duplicateItem(detailItem.id); }}
      />

      <ToastView />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Header ──
  header: {
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Search ──
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    padding: 0,
  },

  // ── Filter Tabs ──
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  filterTabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text2,
  },
  filterTabTextActive: {
    color: '#fff',
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 32,
    flexGrow: 1,
  },

  // ── Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  rowInactive: {
    opacity: 0.5,
  },
  inactiveStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.red,
    borderRadius: 2,
  },
  rowImg: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: C.bg,
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text2,
  },
  rowDot: {
    fontSize: 13,
    color: C.text3,
  },
  rowCat: {
    fontSize: 12,
    color: C.text3,
    fontWeight: '500',
  },

  // ── Empty ──
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: C.text3,
    fontWeight: '500',
  },

  // ── Toast ──
  toast: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  toastDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  toastText: {
    fontSize: 13,
    color: C.text,
    fontWeight: '500',
  },

  // ── Shared Modal Helpers ──
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Form Sheet ──
  sheetWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  formSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: C.border,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  fieldLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: C.text3,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    color: C.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 14,
  },
  inputMultiline: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  catScroll: {
    marginBottom: 16,
  },
  catRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  catPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  catPillText: {
    fontSize: 13,
    color: C.text2,
    fontWeight: '500',
  },
  catPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  imgPreview: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: C.bg,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingVertical: 4,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: C.text2,
    fontWeight: '500',
  },
  saveBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },

  // ── Detail Sheet ──
  detailSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  detailImg: {
    alignSelf: 'center',
    height: 170,
    borderRadius: 12,
    backgroundColor: C.bg,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  detailBody: {
    paddingHorizontal: 20,
  },
  detailTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  detailTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  detailCat: {
    fontSize: 13,
    color: C.text3,
    fontWeight: '500',
  },
  detailPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: C.primary,
    flexShrink: 0,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailDesc: {
    fontSize: 14,
    color: C.text2,
    lineHeight: 20,
    marginBottom: 14,
  },
  detailStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statPillVal: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  statPillLbl: {
    fontSize: 10,
    color: C.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '500',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 12,
    height: 50,
    marginBottom: 10,
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  detailSecondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  secondaryBtnDanger: {
    borderColor: C.redBg,
    backgroundColor: C.redBg,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text2,
  },
});