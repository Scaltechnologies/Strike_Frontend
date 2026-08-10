import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DS = {
  bg: '#F6F7FA',
  surface: '#FFFFFF',
  border: '#EAECEF',
  primary: '#CC2200',
  primarySoft: '#FFF0EE',
  text: '#1A1A1A',
  text2: '#5A6272',
};

interface MaintenanceScreenProps {
  message: string;
}

export function MaintenanceScreen({ message }: MaintenanceScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.bg} />
      <View style={styles.iconWrap}>
        <Ionicons name="construct-outline" size={44} color={DS.primary} />
      </View>
      <Text style={styles.title}>We'll be right back</Text>
      <Text style={styles.subtitle}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: DS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: DS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: DS.text2,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
});
