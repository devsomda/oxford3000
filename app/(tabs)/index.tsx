import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useWordStore } from '../../store/wordStore';
import { OXFORD_3000, LEVEL_COLORS, LEVEL_LABEL, CEFR } from '../../data/oxford3000';
import { COLORS, SHADOWS } from '../../utils/colors';
import { FONTS } from '../../utils/fonts';

const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2'];

export default function HomeScreen() {
  const router = useRouter();
  const { progress, dailyGoal, streak, getMasteredCount, getTodayStudied, getDueWords } =
    useWordStore();

  const masteredCount = getMasteredCount();
  const confirmedCount = useWordStore((s) => s.getConfirmedCount)();
  const todayStudied = getTodayStudied();
  const totalWords = OXFORD_3000.length;
  const excludedCount = confirmedCount;
  const dailyProgress = Math.min(todayStudied / dailyGoal, 1);

  const levelStats = useMemo(() => {
    return LEVELS.map((level) => {
      const levelWords = OXFORD_3000.filter((w) => w.level === level);
      const mastered = levelWords.filter((w) => progress[w.id]?.status === 'mastered').length;
      const learning = levelWords.filter((w) => progress[w.id]?.status === 'learning').length;
      const due = getDueWords(level).length;
      return { level, total: levelWords.length, mastered, learning, due };
    });
  }, [progress]);

  const todayWord = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
    const seed = now.getFullYear() * 1000 + dayOfYear;

    const unseen = OXFORD_3000.filter((w) => !progress[w.id] || progress[w.id].status === 'unseen');
    const pool = unseen.length > 0 ? unseen : OXFORD_3000;
    return pool[seed % pool.length];
  }, [progress]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요! 👋</Text>
        <Text style={styles.title}>Oxford 3000</Text>
        <Text style={styles.subtitle}>오늘도 단어를 외워볼까요?</Text>
      </View>

      {/* Streak + Daily Goal */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, SHADOWS.card]}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>일 연속</Text>
        </View>
        <View style={[styles.statCard, SHADOWS.card]}>
          <Text style={styles.statEmoji}>✅</Text>
          <Text style={styles.statValue}>{masteredCount}</Text>
          <Text style={styles.statLabel}>완료 단어</Text>
        </View>
        <View style={[styles.statCard, SHADOWS.card]}>
          <Text style={styles.statEmoji}>📚</Text>
          <Text style={styles.statValue}>{totalWords - masteredCount - excludedCount}</Text>
          <Text style={styles.statLabel}>남은 단어</Text>
        </View>
      </View>

      {/* Daily Goal Progress */}
      <View style={[styles.card, SHADOWS.card]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>오늘의 목표</Text>
          <Text style={styles.cardMeta}>{todayStudied} / {dailyGoal}개</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${dailyProgress * 100}%` as any }]} />
        </View>
        {todayStudied >= dailyGoal && (
          <Text style={styles.goalDone}>🎉 오늘 목표 달성!</Text>
        )}
      </View>

      {/* Today's Word */}
      <View style={[styles.todayCard, SHADOWS.heavy]}>
        <Text style={styles.todayLabel}>오늘의 단어</Text>
        <Text style={styles.todayWord}>{todayWord.word}</Text>
        <Text style={styles.todayMeaning}>{todayWord.senses[0].meaning}</Text>
        <Text style={styles.todayExample}>"{todayWord.example}"</Text>
        <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[todayWord.level] + '20' }]}>
          <Text style={[styles.levelBadgeText, { color: LEVEL_COLORS[todayWord.level] }]}>
            {LEVEL_LABEL[todayWord.level]}
          </Text>
        </View>
      </View>

      {/* Level Progress */}
      <Text style={styles.sectionTitle}>레벨별 진행현황</Text>
      {levelStats.map(({ level, total, mastered, learning, due }) => (
        <View key={level} style={[styles.levelCard, SHADOWS.card]}>
          <View style={styles.levelHeader}>
            <View style={[styles.levelDot, { backgroundColor: LEVEL_COLORS[level] }]} />
            <Text style={styles.levelName}>{LEVEL_LABEL[level]}</Text>
            <Text style={styles.levelCount}>{mastered}/{total}</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(mastered / total) * 100}%` as any,
                  backgroundColor: LEVEL_COLORS[level],
                },
              ]}
            />
          </View>
          <View style={styles.levelMeta}>
            <Text style={styles.metaText}>학습 중 {learning}개</Text>
            {due > 0 && <Text style={[styles.metaText, styles.dueBadge]}>복습 {due}개</Text>}
          </View>
        </View>
      ))}

      {/* Quick Action Buttons */}
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: COLORS.accent }]}
        onPress={() => router.push('/study')}
      >
        <Text style={styles.actionBtnText}>📖 단어 학습하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statEmoji: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 22,
    fontFamily: FONTS.interExtraBold,
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  goalDone: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  todayCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 24,
    gap: 8,
    alignItems: 'flex-start',
  },
  todayLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  todayWord: {
    fontSize: 36,
    fontFamily: FONTS.interExtraBold,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  todayMeaning: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  todayExample: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  levelBadge: {
    marginTop: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  levelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  levelName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  levelCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  levelMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dueBadge: {
    color: COLORS.warning,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
