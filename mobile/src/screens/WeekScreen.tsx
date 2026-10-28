// mobile/src/screens/WeekScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { useBoard, getTodayKey } from '../context/BoardContext';
import { colors } from '../lib/theme';

export const WeekScreen: React.FC = () => {
  const { state, updateBig3 } = useBoard();
  const todayKey = getTodayKey();
  const currentWeek = state.weeks?.[todayKey] || { big3: ['', '', ''] };
  const big3 = currentWeek.big3 || ['', '', ''];

  const [t1, setT1] = useState(big3[0] || '');
  const [t2, setT2] = useState(big3[1] || '');
  const [t3, setT3] = useState(big3[2] || '');

  const handleBlur = (idx: number, val: string) => {
    updateBig3(idx, val);
  };

  // Generate the last 7 days for the weekly strip
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' });
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const k = `${y}-${m}-${day}`;
    
    const dayChecks = state.checks[k] || {};
    const doneCount = Object.values(dayChecks).filter(Boolean).length;
    const isToday = i === 0;

    days.push({ dayName, dateStr: d.getDate(), key: k, doneCount, isToday });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Weekly Outlook</Text>

      {/* 7-Day Performance Strip */}
      <View style={styles.stripCard}>
        <Text style={styles.sectionHeader}>Last 7 Days Activity</Text>
        <View style={styles.stripRow}>
          {days.map(d => (
            <View key={d.key} style={styles.dayCol}>
              <Text style={[styles.dayLabel, d.isToday && styles.todayLabel]}>
                {d.dayName}
              </Text>
              <View
                style={[
                  styles.dayCircle,
                  d.doneCount > 0 && { backgroundColor: colors.accent },
                  d.isToday && styles.todayCircle
                ]}
              >
                <Text
                  style={[
                    styles.dayDate,
                    d.doneCount > 0 && { color: '#000', fontWeight: '700' }
                  ]}
                >
                  {d.doneCount > 0 ? d.doneCount : d.dateStr}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Big 3 Tasks for the Week */}
      <View style={styles.big3Card}>
        <View style={styles.big3Header}>
          <Text style={styles.big3Title}>🎯 Weekly Big 3 Tasks</Text>
          <Text style={styles.big3Desc}>
            Prioritize the top three highest-leverage outcomes for your week.
          </Text>
        </View>

        <View style={styles.taskItem}>
          <Text style={styles.taskNum}>1</Text>
          <TextInput
            style={styles.taskInput}
            placeholder="Priority Goal 1..."
            placeholderTextColor={colors.textMuted}
            value={t1}
            onChangeText={setT1}
            onBlur={() => handleBlur(0, t1)}
          />
        </View>

        <View style={styles.taskItem}>
          <Text style={styles.taskNum}>2</Text>
          <TextInput
            style={styles.taskInput}
            placeholder="Priority Goal 2..."
            placeholderTextColor={colors.textMuted}
            value={t2}
            onChangeText={setT2}
            onBlur={() => handleBlur(1, t2)}
          />
        </View>

        <View style={styles.taskItem}>
          <Text style={styles.taskNum}>3</Text>
          <TextInput
            style={styles.taskInput}
            placeholder="Priority Goal 3..."
            placeholderTextColor={colors.textMuted}
            value={t3}
            onChangeText={setT3}
            onBlur={() => handleBlur(2, t3)}
          />
        </View>
      </View>
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
  stripCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    fontWeight: '600',
  },
  todayLabel: {
    color: colors.accent,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayCircle: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  dayDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  big3Card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  big3Header: {
    marginBottom: 16,
  },
  big3Title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  big3Desc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  taskNum: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
    marginRight: 10,
  },
  taskInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 12,
  },
});
