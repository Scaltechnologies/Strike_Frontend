import { useState, useCallback } from 'react';
import {
  View, TouchableOpacity, ScrollView, Modal,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import { useRouter, useFocusEffect } from 'expo-router';
import { useRedemption } from '../../modules/redemption/store/RedemptionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getMyStore,
  updateMyStore,
  updateStoreStatus,
  uploadStoreBanner,
  upsertStoreTiming,
  deleteStoreTiming,
  addStoreHoliday,
  deleteStoreHoliday,
  getStoreCategories,
} from '../../modules/store/services/storeService';
import BannerPicker from '../../modules/store/components/BannerPicker';
import StoreCategorySelectorSheet from '../../modules/store/components/StoreCategorySelectorSheet';
import { resolveMediaUrl } from '../../core/api/mediaUrl';
import type {
  StoreResponse,
  StoreTimingResponse,
  StoreHolidayResponse,
  StoreDetailsRequest,
  StoreCategoryOption,
  DayOfWeek,
  StoreStatus,
} from '../../modules/store/types/store.types';

// ── Design tokens ──────────────────────────────────────────────────────────

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primarySoft: '#FFF0EE',
  success:     '#16A34A',
  successSoft: '#F0FDF4',
  warning:     '#D97706',
  warningSoft: '#FFFBEB',
  error:       '#DC2626',
  errorSoft:   '#FEF2F2',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

const DARK = {
  bg:    '#1C1209',
  text:  '#FFFFFF',
  text3: '#9B7E5E',
};

// ── Constants ──────────────────────────────────────────────────────────────

const DAYS: DayOfWeek[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];

const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
  FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

const DAY_FULL: Record<DayOfWeek, string> = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
};

const MINS = [0, 15, 30, 45];

// ── Helpers ────────────────────────────────────────────────────────────────

function snapMin(m: number): number {
  return MINS.reduce((best, cur) =>
    Math.abs(cur - m) < Math.abs(best - m) ? cur : best, 0);
}

function parseTime(t: string | null): { h: number; m: number } {
  if (!t) return { h: 9, m: 0 };
  const [hh, mm] = t.split(':').map(Number);
  return { h: isNaN(hh) ? 9 : hh, m: snapMin(isNaN(mm) ? 0 : mm) };
}

// Java LocalTime default string format is HH:mm:ss — sending HH:mm can fail
// Jackson deserialization in Spring Boot without explicit JSR-310 config.
function fmtTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function fmtTimeStr(t: string | null): string {
  return t ? t.slice(0, 5) : '--:--';
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return !isNaN(new Date(s + 'T00:00:00').getTime());
}

function statusMeta(status: StoreStatus | undefined) {
  if (status === 'ACTIVE')              return { label: 'Open',               color: DS.success, bg: DS.successSoft };
  if (status === 'TEMPORARILY_CLOSED')  return { label: 'Temporarily Closed', color: DS.warning, bg: DS.warningSoft };
  return { label: 'Inactive', color: DS.text3, bg: DS.bg };
}

// ── Sub-component: Stepper ────────────────────────────────────────────────

function Stepper({ value, onInc, onDec, fmt }: {
  value: number; onInc: () => void; onDec: () => void; fmt: (v: number) => string;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={onInc} style={styles.stepBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}>
        <Ionicons name="chevron-up" size={20} color={DS.primary} />
      </TouchableOpacity>
      <Text style={styles.stepValue}>{fmt(value)}</Text>
      <TouchableOpacity onPress={onDec} style={styles.stepBtn} activeOpacity={0.7} hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-down" size={20} color={DS.primary} />
      </TouchableOpacity>
    </View>
  );
}

// ── Sub-component: Timing Modal ────────────────────────────────────────────

interface TimingState {
  days: DayOfWeek[];
  isClosed: boolean;
  openH: number; openM: number;
  closeH: number; closeM: number;
}

const WEEKDAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const WEEKENDS: DayOfWeek[] = ['SATURDAY', 'SUNDAY'];

function sameDaySet(a: DayOfWeek[], b: DayOfWeek[]): boolean {
  return a.length === b.length && a.every(d => b.includes(d));
}

