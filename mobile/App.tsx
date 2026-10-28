// mobile/App.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { BoardProvider } from './src/context/BoardContext';
import { TodayScreen } from './src/screens/TodayScreen';
import { WeekScreen } from './src/screens/WeekScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { colors } from './src/lib/theme';

type Tab = 'today' | 'week' | 'profile';

const MainNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading your Streakboard...</Text>
      </View>
    );
  }

  if (showAuthModal) {
    return <AuthScreen onSkipGuest={() => setShowAuthModal(false)} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.content}>
        {activeTab === 'today' && <TodayScreen />}
        {activeTab === 'week' && <WeekScreen />}
        {activeTab === 'profile' && (
          <ProfileScreen onOpenAuth={() => setShowAuthModal(true)} />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'today' && styles.tabItemActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={styles.tabEmoji}>⚡</Text>
          <Text style={[styles.tabLabel, activeTab === 'today' && styles.tabLabelActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'week' && styles.tabItemActive]}
          onPress={() => setActiveTab('week')}
        >
          <Text style={styles.tabEmoji}>📅</Text>
          <Text style={[styles.tabLabel, activeTab === 'week' && styles.tabLabelActive]}>
            Week
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={styles.tabEmoji}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BoardProvider>
        <MainNavigator />
      </BoardProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
    paddingBottom: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabItemActive: {},
  tabEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.accent,
  },
});
