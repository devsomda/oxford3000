import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useState, useRef, useMemo, useCallback } from 'react';
import { useWordStore } from '../../store/wordStore';
import { OXFORD_3000, LEVEL_COLORS, LEVEL_LABEL, CEFR, POS_KR } from '../../data/oxford3000';
import { COLORS, SHADOWS } from '../../utils/colors';

const { width } = Dimensions.get('window');
const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2'];

export default function StudyScreen() {
  const [selectedLevel, setSelectedLevel] = useState<CEFR | 'all'>('all');
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [isSessionDone, setIsSessionDone] = useState(false);

  const { markWord, toggleBookmark, getWordProgress, getDueWords } = useWordStore();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const studyWords = useMemo(() => {
    const level = selectedLevel === 'all' ? undefined : selectedLevel;
    const due = getDueWords(level);
    if (due.length === 0) {
      // fallback: show unseen/learning words even if not due
      return OXFORD_3000.filter((w) => {
        if (level && w.level !== level) return false;
        const p = getWordProgress(w.id);
        return p.status !== 'mastered';
      }).slice(0, 20);
    }
    return due.slice(0, 20);
  }, [selectedLevel]);

  const currentWord = studyWords[cardIndex];

  const flip = useCallback(() => {
    if (isFlipped) return;
    Animated.spring(flipAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setIsFlipped(true);
  }, [isFlipped, flipAnim]);

  const nextCard = useCallback(
    (correct: boolean) => {
      markWord(currentWord.id, correct);
      setSessionStats((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        wrong: s.wrong + (correct ? 0 : 1),
      }));

      // Slide out
      Animated.timing(slideAnim, {
        toValue: correct ? -width : width,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        slideAnim.setValue(0);
        flipAnim.setValue(0);
        setIsFlipped(false);
        if (cardIndex + 1 >= studyWords.length) {
          setIsSessionDone(true);
        } else {
          setCardIndex((i) => i + 1);
        }
      });
    },
    [currentWord, cardIndex, studyWords.length, markWord, flipAnim, slideAnim]
  );

  const restart = () => {
    setCardIndex(0);
    setIsFlipped(false);
    setSessionStats({ correct: 0, wrong: 0 });
    setIsSessionDone(false);
    flipAnim.setValue(0);
    slideAnim.setValue(0);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  if (isSessionDone) {
    const total = sessionStats.correct + sessionStats.wrong;
    const accuracy = total > 0 ? Math.round((sessionStats.correct / total) * 100) : 0;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>학습 결과</Text>
        </View>
        <View style={styles.resultCard}>
          <Text style={styles.resultEmoji}>{accuracy >= 80 ? '🎉' : accuracy >= 50 ? '💪' : '📚'}</Text>
          <Text style={styles.resultAccuracy}>{accuracy}%</Text>
          <Text style={styles.resultSub}>정답률</Text>
          <View style={styles.resultRow}>
            <View style={styles.resultItem}>
              <Text style={[styles.resultNum, { color: COLORS.success }]}>{sessionStats.correct}</Text>
              <Text style={styles.resultLabel}>맞춤</Text>
            </View>
            <View style={styles.resultDivider} />
            <View style={styles.resultItem}>
              <Text style={[styles.resultNum, { color: COLORS.error }]}>{sessionStats.wrong}</Text>
              <Text style={styles.resultLabel}>틀림</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.restartBtn} onPress={restart}>
            <Text style={styles.restartBtnText}>다시 학습하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentWord) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>플래시카드</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎓</Text>
          <Text style={styles.emptyTitle}>학습 완료!</Text>
          <Text style={styles.emptyText}>이 레벨의 모든 단어를 마스터했어요.</Text>
        </View>
      </View>
    );
  }

  const wordProgress = getWordProgress(currentWord.id);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>플래시카드</Text>
        <Text style={styles.headerProgress}>
          {cardIndex + 1} / {studyWords.length}
        </Text>
      </View>

      {/* Level Filter */}
      <View style={styles.levelFilter}>
        <TouchableOpacity
          style={[styles.levelChip, selectedLevel === 'all' && styles.levelChipActive]}
          onPress={() => { setSelectedLevel('all'); restart(); }}
        >
          <Text style={[styles.levelChipText, selectedLevel === 'all' && styles.levelChipTextActive]}>전체</Text>
        </TouchableOpacity>
        {LEVELS.map((l) => (
          <TouchableOpacity
            key={l}
            style={[
              styles.levelChip,
              selectedLevel === l && { backgroundColor: LEVEL_COLORS[l] },
            ]}
            onPress={() => { setSelectedLevel(l); restart(); }}
          >
            <Text style={[styles.levelChipText, selectedLevel === l && styles.levelChipTextActive]}>
              {l}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Session Stats */}
      <View style={styles.sessionStats}>
        <Text style={[styles.sessionStat, { color: COLORS.success }]}>✓ {sessionStats.correct}</Text>
        <Text style={[styles.sessionStat, { color: COLORS.error }]}>✗ {sessionStats.wrong}</Text>
      </View>

      {/* Flashcard */}
      <Animated.View style={[styles.cardContainer, { transform: [{ translateX: slideAnim }] }]}>
        <TouchableOpacity activeOpacity={0.95} onPress={flip} style={styles.cardTouchable}>
          {/* Front */}
          <Animated.View
            style={[
              styles.card,
              styles.cardFront,
              SHADOWS.heavy,
              { transform: [{ rotateY: frontInterpolate }] },
            ]}
          >
            <View style={[styles.levelTag, { backgroundColor: LEVEL_COLORS[currentWord.level] + '20' }]}>
              <Text style={[styles.levelTagText, { color: LEVEL_COLORS[currentWord.level] }]}>
                {LEVEL_LABEL[currentWord.level]}
              </Text>
            </View>
            <Text style={styles.wordText}>{currentWord.word}</Text>
            <Text style={styles.posText}>{POS_KR[currentWord.pos]}</Text>
            <Text style={styles.flipHint}>탭하여 뜻 보기</Text>
            <TouchableOpacity
              style={styles.bookmarkBtn}
              onPress={() => toggleBookmark(currentWord.id)}
            >
              <Text style={styles.bookmarkEmoji}>
                {wordProgress.bookmarked ? '⭐' : '☆'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Back */}
          <Animated.View
            style={[
              styles.card,
              styles.cardBack,
              SHADOWS.heavy,
              { transform: [{ rotateY: backInterpolate }] },
            ]}
          >
            <View style={[styles.levelTag, { backgroundColor: LEVEL_COLORS[currentWord.level] + '20' }]}>
              <Text style={[styles.levelTagText, { color: LEVEL_COLORS[currentWord.level] }]}>
                {currentWord.word}
              </Text>
            </View>
            <Text style={styles.meaningText}>{currentWord.meaning}</Text>
            <Text style={styles.exampleText}>"{currentWord.example}"</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Action Buttons */}
      {isFlipped && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.wrongBtn]}
            onPress={() => nextCard(false)}
          >
            <Text style={styles.actionBtnText}>✗ 몰랐어요</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.correctBtn]}
            onPress={() => nextCard(true)}
          >
            <Text style={styles.actionBtnText}>✓ 알았어요</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isFlipped && (
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>카드를 탭해서 뜻을 확인하세요</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerProgress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  levelFilter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  levelChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  levelChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  levelChipTextActive: {
    color: '#FFFFFF',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  sessionStat: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cardTouchable: {
    width: '100%',
    aspectRatio: 0.75,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    gap: 12,
  },
  cardFront: {
    backgroundColor: COLORS.surface,
  },
  cardBack: {
    backgroundColor: COLORS.primary,
  },
  levelTag: {
    position: 'absolute',
    top: 20,
    left: 20,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  wordText: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -1,
  },
  posText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  flipHint: {
    position: 'absolute',
    bottom: 24,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
  },
  bookmarkEmoji: {
    fontSize: 22,
  },
  meaningText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  exampleText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    gap: 12,
    paddingTop: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  wrongBtn: {
    backgroundColor: COLORS.error,
  },
  correctBtn: {
    backgroundColor: COLORS.success,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  hintRow: {
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 16,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  resultCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  resultEmoji: {
    fontSize: 64,
  },
  resultAccuracy: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.text,
  },
  resultSub: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    marginTop: 8,
  },
  resultItem: {
    alignItems: 'center',
    gap: 4,
  },
  resultNum: {
    fontSize: 32,
    fontWeight: '800',
  },
  resultLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  resultDivider: {
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
