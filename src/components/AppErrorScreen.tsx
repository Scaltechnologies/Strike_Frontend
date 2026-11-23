// src/components/AppErrorScreen.tsx
//
// Shown by expo-router's ErrorBoundary (src/app/_layout.tsx) when a screen throws
// while rendering. Without it, React unmounts the whole tree in a release build
// and the vendor is left on a blank white screen with no way out. The technical
// message is kept small at the bottom so support can ask for a screenshot.

import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type Props = { error: Error; retry: () => Promise<void> };

export default function AppErrorScreen({ error, retry }: Props) {
  const goToSignIn = () => {
    try { router.replace('/'); } catch { void retry(); }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FA" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.icon}>
          <Ionicons name="alert-circle-outline" size={40} color="#CC2200" />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.text}>
          Please tap "Try again". If this keeps happening, close the app and open it again.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => void retry()} activeOpacity={0.85}>
          <Text style={styles.primaryText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={goToSignIn} activeOpacity={0.85}>
          <Text style={styles.secondaryText}>Go to start</Text>
        </TouchableOpacity>

        <Text style={styles.detail} selectable>
          {`${error?.name ?? 'Error'}: ${error?.message ?? 'unknown'}`}
          {error?.stack ? `\n\n${error.stack.split('\n').slice(0, 6).join('\n')}` : ''}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7FA' },
  content: { padding: 24, paddingTop: 96, alignItems: 'stretch' },
  icon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF0EE',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 },
  text:  { fontSize: 15, color: '#5A6272', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  primaryBtn: {
    backgroundColor: '#CC2200', borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    borderWidth: 1.5, borderColor: '#CC2200', borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  secondaryText: { fontSize: 16, fontWeight: '700', color: '#CC2200' },
  detail: { fontSize: 11, color: '#9BA3AF', lineHeight: 16 },
});
