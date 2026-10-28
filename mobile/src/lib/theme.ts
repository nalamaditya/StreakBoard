// mobile/src/lib/theme.ts
// Streakboard brand & theme token design system

export const colors = {
  background: '#17191D',
  card: '#22252B',
  cardSecondary: '#2A2E35',
  border: '#343840',
  text: '#F0F1F3',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#F5C518',
  danger: '#EF4444',
  success: '#10B981',

  // Multicolored habit palette
  habits: {
    mint: '#7FD8B2',
    blue: '#7BBBF7',
    lavender: '#B6A0F5',
    coral: '#F39A91',
    peach: '#F4BD83',
    rose: '#E9A1C0',
    lemon: '#E9D779',
    teal: '#70CEC8',
    default: '#7FD8B2'
  } as Record<string, string>
};

export function getHabitColor(colorName?: string): string {
  if (!colorName) return colors.habits.mint;
  return colors.habits[colorName.toLowerCase()] || colors.habits.mint;
}
