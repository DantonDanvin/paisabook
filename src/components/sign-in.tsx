import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

// Turns Supabase's technical errors into something a person can act on.
function explain(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit')) return 'Too many tries. Wait a few minutes, then try again.';
  if (m.includes('already registered')) return 'This email already has an account. Tap "Sign in" instead.';
  if (m.includes('invalid login')) return 'Wrong email or password.';
  if (m.includes('not confirmed')) return 'This account is waiting for email confirmation. See the setup note.';
  if (m.includes('fetch') || m.includes('network')) return 'No internet connection.';
  return message;
}

export function SignIn() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const ready = email.includes('@') && password.length >= 6 && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setMessage('');
    const creds = { email: email.trim(), password };
    const { data, error } =
      mode === 'in' ? await supabase.auth.signInWithPassword(creds) : await supabase.auth.signUp(creds);
    setBusy(false);
    if (error) setMessage(explain(error.message));
    else if (!data.session) {
      // Only happens while "Confirm email" is still switched on in Supabase.
      setMode('in');
      setMessage('Account created, but Supabase is asking for email confirmation. Open the link in the email, then sign in.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.box}>
        <Text style={styles.logo}>PaisaBook</Text>
        <Text style={styles.hint}>
          {mode === 'in'
            ? 'Sign in with the same email and password on every phone.'
            : 'Choose an email and password. You will be signed in straight away.'}
        </Text>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Field
          label="Password (6 or more characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onSubmitEditing={submit}
        />
        {message !== '' && <Text style={styles.message}>{message}</Text>}
        <Button
          title={busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
          disabled={!ready}
          onPress={submit}
        />
        <Pressable
          hitSlop={8}
          onPress={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setMessage('');
          }}>
          <Text style={styles.switch}>
            {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 24 },
  box: { gap: 14, width: '100%', maxWidth: 420, alignSelf: 'center' },
  logo: { fontSize: 34, fontWeight: '800', color: C.accent, textAlign: 'center' },
  hint: { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, color: C.expense },
  switch: { textAlign: 'center', color: C.accent, fontSize: 15, fontWeight: '600', paddingVertical: 8 },
});
