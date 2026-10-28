// mobile/src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';

export const AuthScreen: React.FC<{ onSkipGuest?: () => void }> = ({ onSkipGuest }) => {
  const { signIn, signUp, resetPassword, signInWithGoogleOAuth, isConfigured } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      const res = await resetPassword(email);
      setLoading(false);
      if (res.error) {
        Alert.alert('Error', res.error);
      } else {
        Alert.alert('Reset Link Sent', res.message || 'Check your inbox for password reset instructions.');
        setMode('login');
      }
      return;
    }

    if (!password) {
      Alert.alert('Required', 'Please enter your password');
      return;
    }

    setLoading(true);
    if (mode === 'signup') {
      const res = await signUp(email, password, name);
      setLoading(false);
      if (res.error) {
        Alert.alert('Sign Up Failed', res.error);
      } else if (res.message) {
        Alert.alert('Verification Sent', res.message);
        setMode('login');
      }
    } else {
      const res = await signIn(email, password);
      setLoading(false);
      if (res.error) {
        Alert.alert('Login Failed', res.error);
      }
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const res = await signInWithGoogleOAuth();
    setLoading(false);
    if (res.error) {
      Alert.alert('Google Sign-In', res.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.brandEmoji}>🔥</Text>
          <Text style={styles.brandTitle}>Streakboard</Text>
          <Text style={styles.brandSubtitle}>
            {mode === 'forgot'
              ? 'Reset your password'
              : mode === 'signup'
              ? 'Build unstoppable daily momentum'
              : 'Welcome back to your board'}
          </Text>
        </View>

        {mode !== 'forgot' && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.activeTab]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.activeTab]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>Create Account</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.form}>
          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {mode !== 'forgot' && (
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'forgot'
                  ? 'Send Reset Link'
                  : mode === 'signup'
                  ? 'Create My Account'
                  : 'Log In to Board'}
              </Text>
            )}
          </TouchableOpacity>

          {mode === 'login' && (
            <TouchableOpacity onPress={() => setMode('forgot')} style={styles.linkButton}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {mode === 'forgot' && (
            <TouchableOpacity onPress={() => setMode('login')} style={styles.linkButton}>
              <Text style={styles.linkText}>← Back to Log In</Text>
            </TouchableOpacity>
          )}

          {mode !== 'forgot' && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogle}
                disabled={loading}
              >
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </>
          )}

          {onSkipGuest && (
            <TouchableOpacity onPress={onSkipGuest} style={styles.guestButton}>
              <Text style={styles.guestText}>Continue as Guest (Offline Mode)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.cardSecondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.text,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.textMuted,
    fontSize: 12,
  },
  googleButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  guestButton: {
    marginTop: 22,
    alignItems: 'center',
  },
  guestText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
