// mobile/src/screens/ProfileScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useBoard } from '../context/BoardContext';
import { colors, getHabitColor } from '../lib/theme';

export const ProfileScreen: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { user, signOut, isConfigured } = useAuth();
  const { state, syncWithCloud, syncing } = useBoard();

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your board?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        }
      }
    ]);
  };

  const handleSyncNow = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    await syncWithCloud();
    Alert.alert('Synced', 'Your board is up-to-date with Supabase cloud database.');
  };

  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest User';
  const displayEmail = user?.email || 'Local storage mode';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Account & Sync</Text>

      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO UNLOCKED</Text>
            </View>
            <View style={[styles.syncBadge, isConfigured ? styles.syncBadgeOnline : styles.syncBadgeOffline]}>
              <Text style={styles.syncBadgeText}>
                {user ? 'Cloud Synced' : isConfigured ? 'Ready to Sync' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{state.habits.length}</Text>
          <Text style={styles.statLbl}>Active Habits</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statVal}>
            {Object.keys(state.checks).reduce((acc, k) => acc + Object.values(state.checks[k] || {}).filter(Boolean).length, 0)}
          </Text>
          <Text style={styles.statLbl}>Total Check-ins</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{state.rev || 1}</Text>
          <Text style={styles.statLbl}>Sync Rev</Text>
        </View>
      </View>

      {/* Cloud & Supabase Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Database & Cloud</Text>

        <TouchableOpacity style={styles.menuItem} onPress={handleSyncNow}>
          <Text style={styles.menuEmoji}>☁️</Text>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>
              {user ? (syncing ? 'Syncing...' : 'Sync Board Now') : 'Log In to Sync Board'}
            </Text>
            <Text style={styles.menuItemDesc}>
              {user ? 'Re-fetch latest habits from Supabase PostgreSQL' : 'Sign in to access your board anywhere'}
            </Text>
          </View>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Multicolored Palette Preview */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Color System</Text>
        <View style={styles.paletteContainer}>
          {['mint', 'blue', 'lavender', 'coral', 'peach', 'rose', 'lemon', 'teal'].map(c => (
            <View key={c} style={[styles.paletteDot, { backgroundColor: getHabitColor(c) }]} />
          ))}
        </View>
      </View>

      {/* About StreakBoard App & Web */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>About StreakBoard</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutHeading}>StreakBoard v1.0.0</Text>
          <Text style={styles.aboutDesc}>
            Cross-platform gamified productivity system. Track habits, gain XP, conquer weekly boss goals, and manage daily spend across Web and Android.
          </Text>

          <TouchableOpacity
            style={styles.aboutLinkRow}
            onPress={() => Linking.openURL('https://streak-board-mauve.vercel.app')}
          >
            <Text style={styles.aboutLinkEmoji}>🌐</Text>
            <View style={styles.aboutLinkTextWrap}>
              <Text style={styles.aboutLinkTitle}>Live Web Application</Text>
              <Text style={styles.aboutLinkSubtitle}>streak-board-mauve.vercel.app</Text>
            </View>
            <Text style={styles.aboutLinkArrow}>↗</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.aboutLinkRow}
            onPress={() => Linking.openURL('https://github.com/nalamaditya/StreakBoard')}
          >
            <Text style={styles.aboutLinkEmoji}>💻</Text>
            <View style={styles.aboutLinkTextWrap}>
              <Text style={styles.aboutLinkTitle}>GitHub Repository</Text>
              <Text style={styles.aboutLinkSubtitle}>github.com/nalamaditya/StreakBoard</Text>
            </View>
            <Text style={styles.aboutLinkArrow}>↗</Text>
          </TouchableOpacity>

          <View style={styles.aboutMetaRow}>
            <Text style={styles.aboutMetaLabel}>Developer</Text>
            <Text style={styles.aboutMetaVal}>Aditya Nalam</Text>
          </View>
          <View style={styles.aboutMetaRow}>
            <Text style={styles.aboutMetaLabel}>Cloud Database</Text>
            <Text style={styles.aboutMetaVal}>Supabase PostgreSQL (RLS)</Text>
          </View>
          <View style={styles.aboutMetaRow}>
            <Text style={styles.aboutMetaLabel}>Mobile Framework</Text>
            <Text style={styles.aboutMetaVal}>Expo SDK 52 Native</Text>
          </View>
        </View>
      </View>

      {/* Auth Actions */}
      {user ? (
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out of Board</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.signInButton} onPress={onOpenAuth}>
          <Text style={styles.signInText}>Log In or Create Account</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  proBadge: {
    backgroundColor: 'rgba(245, 197, 24, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  syncBadgeOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  syncBadgeOffline: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  syncBadgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  statLbl: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  menuSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuEmoji: {
    fontSize: 20,
    marginRight: 14,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  menuItemDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuChevron: {
    fontSize: 20,
    color: colors.textMuted,
    marginLeft: 8,
  },
  paletteContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paletteDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  aboutCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  aboutDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  aboutLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  aboutLinkEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  aboutLinkTextWrap: {
    flex: 1,
  },
  aboutLinkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  aboutLinkSubtitle: {
    fontSize: 11,
    color: colors.accent,
    marginTop: 1,
  },
  aboutLinkArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
    marginLeft: 6,
  },
  aboutMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  aboutMetaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  aboutMetaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  signOutButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  signOutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  signInButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  signInText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
});
