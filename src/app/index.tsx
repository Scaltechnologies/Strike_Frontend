import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { getAccessToken, getMustChangePassword } from '../core/storage/secureStorage';

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getAccessToken();

        if (!token) {
          router.replace('/(auth)/welcome');
        } else if (await getMustChangePassword()) {
          // Signed in on a generated password but never set their own —
          // e.g. the app was closed on the change-password screen.
          router.replace({ pathname: '/change-password', params: { forced: '1' } });
        } else {
          router.replace('/(main)/home');
        }
      } catch (error) {
        router.replace('/(auth)/welcome');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF0E6' }}>
        <ActivityIndicator size="large" color="#CC2200" />
      </View>
    );
  }

  return null;
}
