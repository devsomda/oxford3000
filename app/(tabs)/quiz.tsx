import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { useWordStore } from '../../store/wordStore';
import { OXFORD_3000, LEVEL_COLORS, LEVEL_LABEL, CEFR } from '../../data/oxford3000';
import { COLORS, SHADOWS } from '../../utils/colors';

const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2'];

type QuizMode = 'en-ko' | 'ko-en';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuiz(words: typeof OXFORD_3000, mode: QuizMode) {
  return shuffle(words).map((word) => {
    const distractors = shuffle(
      OXFORD_3000.filter((w) => w.id !== word.id)
    )
      .slice(0, 3)
      .map((w) => (mode === 'en-ko' ? w.meaning : w.word));

    const correct = mode === 'en-ko' ? word.meaning : word.word;
    const choices = shuffle([correct, ...distractors]);

    return {
      word,
      question: mode === 'en-ko' ? word.word : word.meaning,
      correct,
      choices,
    };
  });
}

export default function QuizScreen() {
  const [selectedLevel, setSelectedLevel] = useState<CEFR | 'all'>('all');
  const [mode, setMode] = useState<QuizMode>('en-ko');
  const [quizStarted, setQuizStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [isDone, setIsDone] = useState(false);

  const { markWord } = useWordStore();

  const pool = useMemo(() => {
    return selectedLevel === 'all'
      ? OXFORD_3000
      : OXFORD_3000.filter((w) => w.level === selectedLevel);
  }, [selectedLevel]);

  const quiz = useMemo(() => {
    if (!quizStarted) return [];
    return buildQuiz(pool.slice(0, 20), mode);
  }, [quizStarted, pool, mode]);

  const currentQ = quiz[questionIndex];

  const handleSelect = useCallback(
    (choice: string) => {
      if (selected !== null) return;
      setSelected(choice);
      const correct = choice === currentQ.correct;
      markWord(currentQ.word.id, correct);
      setSessionStats((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        wrong: s.wrong + (correct ? 0 : 1),
      }));

      setTimeout(() => {
        if (questionIndex + 1 >= quiz.length) {
          setIsDone(true);
        } else {
          setQuestionIndex((i) => i + 1);
          setSelected(null);
        }
      }, 900);
    },
    [selected, currentQ, questionIndex, quiz.length, markWord]
  );

  const restart = () => {
    setQuestionIndex(0);
    setSelected(null);
    setSessionStats({ correct: 0, wrong: 0 });
    setIsDone(false);
    setQuizStarted(false);
  };

  const startQuiz = () => {
    setQuestionIndex(0);
    setSelected(null);
    setSessionStats({ correct: 0, wrong: 0 });
    setIsDone(false);
    setQuizStarted(true);
  };

  // Setup screen
  if (!quizStarted) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.setupContent}>
        <Text style={styles.headerTitle}>퀴즈</Text>

        <Text style={styles.sectionLabel}>레벨 선택</Text>
        <View style={styles.optionRow}>
          {(['all', ...LEVELS] as const).map((l) => (
            <TouchableOpacity
              key={l}
              style={[
                styles.optionChip,
                selectedLevel === l && styles.optionChipActive,
                l !== 'all' && selectedLevel === l && { backgroundColor: LEVEL_COLORS[l] },
              ]}
              onPress={() => setSelectedLevel(l)}
            >
              <Text style={[styles.optionText, selectedLevel === l && styles.optionTextActive]}>
                {l === 'all' ? '전체' : l}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>퀴즈 방향</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'en-ko' && styles.modeBtnActive]}
            onPress={() => setMode('en-ko')}
          >
            <Text style={[styles.modeText, mode === 'en-ko' && styles.modeTextActive]}>
              영어 → 한국어
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'ko-en' && styles.modeBtnActive]}
            onPress={() => setMode('ko-en')}
          >
            <Text style={[styles.modeText, mode === 'ko-en' && styles.modeTextActive]}>
              한국어 → 영어
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, SHADOWS.card]}>
          <Text style={styles.infoText}>
            📝 선택된 레벨에서 20문제를 랜덤으로 출제합니다.
          </Text>
          <Text style={styles.infoText}>4지선다로 진행되며 결과는 학습 기록에 반영됩니다.</Text>
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={startQuiz}>
          <Text style={styles.startBtnText}>퀴즈 시작!</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Done screen
  if (isDone) {
    const total = sessionStats.correct + sessionStats.wrong;
    const accuracy = total > 0 ? Math.round((sessionStats.correct / total) * 100) : 0;
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>퀴즈 결과</Text>
        </View>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{accuracy >= 80 ? '🏆' : accuracy >= 50 ? '💪' : '📚'}</Text>
          <Text style={styles.resultScore}>{accuracy}점</Text>
          <Text style={styles.resultSub}>{total}문제 중 {sessionStats.correct}개 정답</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreNum, { color: COLORS.success }]}>{sessionStats.correct}</Text>
              <Text style={styles.scoreLabel}>정답</Text>
            </View>
            <View style={[styles.scoreDivider]} />
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreNum, { color: COLORS.error }]}>{sessionStats.wrong}</Text>
              <Text style={styles.scoreLabel}>오답</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.restartBtn} onPress={restart}>
            <Text style={styles.restartBtnText}>다시 풀기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Quiz screen
  const choiceStyle = (choice: string) => {
    if (selected === null) return styles.choice;
    if (choice === currentQ.correct) return [styles.choice, styles.choiceCorrect];
    if (choice === selected && choice !== currentQ.correct) return [styles.choice, styles.choiceWrong];
    return [styles.choice, styles.choiceDimmed];
  };

  const choiceTextStyle = (choice: string) => {
    if (selected === null) return styles.choiceText;
    if (choice === currentQ.correct) return [styles.choiceText, { color: '#FFFFFF' }];
    if (choice === selected && choice !== currentQ.correct) return [styles.choiceText, { color: '#FFFFFF' }];
    return [styles.choiceText, { color: COLORS.textMuted }];
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>퀴즈</Text>
        <Text style={styles.progressText}>{questionIndex + 1} / {quiz.length}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarWrap}>
        <View style={[styles.progressFill, { width: `${((questionIndex) / quiz.length) * 100}%` as any }]} />
      </View>

      {/* Stats */}
      <View style={styles.quizStats}>
        <Text style={[styles.quizStat, { color: COLORS.success }]}>✓ {sessionStats.correct}</Text>
        <Text style={[styles.quizStat, { color: COLORS.error }]}>✗ {sessionStats.wrong}</Text>
      </View>

      {/* Level badge */}
      <View style={styles.quizLevelRow}>
        <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[currentQ.word.level] + '20' }]}>
          <Text style={[styles.levelBadgeText, { color: LEVEL_COLORS[currentQ.word.level] }]}>
            {LEVEL_LABEL[currentQ.word.level]}
          </Text>
        </View>
      </View>

      {/* Question */}
      <View style={[styles.questionCard, SHADOWS.heavy]}>
        <Text style={styles.questionLabel}>
          {mode === 'en-ko' ? '뜻을 고르세요' : '영단어를 고르세요'}
        </Text>
        <Text style={styles.questionWord}>{currentQ.question}</Text>
      </View>

      {/* Choices */}
      <View style={styles.choices}>
        {currentQ.choices.map((choice, idx) => (
          <TouchableOpacity
            key={idx}
            style={choiceStyle(choice)}
            onPress={() => handleSelect(choice)}
            activeOpacity={0.8}
          >
            <Text style={styles.choiceIndex}>{String.fromCharCode(65 + idx)}</Text>
            <Text style={choiceTextStyle(choice)}>{choice}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  setupContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  progressBarWrap: {
    height: 4,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  quizStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },
  quizStat: {
    fontSize: 14,
    fontWeight: '700',
  },
  quizLevelRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  questionCard: {
    marginHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  questionWord: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  choices: {
    paddingHorizontal: 20,
    gap: 10,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  choiceCorrect: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  choiceWrong: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  choiceDimmed: {
    opacity: 0.45,
  },
  choiceIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    width: 18,
  },
  choiceText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  startBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  resultEmoji: {
    fontSize: 64,
  },
  resultScore: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.text,
  },
  resultSub: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 8,
    alignItems: 'center',
  },
  scoreBox: {
    alignItems: 'center',
    gap: 4,
  },
  scoreNum: {
    fontSize: 32,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  scoreDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  restartBtn: {
    marginTop: 24,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  restartBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
