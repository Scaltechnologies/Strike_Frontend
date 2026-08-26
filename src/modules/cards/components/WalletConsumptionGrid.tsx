// src/modules/cards/components/WalletConsumptionGrid.tsx
//
// A 6-column "water level" visualization of wallet consumption, one box per
// day of the card's validity (e.g. a ₹3000 / 30-day card → 30 boxes of ₹100
// each). Box count and box value are both derived from real subscription
// data at the call site (originalWalletAmount and validity), never invented
// here — this component just renders however many boxes it's told to.
//
// Source of truth is always the backend-provided values passed in as props.
// This component never fabricates a percentage, never falls back to
// CardDefinition.walletAmount/cardPrice, and renders nothing at all when
// the subscription has no consumption tracking (originalWalletAmount === null).

import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Platform, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';

const GRID_COLS = 6;
const DEFAULT_TOTAL_CELLS = 30;
const GRID_GAP = 6;
const MAX_GRID_WIDTH = 380;

// Matches the customer app's own WalletConsumptionGrid (water: '#D63527') so
// the same wallet reads as the same color on both sides of a redemption —
// not an arbitrary "water = blue" choice.
const WATER = {
  top:    '#E14A3B',
  bottom: '#A62A1F',
};

const DS = {
  text:   '#1A1A1A',
  text2:  '#5A6272',
  text3:  '#9BA3AF',
  border: '#E5E7EB',
  cellBg: '#F3F4F6',
  success: '#16A34A',
};

export interface WalletConsumptionGridProps {
  originalWalletAmount: number | null;
  walletBalance: number;
  consumedAmount: number | null;
  consumptionPercentage: number | null;
  // Box count — one per validity day at the call sites (via
  // getSubscriptionValidityDays). Defaults to 30 only as a fallback.
  totalCells?: number;
}

function clamp(n: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(n, min), max);
}

// One shared `progress` value (0..30, fractional) drives every cell's fill —
// each cell just reads how far `progress` has passed its own index. A single
// `wave` phase value likewise drives every cell's ripple. This keeps the
// whole 30-cell grid to two animated values total instead of 60 independent
// timers, and every per-frame update is a transform/opacity change computed
// on the UI thread — no JS-thread re-renders while animating.
type NumSharedValue = ReturnType<typeof useSharedValue<number>>;

