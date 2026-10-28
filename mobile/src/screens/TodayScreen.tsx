// mobile/src/screens/TodayScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { useBoard, getTodayKey } from '../context/BoardContext';
import { colors, getHabitColor } from '../lib/theme';

const PALETTE = ['mint', 'blue', 'lavender', 'coral', 'peach', 'rose', 'lemon', 'teal'];

export const TodayScreen: React.FC = () => {
  const { state, toggleHabitCheck, addHabit, getStreak, getTodayProgress, syncing } = useBoard();
  const [modalVisible, setModalVisible] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('⚡');
  const [newHabitColor, setNewHabitColor] = useState('mint');

  const todayKey = getTodayKey();
  const progress = getTodayProgress();
  const todayChecks = state.checks[todayKey] || {};

  const handleCreateHabit = () => {
    if (!newHabitName.trim()) {
      Alert.alert('Required', 'Please enter habit name');
      return;
    }
    addHabit(newHabitName, newHabitEmoji, newHabitColor);
    setNewHabitName('');
    setModalVisible(false);
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <Text style={styles.titleText}>Today's Habits</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Progress & Sync Bar */}
      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            {progress.done} of {progress.total} habits completed
          </Text>
          <Text style={styles.progressPercent}>{progress.percent}%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress.percent}%`, backgroundColor: colors.accent }
            ]}
          />
        </View>
        {syncing && (
          <Text style={styles.syncingText}>☁️ Syncing with cloud...</Text>
        )}
      </View>

      {/* Habit List */}
      <ScrollView contentContainerStyle={styles.list}>
        {state.habits.map(habit => {
          const isDone = !!todayChecks[habit.id];
          const streak = getStreak(habit.id);
          const habitColor = getHabitColor(habit.color);

          return (
            <TouchableOpacity
              key={habit.id}
              style={[styles.habitCard, isDone && styles.habitCardDone]}
              onPress={() => toggleHabitCheck(habit.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.colorBar, { backgroundColor: habitColor }]} />
              
              <View style={styles.habitMain}>
                <View style={styles.emojiContainer}>
                  <Text style={styles.emojiText}>{habit.emoji}</Text>
                </View>

                <View style={styles.habitInfo}>
                  <Text style={[styles.habitName, isDone && styles.habitNameDone]}>
                    {habit.name}
                  </Text>
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakFlame}>🔥</Text>
                    <Text style={styles.streakCount}>{streak} streak</Text>
                  </View>
                </View>

                <View style={[styles.checkCircle, isDone && { backgroundColor: habitColor, borderColor: habitColor }]}>
                  {isDone && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Habit</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Habit Name (e.g. Morning Run)"
              placeholderTextColor={colors.textMuted}
              value={newHabitName}
              onChangeText={setNewHabitName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Emoji (e.g. 🏃‍♂️, 📚, 💧)"
              placeholderTextColor={colors.textMuted}
              value={newHabitEmoji}
              onChangeText={setNewHabitEmoji}
            />

            <Text style={styles.colorSelectLabel}>Choose Color Accent:</Text>
            <View style={styles.paletteRow}>
              {PALETTE.map(col => (
                <TouchableOpacity
                  key={col}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: getHabitColor(col) },
                    newHabitColor === col && styles.colorCircleSelected
                  ]}
                  onPress={() => setNewHabitColor(col)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmit}
                onPress={handleCreateHabit}
              >
                <Text style={styles.modalSubmitText}>Create Habit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  progressCard: {
    backgroundColor: colors.card,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercent: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.cardSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  syncingText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  habitCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  habitCardDone: {
    opacity: 0.9,
    backgroundColor: colors.cardSecondary,
  },
  colorBar: {
    width: 6,
  },
  habitMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  emojiContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  emojiText: {
    fontSize: 22,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  habitNameDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  streakFlame: {
    fontSize: 12,
    marginRight: 3,
  },
  streakCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    marginBottom: 12,
  },
  colorSelectLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 10,
    marginTop: 4,
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmit: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  modalSubmitText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
});
