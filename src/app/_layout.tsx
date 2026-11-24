import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SignIn } from '@/components/sign-in';
import { Button } from '@/components/ui';
import { startStore, sync, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

export default function RootLayout() {
  const s = useStore();
  useEffect(() => {
    startStore();
  }, []);

  const ready = s.auth === 'in' && s.data.profiles.some((p) => p.id === s.activeProfileId);

  return (
    <View style={styles.page}>
      <View style={styles.app}>
        <StatusBar style="dark" />
        {/* No screen transitions anywhere: screens swap instantly. */}
        <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
        {!ready && (
          <View style={styles.cover}>
            {s.auth === 'out' && <SignIn />}
            {s.auth === 'in' && (
              <View style={styles.setup}>
                <Text style={styles.setupText}>
                  {s.syncing || !s.syncError ? 'Loading your data…' : 'Could not load your data. Check the internet connection.'}
                </Text>
                {!s.syncing && s.syncError != null && <Button title="Try again" onPress={() => void sync()} />}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.band },
  // On wide screens the app stays phone-shaped in the middle.
  app: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: C.bg },
  cover: { ...StyleSheet.absoluteFill, backgroundColor: C.bg },
  setup: { flex: 1, justifyContent: 'center', padding: 32, gap: 16 },
  setupText: { textAlign: 'center', color: C.muted, fontSize: 16 },
});