function WaterCell({
  index, progress, wave, size,
}: {
  index: number;
  progress: NumSharedValue;
  wave: NumSharedValue;
  size: number;
}) {
  const fillStyle = useAnimatedStyle(() => {
    const fraction = clamp(progress.value - index, 0, 1);
    // Fill box is always cell-sized; sliding it down by (1-fraction)*size
    // (a transform, not a height change) is what makes the water "rise" —
    // GPU-composited, no layout pass on every animation frame.
    return { transform: [{ translateY: (1 - fraction) * size }] };
  });

  // A single thin highlight strip at the water's surface, same technique as
  // the customer app's grid — plain and flat, no circular "bump" shapes.
  // It's a child of the fill box, so it travels with the rising water, and
  // fades in over the first few percent of fill so an empty cell never
  // shows a sliver of it.
  const waveStyle = useAnimatedStyle(() => {
    const fraction = clamp(progress.value - index, 0, 1);
    const phase = wave.value + index * 0.11;
    return {
      opacity: clamp(fraction / 0.06, 0, 1),
      transform: [{ translateX: Math.sin(phase * Math.PI * 2) * size * 0.16 }],
    };
  });

  // Matches the user app's cellCheck: fades/scales in only over the last 15%
  // of a cell's own fill, reaching full opacity right as it tops off — no
  // bounce, so it reads as the box quietly completing rather than popping.
  const tickStyle = useAnimatedStyle(() => {
    const fraction = clamp(progress.value - index, 0, 1);
    const t = interpolate(fraction, [0.85, 1], [0, 1], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ scale: 0.5 + t * 0.5 }] };
  });

  return (
    <View style={[cellStyles.cell, { width: size, height: size }]}>
      <Animated.View style={[cellStyles.fill, { width: size, height: size }, fillStyle]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: WATER.top }]} />
        <Animated.View
          style={[cellStyles.waveStrip, { width: size * 1.5, left: -size * 0.25 }, waveStyle]}
        />
      </Animated.View>
      <Animated.View style={[cellStyles.tickWrap, tickStyle]} pointerEvents="none">
        <Ionicons
          name="checkmark"
          size={Math.max(12, size * 0.5)}
          color="#fff"
          style={cellStyles.tickShine}
        />
      </Animated.View>
    </View>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={statStyles.block}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, color ? { color } : null]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function formatCurrency(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export default function WalletConsumptionGrid({
  originalWalletAmount, walletBalance, consumedAmount, consumptionPercentage,
  totalCells = DEFAULT_TOTAL_CELLS,
}: WalletConsumptionGridProps) {
  const progress = useSharedValue(0);
  const wave     = useSharedValue(0);
  const overlay  = useSharedValue(0);

  const cellCount = Math.max(1, Math.round(totalCells));
  const pct = originalWalletAmount == null || consumptionPercentage == null
    ? null
    : clamp(consumptionPercentage, 0, 100);
  const isComplete = pct !== null && pct >= 100;

  useEffect(() => {
    wave.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
    // Runs once — the wave loops forever regardless of consumption changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const target = pct === null ? 0 : (pct / 100) * cellCount;
    progress.value = withTiming(target, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [pct, cellCount, progress]);

  useEffect(() => {
    overlay.value = withTiming(isComplete ? 1 : 0, { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [isComplete, overlay]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
    transform: [{ scale: 0.92 + overlay.value * 0.08 }],
  }));

  const [gridWidth, setGridWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setGridWidth(e.nativeEvent.layout.width);
  }, []);

  // Historical subscriptions predating consumption tracking — keep existing
  // wallet info visible elsewhere, just render nothing here.
  if (originalWalletAmount == null || pct === null) return null;

  const cellSize = gridWidth > 0
    ? (gridWidth - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS
    : 0;

  const used = consumedAmount ?? Math.max(originalWalletAmount - walletBalance, 0);
  const usagePctLabel = Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
  const cellValue = originalWalletAmount / cellCount;
  const filledCells = Math.round((pct / 100) * cellCount);

  return (
    <View style={styles.wrap}>
      <View style={styles.statsRow}>
        <StatBlock label="ORIGINAL"  value={formatCurrency(originalWalletAmount)} />
        <StatBlock label="USED"      value={formatCurrency(used)} color={WATER.bottom} />
        <StatBlock label="REMAINING" value={formatCurrency(walletBalance)} color={DS.success} />
        <StatBlock label="USAGE"     value={usagePctLabel} />
      </View>

      <View style={styles.gridCard}>
        <View style={styles.gridInner} onLayout={onLayout}>
          {cellSize > 0 && Array.from({ length: cellCount }).map((_, i) => (
            <WaterCell key={i} index={i} progress={progress} wave={wave} size={cellSize} />
          ))}
        </View>

        {isComplete && (
          <Animated.View style={[styles.completeOverlay, overlayStyle]} pointerEvents="none">
            <View style={styles.completeIconCircle}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </View>
            <Text style={styles.completeText}>Wallet Fully Utilized</Text>
          </Animated.View>
        )}
      </View>

      <Text style={styles.legendText}>
        {filledCells} of {cellCount} boxes used · each box ≈ {formatCurrency(cellValue)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },

  statsRow: {
    flexDirection: 'row', marginBottom: 14,
    backgroundColor: DS.cellBg, borderRadius: 14,
    borderWidth: 1, borderColor: DS.border, overflow: 'hidden',
  },

  gridCard: {
    width: '100%', maxWidth: MAX_GRID_WIDTH, alignSelf: 'center',
    position: 'relative',
  },
  gridInner: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: GRID_GAP,
  },

  completeOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 12,
  },
  completeIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: DS.success, alignItems: 'center', justifyContent: 'center',
    shadowColor: DS.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  completeText: { fontSize: 13, fontWeight: '800', color: DS.text },

  legendText: {
    fontSize: 11.5, color: DS.text3, textAlign: 'center',
    marginTop: 12, fontWeight: '500',
  },
});

const statStyles = StyleSheet.create({
  block: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  label: { fontSize: 9, fontWeight: '700', color: DS.text3, letterSpacing: 0.6, marginBottom: 4 },
  value: { fontSize: 14, fontWeight: '800', color: DS.text },
});

const cellStyles = StyleSheet.create({
  cell: {
    borderRadius: 6, backgroundColor: DS.cellBg,
    borderWidth: 1, borderColor: DS.border,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute', left: 0, bottom: 0,
  },
  waveStrip: {
    position: 'absolute', top: -3,
    height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  tickWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center',
  },
  tickShine: {
    ...Platform.select({
      ios: { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8 },
      android: {},
    }),
  },
});
