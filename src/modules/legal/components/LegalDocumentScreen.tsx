// src/modules/legal/components/LegalDocumentScreen.tsx
// Shared renderer for the Terms & Conditions, Privacy Policy and account-deletion screens.
// Lives at the root Stack (not under (main)) so it's reachable both before login
// (login/signup links) and after (Profile).

import {
  View, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../../components/Text';
import {
  TBC_PREFIX, outstandingItems, parseInline,
  type LegalBlock, type LegalDocument,
} from '../legalContent';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  warning:     '#D97706',
  warningSoft: '#FFFBEB',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

// Opens mailto:/tel:/https: links. Devices without a mail or dialer app reject the intent —
// show the address itself instead of a raw error, so the vendor can still use it.
async function openLink(href: string) {
  try {
    await Linking.openURL(href);
  } catch {
    const target = href.replace(/^(mailto:|tel:)/, '').split('?')[0];
    Alert.alert(
      'Couldn’t open this link',
      href.startsWith('mailto:')
        ? `No email app is available. You can write to us at ${target}.`
        : href.startsWith('tel:')
          ? `Calling isn’t available on this device. Our number is ${target}.`
          : `Please open ${target} in your browser.`,
    );
  }
}

function RichText({ text, style }: { text: string; style: object }) {
  const segments = parseInline(text);
  return (
    <Text style={style}>
      {segments.map((seg, i) => {
        const weight = seg.bold ? styles.bold : null;
        if (seg.kind === 'link') {
          return (
            <Text
              key={i}
              style={[styles.link, weight]}
              onPress={() => openLink(seg.href)}
              accessibilityRole="link"
            >
              {seg.text}
            </Text>
          );
        }
        if (seg.text.startsWith(TBC_PREFIX)) {
          return <Text key={i} style={styles.tbc}>{seg.text}</Text>;
        }
        return weight ? <Text key={i} style={weight}>{seg.text}</Text> : seg.text;
      })}
    </Text>
  );
}

function List({ items, numbered }: { items: string[]; numbered: boolean }) {
  return (
    <View style={styles.list}>
      {items.map((item, i) => (
        <View key={i} style={styles.listRow}>
          <Text style={[styles.listMarker, numbered && styles.listMarkerNumber]}>
            {numbered ? `${i + 1}.` : '•'}
          </Text>
          <View style={styles.listBody}>
            <RichText text={item} style={styles.listText} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <RichText text={block} style={styles.paragraph} />;
  if ('subheading' in block) {
    return <Text style={styles.subheading} accessibilityRole="header">{block.subheading}</Text>;
  }
  if ('numbered' in block) return <List items={block.numbered} numbered />;
  return <List items={block.bullets} numbered={false} />;
}

interface LegalAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  // Rendered only when set — a null URL means the mechanism isn't live yet, and showing a
  // dead button would misrepresent what the vendor can actually do.
  url: string | null;
}

export default function LegalDocumentScreen({ doc, action }: { doc: LegalDocument; action?: LegalAction }) {
  const insets = useSafeAreaInsets();
  const showDraft = doc.isDraft || outstandingItems(doc).length > 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={DS.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle} numberOfLines={2} accessibilityRole="header">
          {doc.title}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator
      >
        {showDraft && (
          <View style={styles.draftBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={DS.warning} />
            <Text style={styles.draftText}>
              Draft pending legal review. Highlighted details are still being confirmed.
            </Text>
          </View>
        )}

        {!!doc.effectiveDate && <Text style={styles.meta}>Effective date: {doc.effectiveDate}</Text>}
        <Text style={styles.meta}>Last updated: {doc.lastUpdated}</Text>

        {doc.sections.map(section => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.sectionHeading} accessibilityRole="header">{section.heading}</Text>
            {section.body.map((block, i) => <Block key={i} block={block} />)}
          </View>
        ))}

        {!!action?.url && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openLink(action.url!)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Ionicons name={action.icon} size={18} color="#fff" />
            <Text style={styles.actionBtnText}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: DS.bg },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: DS.surface, paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: DS.bg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: DS.border,
  },
  pageTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: DS.text },

  content: { paddingHorizontal: 20, paddingTop: 20 },

  draftBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: DS.warningSoft, borderRadius: 12,
    borderWidth: 1, borderColor: DS.warning + '44',
    padding: 12, marginBottom: 16,
  },
  draftText: { flex: 1, fontSize: 13, lineHeight: 19, color: DS.text2, fontWeight: '600' },

  meta: { fontSize: 12, color: DS.text3, marginBottom: 2 },

  section:        { marginTop: 22 },
  sectionHeading: { fontSize: 16, fontWeight: '800', color: DS.text, marginBottom: 8 },
  subheading:     { fontSize: 14, fontWeight: '700', color: DS.text, marginTop: 6, marginBottom: 6 },
  paragraph:      { fontSize: 14, lineHeight: 22, color: DS.text2, marginBottom: 10 },
  bold:           { fontWeight: '700', color: DS.text },
  link:           { color: DS.primary, fontWeight: '600', textDecorationLine: 'underline' },

  list:             { marginBottom: 10 },
  listRow:          { flexDirection: 'row', gap: 8, marginBottom: 6 },
  listMarker:       { minWidth: 10, fontSize: 14, lineHeight: 22, color: DS.primary, fontWeight: '800' },
  listMarkerNumber: { minWidth: 22, color: DS.text2, fontWeight: '700' },
  listBody:         { flex: 1 },
  listText:         { fontSize: 14, lineHeight: 22, color: DS.text2 },

  tbc: { color: DS.warning, fontWeight: '700', backgroundColor: DS.warningSoft },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14,
    minHeight: 52, paddingVertical: 12, paddingHorizontal: 16, marginTop: 24,
  },
  actionBtnText: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
});