function TimingModal({ state, hasExisting, onClose, onSave, onRemove, saving, progress }: {
  state: TimingState;
  // Whether a saved timing already exists for the (single) day this modal opened
  // for — controls whether the "remove" affordance is offered at all.
  hasExisting: boolean;
  onClose: () => void;
  onSave: (s: TimingState) => void;
  onRemove: () => void;
  saving: boolean;
  progress: { done: number; total: number } | null;
}) {
  const [local, setLocal] = useState<TimingState>(state);
  const set = (patch: Partial<TimingState>) => setLocal(p => ({ ...p, ...patch }));

  const nextMin = (m: number) => MINS[(MINS.indexOf(m) + 1) % MINS.length];
  const prevMin = (m: number) => MINS[(MINS.indexOf(m) - 1 + MINS.length) % MINS.length];
  const pad = (v: number) => String(v).padStart(2, '0');

  const toggleDay = (day: DayOfWeek) => {
    set({
      days: local.days.includes(day)
        ? local.days.filter(d => d !== day)
        : [...local.days, day],
    });
  };

  const dayCount = local.days.length;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>
            {dayCount === 1 ? DAY_FULL[local.days[0]] : dayCount === 7 ? 'Every Day' : `${dayCount} Days`}
          </Text>
          <Text style={styles.modalSub}>
            {dayCount <= 1
              ? 'Set operating hours for this day, or select more days below to apply the same hours everywhere.'
              : 'These hours will be applied to every day selected below.'}
          </Text>

          {/* Day picker — set once, apply to as many days as needed */}
          <View style={styles.dayPickerWrap}>
            <View style={styles.dayChipRow}>
              {DAYS.map(day => {
                const active = local.days.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => toggleDay(day)}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                      {DAY_SHORT[day].slice(0, 2)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.dayPresetRow}>
              {(
                [
                  { label: 'All days',  days: DAYS },
                  { label: 'Weekdays',  days: WEEKDAYS },
                  { label: 'Weekends',  days: WEEKENDS },
                ] as const
              ).map(p => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => set({ days: p.days.slice() })}
                  style={[styles.dayPresetBtn, sameDaySet(local.days, p.days as DayOfWeek[]) && styles.dayPresetBtnActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dayPresetText, sameDaySet(local.days, p.days as DayOfWeek[]) && styles.dayPresetTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Open / Closed toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleOpt, !local.isClosed && styles.toggleOptOpen]}
              onPress={() => set({ isClosed: false })}
              activeOpacity={0.8}
            >
              <Ionicons name="time-outline" size={16} color={!local.isClosed ? DS.success : DS.text3} />
              <Text style={[styles.toggleOptText, !local.isClosed && { color: DS.success, fontWeight: '700' }]}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOpt, local.isClosed && styles.toggleOptClosed]}
              onPress={() => set({ isClosed: true })}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={16} color={local.isClosed ? DS.error : DS.text3} />
              <Text style={[styles.toggleOptText, local.isClosed && { color: DS.error, fontWeight: '700' }]}>Closed</Text>
            </TouchableOpacity>
          </View>

          {/* Time pickers — only shown when Open */}
          {!local.isClosed && (
            <View style={styles.timePickers}>
              <View style={styles.timeGroup}>
                <Text style={styles.timeGroupLabel}>Opens</Text>
                <View style={styles.timeRow}>
                  <Stepper value={local.openH} onInc={() => set({ openH: (local.openH + 1) % 24 })} onDec={() => set({ openH: (local.openH - 1 + 24) % 24 })} fmt={pad} />
                  <Text style={styles.timeSep}>:</Text>
                  <Stepper value={local.openM} onInc={() => set({ openM: nextMin(local.openM) })} onDec={() => set({ openM: prevMin(local.openM) })} fmt={pad} />
                </View>
              </View>
              <View style={styles.timeArrow}>
                <Ionicons name="arrow-forward" size={16} color={DS.text3} />
              </View>
              <View style={styles.timeGroup}>
                <Text style={styles.timeGroupLabel}>Closes</Text>
                <View style={styles.timeRow}>
                  <Stepper value={local.closeH} onInc={() => set({ closeH: (local.closeH + 1) % 24 })} onDec={() => set({ closeH: (local.closeH - 1 + 24) % 24 })} fmt={pad} />
                  <Text style={styles.timeSep}>:</Text>
                  <Stepper value={local.closeM} onInc={() => set({ closeM: nextMin(local.closeM) })} onDec={() => set({ closeM: prevMin(local.closeM) })} fmt={pad} />
                </View>
              </View>
            </View>
          )}

          <View style={styles.modalActions}>
            {dayCount === 1 && hasExisting && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={onRemove}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={17} color={DS.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (saving || dayCount === 0) && { opacity: 0.6 }]}
              onPress={() => dayCount > 0 && onSave(local)}
              disabled={saving || dayCount === 0}
              activeOpacity={0.85}
            >
              {saving
                ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    {progress && (
                      <Text style={styles.saveBtnText}>Saving {progress.done}/{progress.total}…</Text>
                    )}
                  </>
                )
                : <Text style={styles.saveBtnText}>
                    {dayCount === 0 ? 'Select a day' : dayCount === 1 ? 'Save' : `Save to ${dayCount} Days`}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Sub-component: Holiday Modal ──────────────────────────────────────────

function HolidayModal({ onClose, onSave, saving }: {
  onClose: () => void;
  onSave: (date: string, reason: string) => void;
  saving: boolean;
}) {
  const [date, setDate]     = useState(todayISO());
  const [reason, setReason] = useState('');
  const dateErr = date.length > 0 && !isValidDate(date);
  const canSave = isValidDate(date) && !saving;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <View style={[styles.modalIconWrap, { backgroundColor: DS.warningSoft }]}>
            <Ionicons name="calendar-outline" size={32} color={DS.warning} />
          </View>
          <Text style={styles.modalTitle}>Add Holiday</Text>
          <Text style={styles.modalSub}>Store will be marked closed on this date.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Date</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={DS.text3}
              style={[styles.formInput, dateErr && { borderColor: DS.error }]}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            {dateErr && <Text style={styles.formError}>Enter a valid date (YYYY-MM-DD)</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Reason (optional)</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Diwali, Republic Day…"
              placeholderTextColor={DS.text3}
              style={styles.formInput}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}
              onPress={() => { if (canSave) onSave(date, reason.trim()); }}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>Add Holiday</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function StoreSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshStoreMeta } = useRedemption();

  // ── Data
  const [store, setStore]   = useState<StoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  // ── Info edit
  const [editing, setEditing]         = useState(false);
  const [savingInfo, setSavingInfo]   = useState(false);
  const [editName, setEditName]       = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone]     = useState('');
  const [editEmail, setEditEmail]     = useState('');
  const [editCategory, setEditCategory]     = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<StoreCategoryOption[]>([]);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);

  // ── Status
  const [savingStatus, setSavingStatus] = useState(false);

  // ── Banner
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // ── Timings
  const [timingModal, setTimingModal]   = useState<TimingState | null>(null);
  const [savingTiming, setSavingTiming] = useState(false);
  const [savingProgress, setSavingProgress] = useState<{ done: number; total: number } | null>(null);

  // ── Holidays
  const [showHolidayModal, setShowHolidayModal]     = useState(false);
  const [savingHoliday, setSavingHoliday]           = useState(false);
  const [deletingHolidayId, setDeletingHolidayId]   = useState<number | null>(null);

  // ── Load
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getMyStore();
      setStore(s);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load store settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Info edit
  const startEdit = () => {
    if (!store) return;
    setEditName(store.name ?? '');
    setEditAddress(store.address ?? '');
    setEditPhone(store.phone ?? '');
    setEditEmail(store.email ?? '');
    setEditCategory(store.category ?? '');
    setEditDescription(store.description ?? '');
    setEditing(true);
    // Best-effort — an empty/failed fetch just means the picker shows nothing
    // to pick, not a blocker to editing the rest of the store's info.
    getStoreCategories().then(setCategoryOptions).catch(() => setCategoryOptions([]));
  };

  const saveInfo = async () => {
    if (!store) return;
    setSavingInfo(true);
    try {
      const payload: StoreDetailsRequest = {
        name: editName.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        category: editCategory.trim() || undefined,
        description: editDescription.trim() || undefined,
        latitude: store.latitude ?? undefined,
        longitude: store.longitude ?? undefined,
      };
      const updated = await updateMyStore(payload);
      setStore(updated);
      setEditing(false);
      refreshStoreMeta();
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message ?? 'Could not update store info');
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Banner
  const pickBanner = async (uri: string) => {
    if (!store) return;
    setUploadingBanner(true);
    try {
      const updated = await uploadStoreBanner(uri);
      setStore(updated);
      refreshStoreMeta();
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message ?? 'Could not upload store banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  // ── Status toggle
  const toggleStatus = async () => {
    if (!store || store.status === 'INACTIVE') return;
    const next: StoreStatus = store.status === 'ACTIVE' ? 'TEMPORARILY_CLOSED' : 'ACTIVE';
    setSavingStatus(true);
    try {
      const updated = await updateStoreStatus(next);
      setStore(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not update store status');
    } finally {
      setSavingStatus(false);
    }
  };

  // ── Timings
  const timingsMap = (store?.timings ?? []).reduce<Record<string, StoreTimingResponse>>(
    (acc, t) => { acc[t.dayOfWeek] = t; return acc; }, {},
  );

  const openTimingModal = (day: DayOfWeek) => {
    const existing = timingsMap[day] ?? null;
    const op = parseTime(existing?.openTime ?? null);
    const cl = parseTime(existing?.closeTime ?? '21:00');
    setTimingModal({
      days: [day],
      isClosed: existing?.isClosed ?? false,
      openH: op.h, openM: op.m,
      closeH: existing ? cl.h : 21, closeM: cl.m,
    });
  };

  // Entry point for the "Set Weekly Hours" shortcut — opens the same modal
  // with every day pre-selected, so setting up a typical week (same hours
  // every day) takes one Save instead of seven.
  const openBulkTimingModal = () => {
    setTimingModal({
      days: [...DAYS],
      isClosed: false,
      openH: 9, openM: 0,
      closeH: 21, closeM: 0,
    });
  };

  const saveTiming = async (s: TimingState) => {
    if (!store || s.days.length === 0) return;
    setSavingTiming(true);
    setSavingProgress(s.days.length > 1 ? { done: 0, total: s.days.length } : null);
    try {
      // Sequential, not Promise.all: firing a burst of concurrent DELETE+POST
      // pairs at the same store's timings collection (up to 2x days requests
      // at once) overwhelmed the connection on a real device and surfaced as
      // a bare network failure. One day at a time is slower but reliable —
      // this is a settings screen, not a hot path.
      for (let i = 0; i < s.days.length; i++) {
        const day = s.days[i];
        const existing = timingsMap[day] ?? null;
        const payload = {
          dayOfWeek: day,
          isClosed: s.isClosed,
          // Always send null (not omit) so Spring Boot doesn't NPE on absent fields
          openTime: s.isClosed ? null : fmtTime(s.openH, s.openM),
          closeTime: s.isClosed ? null : fmtTime(s.closeH, s.closeM),
        };

        // The backend's POST upsert may have a Hibernate LazyInitException
        // (it loads store.timings lazily to check for duplicates → crashes).
        // Workaround: if a timing already exists, DELETE it first so POST sees
        // a clean slate and runs a simple INSERT with no lazy-load needed.
        if (existing) {
          await deleteStoreTiming(store.id, existing.id);
        }
        const result = await upsertStoreTiming(store.id, payload);

        // Commit each day as it lands (not once at the end) so if a later day
        // in the batch fails, the days that already saved aren't lost from
        // the UI — and re-opening this same modal won't try to redo them.
        setStore(prev => {
          if (!prev) return prev;
          const rest = (prev.timings ?? []).filter(t => t.dayOfWeek !== day);
          return { ...prev, timings: [...rest, result] };
        });
        setSavingProgress(s.days.length > 1 ? { done: i + 1, total: s.days.length } : null);
      }

      setTimingModal(null);
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message ?? 'Could not save timing');
    } finally {
      setSavingTiming(false);
      setSavingProgress(null);
    }
  };

  const removeTiming = async () => {
    const day = timingModal?.days[0];
    const existing = day ? timingsMap[day] : null;
    if (!store || !existing) return;
    setSavingTiming(true);
    try {
      await deleteStoreTiming(store.id, existing.id);
      setStore(prev => {
        if (!prev) return prev;
        return { ...prev, timings: (prev.timings ?? []).filter(t => t.id !== existing.id) };
      });
      setTimingModal(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not remove timing');
    } finally {
      setSavingTiming(false);
    }
  };

  // ── Holidays
  const saveHoliday = async (date: string, reason: string) => {
    if (!store) return;
    setSavingHoliday(true);
    try {
      const added = await addStoreHoliday(store.id, { date, reason: reason || undefined });
      setStore(prev => {
        if (!prev) return prev;
        return { ...prev, holidays: [...(prev.holidays ?? []), added] };
      });
      setShowHolidayModal(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not add holiday');
    } finally {
      setSavingHoliday(false);
    }
  };

  const confirmRemoveHoliday = (h: StoreHolidayResponse) => {
    Alert.alert(
      'Remove Holiday',
      `Remove ${fmtDate(h.date)}${h.reason ? ` — ${h.reason}` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            if (!store) return;
            setDeletingHolidayId(h.id);
            try {
              await deleteStoreHoliday(store.id, h.id);
              setStore(prev => {
                if (!prev) return prev;
                return { ...prev, holidays: (prev.holidays ?? []).filter(x => x.id !== h.id) };
              });
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not remove holiday');
            } finally {
              setDeletingHolidayId(null);
            }
          },
        },
      ],
    );
  };

  // ── Derived
  const meta = statusMeta(store?.status);
  const sortedHolidays = [...(store?.holidays ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const canSaveInfo = editName.trim().length > 0 && editAddress.trim().length > 0 && !savingInfo;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />

      {/* ── Dark header ── */}
      <View style={[styles.darkHeader, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={DARK.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Store Settings</Text>
            {store && <Text style={styles.headerSub} numberOfLines={1}>{store.name}</Text>}
          </View>
          {store && !loading && (
            <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
              <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── White sheet ── */}
      <View style={styles.sheet}>
        {loading ? (
          <View style={styles.centreWrap}>
            <ActivityIndicator color={DS.primary} size="large" />
            <Text style={styles.centreText}>Loading store settings…</Text>
          </View>
        ) : error ? (
          <View style={styles.centreWrap}>
            <Ionicons name="cloud-offline-outline" size={48} color={DS.text3} />
            <Text style={styles.errorTitle}>Could not load</Text>
            <Text style={styles.centreText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : store ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
          >

            {/* ══ Store Banner ══ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Store Banner</Text>
              <BannerPicker
                uri={resolveMediaUrl(store.logoUrl)}
                onPick={pickBanner}
                uploading={uploadingBanner}
              />
            </View>

            {/* ══ Store Status ══ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Store Status</Text>
              <View style={styles.statusCard}>
                <View style={[styles.statusIconWrap, { backgroundColor: meta.bg }]}>
                  <Ionicons
                    name={store.status === 'ACTIVE' ? 'storefront' : 'storefront-outline'}
                    size={22}
                    color={meta.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusLabel}>{meta.label}</Text>
                  <Text style={styles.statusSub}>
                    {store.status === 'ACTIVE'
                      ? 'Visible to customers'
                      : store.status === 'TEMPORARILY_CLOSED'
                      ? 'Hidden from customers'
                      : 'Contact support to activate'}
                  </Text>
                </View>
                {store.status !== 'INACTIVE' && (
                  <TouchableOpacity
                    style={[styles.statusToggleBtn, { borderColor: meta.color }, savingStatus && { opacity: 0.6 }]}
                    onPress={toggleStatus}
                    disabled={savingStatus}
                    activeOpacity={0.8}
                  >
                    {savingStatus
                      ? <ActivityIndicator size="small" color={meta.color} />
                      : <Text style={[styles.statusToggleText, { color: meta.color }]}>
                          {store.status === 'ACTIVE' ? 'Close' : 'Reopen'}
                        </Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ══ Store Info ══ */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Store Info</Text>
                {!editing && (
                  <TouchableOpacity style={styles.chip} onPress={startEdit} activeOpacity={0.7}>
                    <Ionicons name="pencil-outline" size={13} color={DS.primary} />
                    <Text style={styles.chipText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.card}>
                {editing ? (
                  <>
                    {(
                      [
                        { label: 'Store Name *', value: editName,        set: setEditName,        placeholder: 'e.g. The Good Kitchen' },
                        { label: 'Address *',    value: editAddress,     set: setEditAddress,     placeholder: 'Full address' },
                        { label: 'Phone',        value: editPhone,       set: setEditPhone,       placeholder: '+91 9876543210', kb: 'phone-pad' as const },
                        { label: 'Email',        value: editEmail,       set: setEditEmail,       placeholder: 'store@email.com', kb: 'email-address' as const },
                      ] as const
                    ).map(f => (
                      <View key={f.label} style={styles.formGroup}>
                        <Text style={styles.formLabel}>{f.label}</Text>
                        <TextInput
                          value={f.value as string}
                          onChangeText={f.set as (v: string) => void}
                          placeholder={f.placeholder}
                          placeholderTextColor={DS.text3}
                          keyboardType={(f as any).kb}
                          style={styles.formInput}
                          autoCapitalize="none"
                        />
                      </View>
                    ))}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Category</Text>
                      <TouchableOpacity
                        style={[styles.formInput, styles.categoryPickerRow]}
                        onPress={() => setCategorySheetOpen(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.categoryPickerText, !editCategory && { color: DS.text3 }]} numberOfLines={1}>
                          {editCategory || 'Select a category'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={DS.text3} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>About</Text>
                      <TextInput
                        value={editDescription}
                        onChangeText={setEditDescription}
                        placeholder="Brief description of your store…"
                        placeholderTextColor={DS.text3}
                        style={[styles.formInput, { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                    <View style={styles.editBtns}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)} activeOpacity={0.8}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveBtn, !canSaveInfo && { opacity: 0.5 }]}
                        onPress={saveInfo}
                        disabled={!canSaveInfo}
                        activeOpacity={0.85}
                      >
                        {savingInfo
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.saveBtnText}>Save Changes</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  [
                    { label: 'Name',     value: store.name        },
                    { label: 'Address',  value: store.address     },
                    { label: 'Phone',    value: store.phone       },
                    { label: 'Email',    value: store.email       },
                    { label: 'Category', value: store.category    },
                    { label: 'About',    value: store.description },
                  ].map((row, idx, arr) => (
                    <View key={row.label}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{row.label}</Text>
                        <Text
                          style={[styles.infoValue, !row.value && styles.infoValueEmpty]}
                          numberOfLines={row.label === 'About' ? 3 : 1}
                        >
                          {row.value || '—'}
                        </Text>
                      </View>
                      {idx < arr.length - 1 && <View style={styles.divider} />}
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* ══ Operating Hours ══ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Operating Hours</Text>

              <TouchableOpacity
                style={styles.bulkHoursCard}
                onPress={openBulkTimingModal}
                activeOpacity={0.8}
              >
                <View style={styles.bulkHoursIconWrap}>
                  <Ionicons name="time-outline" size={20} color={DS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bulkHoursTitle}>Set Weekly Hours</Text>
                  <Text style={styles.bulkHoursSub}>Apply the same hours to several days at once</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={DS.text3} />
              </TouchableOpacity>

              <View style={styles.card}>
                {DAYS.map((day, idx) => {
                  const t = timingsMap[day];
                  const closed = t?.isClosed;
                  const timeStr = t && !closed
                    ? `${fmtTimeStr(t.openTime)} – ${fmtTimeStr(t.closeTime)}`
                    : null;
                  return (
                    <View key={day}>
                      <TouchableOpacity
                        style={styles.dayRow}
                        onPress={() => openTimingModal(day)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.dayName}>{DAY_SHORT[day]}</Text>
                        <View style={styles.dayRight}>
                          {closed ? (
                            <View style={styles.closedPill}>
                              <Text style={styles.closedPillText}>Closed</Text>
                            </View>
                          ) : timeStr ? (
                            <Text style={styles.dayTime}>{timeStr}</Text>
                          ) : (
                            <Text style={styles.dayUnset}>Tap to set</Text>
                          )}
                          <Ionicons name="chevron-forward" size={14} color={DS.text3} />
                        </View>
                      </TouchableOpacity>
                      {idx < DAYS.length - 1 && <View style={styles.divider} />}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ══ Holidays ══ */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Holidays</Text>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setShowHolidayModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={14} color={DS.primary} />
                  <Text style={styles.chipText}>Add</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.card}>
                {sortedHolidays.length === 0 ? (
                  <View style={styles.emptyHolidays}>
                    <Ionicons name="calendar-outline" size={28} color={DS.text3} />
                    <Text style={styles.emptyHolidayText}>No holidays configured</Text>
                  </View>
                ) : (
                  sortedHolidays.map((h, idx) => (
                    <View key={h.id}>
                      <View style={styles.holidayRow}>
                        <View style={styles.holidayIconWrap}>
                          <Ionicons name="calendar-outline" size={16} color={DS.warning} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.holidayDate}>{fmtDate(h.date)}</Text>
                          {!!h.reason && (
                            <Text style={styles.holidayReason} numberOfLines={1}>{h.reason}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => confirmRemoveHoliday(h)}
                          disabled={deletingHolidayId === h.id}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {deletingHolidayId === h.id
                            ? <ActivityIndicator size="small" color={DS.error} />
                            : <Ionicons name="trash-outline" size={17} color={DS.error} />
                          }
                        </TouchableOpacity>
                      </View>
                      {idx < sortedHolidays.length - 1 && <View style={styles.divider} />}
                    </View>
                  ))
                )}
              </View>
            </View>

          </ScrollView>
        ) : null}
      </View>

      {/* ── Timing modal ── */}
      {timingModal && (
        <TimingModal
          state={timingModal}
          hasExisting={timingModal.days.length === 1 && !!timingsMap[timingModal.days[0]]}
          onClose={() => setTimingModal(null)}
          onSave={saveTiming}
          onRemove={removeTiming}
          saving={savingTiming}
          progress={savingProgress}
        />
      )}

      {/* ── Holiday modal ── */}
      {showHolidayModal && (
        <HolidayModal
          onClose={() => setShowHolidayModal(false)}
          onSave={saveHoliday}
          saving={savingHoliday}
        />
      )}

      <StoreCategorySelectorSheet
        visible={categorySheetOpen}
        categories={categoryOptions}
        selectedName={editCategory}
        onSelect={(name) => { setEditCategory(name); setCategorySheetOpen(false); }}
        onClose={() => setCategorySheetOpen(false)}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: DARK.bg },
  sheet: { flex: 1, backgroundColor: DS.bg },

  // Dark header
  darkHeader: {
    backgroundColor: DARK.bg,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: DARK.text },
  headerSub:   { fontSize: 12, color: DARK.text3, marginTop: 2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusDot:      { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  // Scroll
  scrollContent: { paddingTop: 20, paddingHorizontal: 16 },

  // Loading / error
  centreWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centreText: { fontSize: 14, color: DS.text3 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: DS.text2 },
  retryBtn:   { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: DS.primary, marginTop: 4 },
  retryText:  { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Section
  section:    { marginBottom: 24 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: DS.text3, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: DS.primarySoft, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: DS.primary },

  card: {
    backgroundColor: DS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: DS.border,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: DS.border, marginHorizontal: 16 },

  // Status card
  statusCard: {
    backgroundColor: DS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: DS.border,
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 14,
  },
  statusIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  statusLabel: { fontSize: 15, fontWeight: '700', color: DS.text },
  statusSub:   { fontSize: 12, color: DS.text3, marginTop: 2 },
  statusToggleBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5,
    minWidth: 64, alignItems: 'center', justifyContent: 'center',
  },
  statusToggleText: { fontSize: 13, fontWeight: '700' },

  // Info display rows
  infoRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  infoLabel:      { width: 72, fontSize: 12, fontWeight: '600', color: DS.text3, marginTop: 1, flexShrink: 0 },
  infoValue:      { flex: 1, fontSize: 14, fontWeight: '500', color: DS.text },
  infoValueEmpty: { color: DS.text3, fontStyle: 'italic' },

  // Form fields
  formGroup: { marginBottom: 14, paddingHorizontal: 16 },
  formLabel: { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 6, marginTop: 2 },
  formInput: {
    backgroundColor: DS.bg, borderRadius: 12,
    borderWidth: 1, borderColor: DS.border,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: DS.text,
  },
  formError: { fontSize: 11, color: DS.error, marginTop: 4 },
  categoryPickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  categoryPickerText: { flex: 1, fontSize: 14, color: DS.text },
  editBtns: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8,
  },

  // Operating hours
  bulkHoursCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: DS.primarySoft, borderRadius: 16,
    borderWidth: 1, borderColor: '#F6D9CE',
    padding: 14, marginBottom: 10,
  },
  bulkHoursIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: DS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  bulkHoursTitle: { fontSize: 14, fontWeight: '700', color: DS.text },
  bulkHoursSub:   { fontSize: 12, color: DS.text2, marginTop: 2 },

  dayRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  dayName:   { width: 38, fontSize: 14, fontWeight: '600', color: DS.text },
  dayRight:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  dayTime:   { fontSize: 14, fontWeight: '500', color: DS.text2 },
  dayUnset:  { fontSize: 13, color: DS.text3, fontStyle: 'italic' },
  closedPill: {
    backgroundColor: DS.warningSoft, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  closedPillText: { fontSize: 12, fontWeight: '700', color: DS.warning },

  // Holidays
  holidayRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  holidayIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: DS.warningSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  holidayDate:    { fontSize: 14, fontWeight: '600', color: DS.text },
  holidayReason:  { fontSize: 12, color: DS.text3, marginTop: 2 },
  deleteBtn:      { padding: 6 },
  emptyHolidays:  { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyHolidayText: { fontSize: 13, color: DS.text3 },

  // Shared modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 40,
    alignItems: 'center',
  },
  modalHandle:  { width: 40, height: 4, backgroundColor: DS.border, borderRadius: 2, marginBottom: 20 },
  modalIconWrap: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: DS.text, marginBottom: 6, textAlign: 'center' },
  modalSub:   { fontSize: 13, color: DS.text2, textAlign: 'center', marginBottom: 20, lineHeight: 19 },

  // Timing-specific
  dayPickerWrap: { width: '100%', marginBottom: 22, gap: 10 },
  dayChipRow: { flexDirection: 'row', width: '100%', gap: 6 },
  dayChip: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    height: 40, borderRadius: 12,
    borderWidth: 1.5, borderColor: DS.border, backgroundColor: DS.bg,
  },
  dayChipActive:     { backgroundColor: DS.primary, borderColor: DS.primary },
  dayChipText:       { fontSize: 12, fontWeight: '700', color: DS.text2 },
  dayChipTextActive: { color: '#fff' },
  dayPresetRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dayPresetBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: DS.border, backgroundColor: DS.surface,
  },
  dayPresetBtnActive: { backgroundColor: DS.primarySoft, borderColor: '#F6D9CE' },
  dayPresetText:       { fontSize: 12, fontWeight: '600', color: DS.text2 },
  dayPresetTextActive: { color: DS.primary, fontWeight: '700' },

  toggleRow: {
    flexDirection: 'row', gap: 10, marginBottom: 24, width: '100%',
  },
  toggleOpt: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, borderWidth: 1.5, borderColor: DS.border, borderRadius: 14,
    paddingVertical: 12,
  },
  toggleOptOpen:   { backgroundColor: DS.successSoft, borderColor: '#A3D9B4' },
  toggleOptClosed: { backgroundColor: DS.errorSoft,   borderColor: '#FECACA' },
  toggleOptText:   { fontSize: 14, fontWeight: '600', color: DS.text3 },

  timePickers: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 28, width: '100%',
  },
  timeGroup:      { flex: 1, alignItems: 'center', gap: 8 },
  timeGroupLabel: { fontSize: 11, fontWeight: '700', color: DS.text3, letterSpacing: 0.6, textTransform: 'uppercase' },
  timeRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeSep:        { fontSize: 22, fontWeight: '800', color: DS.text, marginTop: -4 },
  timeArrow:      { alignItems: 'center', justifyContent: 'center', paddingTop: 20 },

  stepper:   { alignItems: 'center', gap: 2 },
  stepBtn:   { padding: 6 },
  stepValue: {
    fontSize: 28, fontWeight: '800', color: DS.text,
    minWidth: 48, textAlign: 'center',
    backgroundColor: DS.bg, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 6,
  },

  // Shared buttons
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  removeBtn: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1.5, borderColor: DS.errorSoft,
    backgroundColor: DS.errorSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: DS.border,
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: DS.text2 },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14, paddingVertical: 14,
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
