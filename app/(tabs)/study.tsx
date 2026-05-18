import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { useState, useRef, useMemo, useCallback } from "react";
import { useWordStore } from "../../store/wordStore";
import {
  OXFORD_3000,
  LEVEL_COLORS,
  LEVEL_LABEL,
  CEFR,
  POS_KR,
  Word,
} from "../../data/oxford3000";
import { COLORS, SHADOWS } from "../../utils/colors";

const { width } = Dimensions.get("window");
const LEVELS: CEFR[] = ["A1", "A2", "B1", "B2"];
type StudyMode = "flashcard" | "quiz";
type QuizDirection = "en-ko" | "ko-en";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildChoices(
  wordId: number,
  correctAnswer: string,
  direction: QuizDirection,
) {
  const distractors = shuffle(OXFORD_3000.filter((w) => w.id !== wordId))
    .slice(0, 3)
    .map((w) => (direction === "en-ko" ? w.senses[0].meaning : w.word));
  return shuffle([correctAnswer, ...distractors]);
}

// ─── Setup Screen ────────────────────────────────────────────────────────────
type SetupProps = {
  selectedLevel: CEFR | "all";
  mode: StudyMode;
  direction: QuizDirection;
  onLevelChange: (l: CEFR | "all") => void;
  onModeChange: (m: StudyMode) => void;
  onDirectionChange: (d: QuizDirection) => void;
  onStart: () => void;
  dueCount: number;
};

function SetupScreen({
  selectedLevel,
  mode,
  direction,
  onLevelChange,
  onModeChange,
  onDirectionChange,
  onStart,
  dueCount,
}: SetupProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.setupContent}
    >
      <Text style={styles.pageTitle}>단어 학습하기</Text>

      <View style={[styles.infoCard, SHADOWS.card]}>
        <Text style={styles.infoText}>
          📚 학습할 단어 <Text style={styles.infoHighlight}>{dueCount}개</Text>
        </Text>
        <Text style={styles.infoSubText}>
          같은 단어를 <Text style={styles.infoHighlight}>5회 연속 정답</Text>
          하면 완료로 분류돼요.{"\n"}
          "확실히 알아요"로 표시한 단어는 학습에서 제외돼요.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>난이도 선택</Text>
      <View style={styles.optionRow}>
        {(["all", ...LEVELS] as const).map((l) => (
          <TouchableOpacity
            key={l}
            style={[
              styles.chip,
              selectedLevel === l && styles.chipActive,
              l !== "all" &&
                selectedLevel === l && {
                  backgroundColor: LEVEL_COLORS[l],
                  borderColor: LEVEL_COLORS[l],
                },
            ]}
            onPress={() => onLevelChange(l)}
          >
            <Text
              style={[
                styles.chipText,
                selectedLevel === l && styles.chipTextActive,
              ]}
            >
              {l === "all" ? "전체" : LEVEL_LABEL[l]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>문제 방향</Text>
      <View style={styles.optionRow}>
        <TouchableOpacity
          style={[styles.chip, direction === "en-ko" && styles.chipActive]}
          onPress={() => onDirectionChange("en-ko")}
        >
          <Text
            style={[
              styles.chipText,
              direction === "en-ko" && styles.chipTextActive,
            ]}
          >
            영어 → 한국어
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, direction === "ko-en" && styles.chipActive]}
          onPress={() => onDirectionChange("ko-en")}
        >
          <Text
            style={[
              styles.chipText,
              direction === "ko-en" && styles.chipTextActive,
            ]}
          >
            한국어 → 영어
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>학습 방식</Text>
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[
            styles.modeCard,
            mode === "flashcard" && styles.modeCardActive,
          ]}
          onPress={() => onModeChange("flashcard")}
        >
          <Text style={styles.modeEmoji}>🃏</Text>
          <Text
            style={[
              styles.modeName,
              mode === "flashcard" && styles.modeNameActive,
            ]}
          >
            플래시카드
          </Text>
          <Text style={styles.modeDesc}>
            처음 단어를 외우고{"\n"}아는 단어를 줄여나가요
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeCard, mode === "quiz" && styles.modeCardActive]}
          onPress={() => onModeChange("quiz")}
        >
          <Text style={styles.modeEmoji}>✏️</Text>
          <Text
            style={[styles.modeName, mode === "quiz" && styles.modeNameActive]}
          >
            퀴즈
          </Text>
          <Text style={styles.modeDesc}>4지선다로{"\n"}실력을 확인해요</Text>
        </TouchableOpacity>
      </View>

      {dueCount === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🎓</Text>
          <Text style={styles.emptyTitle}>이 레벨 완료!</Text>
          <Text style={styles.emptyDesc}>
            모든 단어를 학습했거나 제외했어요.
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.startBtn} onPress={onStart}>
          <Text style={styles.startBtnText}>학습 시작!</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── Review Prompt Screen ─────────────────────────────────────────────────────
type ReviewPromptProps = {
  count: number;
  onReview: () => void;
  onSkip: () => void;
};

function ReviewPromptScreen({ count, onReview, onSkip }: ReviewPromptProps) {
  return (
    <View style={[styles.container, styles.reviewPromptContainer]}>
      <Text style={styles.reviewPromptEmoji}>🔄</Text>
      <Text style={styles.reviewPromptTitle}>다시 외워볼까요?</Text>
      <Text style={styles.reviewPromptDesc}>
        이번 세션에서{"\n"}
        <Text style={styles.reviewPromptCount}>{count}개</Text>의 단어를
        놓쳤어요.
      </Text>
      <TouchableOpacity style={styles.reviewBtn} onPress={onReview}>
        <Text style={styles.reviewBtnText}>다시 학습하기</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
        <Text style={styles.skipBtnText}>결과 보기</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Result Screen ─────────────────────────────────────────────────────────────
type ResultProps = {
  correct: number;
  wrong: number;
  confirmed: number;
  onRestart: () => void;
};

function ResultScreen({ correct, wrong, confirmed, onRestart }: ResultProps) {
  const total = correct + wrong;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <View
      style={[
        styles.container,
        { justifyContent: "center", alignItems: "center" },
      ]}
    >
      <Text style={styles.resultEmoji}>
        {accuracy >= 80 ? "🏆" : accuracy >= 50 ? "💪" : "📚"}
      </Text>
      <Text style={styles.resultScore}>
        {total > 0 ? `${accuracy}%` : "완료!"}
      </Text>
      <Text style={styles.resultSub}>학습 결과</Text>
      <View style={styles.resultRow}>
        <View style={styles.resultItem}>
          <Text style={[styles.resultNum, { color: COLORS.success }]}>
            {correct}
          </Text>
          <Text style={styles.resultLabel}>맞음</Text>
        </View>
        <View style={styles.resultDivider} />
        <View style={styles.resultItem}>
          <Text style={[styles.resultNum, { color: COLORS.error }]}>
            {wrong}
          </Text>
          <Text style={styles.resultLabel}>틀림</Text>
        </View>
        <View style={styles.resultDivider} />
        <View style={styles.resultItem}>
          <Text style={[styles.resultNum, { color: COLORS.accent }]}>
            {confirmed}
          </Text>
          <Text style={styles.resultLabel}>제외됨</Text>
        </View>
      </View>
      <View style={styles.masteryHint}>
        <Text style={styles.masteryHintText}>
          💡 같은 단어를 5회 연속 정답하면 ✅ 완료로 분류돼요
        </Text>
      </View>
      <TouchableOpacity style={styles.restartBtn} onPress={onRestart}>
        <Text style={styles.restartBtnText}>다시 하기</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StudyScreen() {
  const [selectedLevel, setSelectedLevel] = useState<CEFR | "all">("all");
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [direction, setDirection] = useState<QuizDirection>("en-ko");
  const [started, setStarted] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    wrong: 0,
    confirmed: 0,
  });
  const [isDone, setIsDone] = useState(false);
  const [isReviewPhase, setIsReviewPhase] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [reviewWords, setReviewWords] = useState<Word[]>([]);

  // wrong words accumulated via ref to avoid re-render during session
  const wrongWordsRef = useRef<Word[]>([]);

  const {
    markWord,
    confirmWord,
    toggleBookmark,
    getWordProgress,
    getDueWords,
  } = useWordStore();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const studyWords = useMemo(() => {
    if (isReviewPhase) return reviewWords;
    const level = selectedLevel === "all" ? undefined : selectedLevel;
    const due = getDueWords(level);
    if (due.length === 0) return [];
    return shuffle(due).slice(0, 20);
  }, [started, selectedLevel, isReviewPhase, reviewWords]);

  const correctAnswer = useCallback(
    (w: Word) => (direction === "en-ko" ? w.senses[0].meaning : w.word),
    [direction],
  );

  const quizChoices = useMemo(() => {
    if (!studyWords[cardIndex]) return [];
    const w = studyWords[cardIndex];
    return buildChoices(w.id, correctAnswer(w), direction);
  }, [cardIndex, studyWords, direction, correctAnswer]);

  const currentWord = studyWords[cardIndex];
  const wordProgress = currentWord ? getWordProgress(currentWord.id) : null;

  const goNext = useCallback(
    (dir: "left" | "right") => {
      Animated.timing(slideAnim, {
        toValue: dir === "left" ? -width : width,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        slideAnim.setValue(0);
        flipAnim.setValue(0);
        setIsFlipped(false);
        setQuizSelected(null);
        if (cardIndex + 1 >= studyWords.length) {
          setIsDone(true);
        } else {
          setCardIndex((i) => i + 1);
        }
      });
    },
    [cardIndex, studyWords.length, slideAnim, flipAnim],
  );

  const handleMark = useCallback(
    (correct: boolean) => {
      if (!currentWord) return;
      markWord(currentWord.id, correct);
      if (!correct && !isReviewPhase) {
        wrongWordsRef.current = [...wrongWordsRef.current, currentWord];
      }
      setSessionStats((s) => ({
        ...s,
        correct: s.correct + (correct ? 1 : 0),
        wrong: s.wrong + (correct ? 0 : 1),
      }));
      goNext(correct ? "left" : "right");
    },
    [currentWord, markWord, goNext, isReviewPhase],
  );

  const handleConfirm = useCallback(() => {
    if (!currentWord) return;
    confirmWord(currentWord.id);
    setSessionStats((s) => ({ ...s, confirmed: s.confirmed + 1 }));
    goNext("left");
  }, [currentWord, confirmWord, goNext]);

  const handleQuizSelect = useCallback(
    (choice: string) => {
      if (quizSelected !== null || !currentWord) return;
      setQuizSelected(choice);
      const correct = choice === correctAnswer(currentWord);
      markWord(currentWord.id, correct);
      if (!correct && !isReviewPhase) {
        wrongWordsRef.current = [...wrongWordsRef.current, currentWord];
      }
      setSessionStats((s) => ({
        ...s,
        correct: s.correct + (correct ? 1 : 0),
        wrong: s.wrong + (correct ? 0 : 1),
      }));
      setTimeout(() => goNext("left"), 900);
    },
    [quizSelected, currentWord, markWord, goNext, correctAnswer, isReviewPhase],
  );

  const handleFlip = useCallback(() => {
    if (isFlipped) return;
    Animated.spring(flipAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setIsFlipped(true);
  }, [isFlipped, flipAnim]);

  const startReview = useCallback(() => {
    setReviewWords(shuffle(wrongWordsRef.current));
    setIsReviewPhase(true);
    setCardIndex(0);
    setIsFlipped(false);
    setQuizSelected(null);
    setIsDone(false);
    flipAnim.setValue(0);
    slideAnim.setValue(0);
  }, [flipAnim, slideAnim]);

  const restart = () => {
    wrongWordsRef.current = [];
    setReviewWords([]);
    setIsReviewPhase(false);
    setShowResult(false);
    setCardIndex(0);
    setIsFlipped(false);
    setQuizSelected(null);
    setSessionStats({ correct: 0, wrong: 0, confirmed: 0 });
    setIsDone(false);
    setStarted(false);
    flipAnim.setValue(0);
    slideAnim.setValue(0);
  };

  const dueCount = useMemo(() => {
    const level = selectedLevel === "all" ? undefined : selectedLevel;
    return getDueWords(level).length;
  }, [selectedLevel]);

  // ── Setup
  if (!started) {
    return (
      <SetupScreen
        selectedLevel={selectedLevel}
        mode={mode}
        direction={direction}
        onLevelChange={setSelectedLevel}
        onModeChange={setMode}
        onDirectionChange={setDirection}
        onStart={() => setStarted(true)}
        dueCount={dueCount}
      />
    );
  }

  // ── Done
  if (isDone) {
    // 오답 단어가 있고 재학습 페이즈가 아니면 다시 외우기 프롬프트
    if (!isReviewPhase && !showResult && wrongWordsRef.current.length > 0) {
      return (
        <ReviewPromptScreen
          count={wrongWordsRef.current.length}
          onReview={startReview}
          onSkip={() => setShowResult(true)}
        />
      );
    }
    return <ResultScreen {...sessionStats} onRestart={restart} />;
  }

  if (!currentWord) return null;

  // ── Flashcard Mode ──────────────────────────────────────────────────────────
  if (mode === "flashcard") {
    const frontRot = flipAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "180deg"],
    });
    const backRot = flipAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["180deg", "360deg"],
    });

    // 한→영 모드: 앞면에 한국어, 뒷면에 영단어
    const frontContent =
      direction === "en-ko" ? (
        <>
          <Text style={styles.wordText}>{currentWord.word}</Text>
          <Text style={styles.posText}>
            {currentWord.senses.map((s) => POS_KR[s.pos]).join(" / ")}
          </Text>
        </>
      ) : (
        <>
          {currentWord.senses.map((s, i) => (
            <View key={i} style={{ alignItems: "center", gap: 2 }}>
              <Text style={styles.posText}>{POS_KR[s.pos]}</Text>
              <Text style={styles.wordText}>{s.meaning}</Text>
            </View>
          ))}
        </>
      );

    const backContent =
      direction === "en-ko" ? (
        <>
          <View
            style={[
              styles.levelTag,
              { backgroundColor: "rgba(255,255,255,0.15)" },
            ]}
          >
            <Text
              style={[styles.levelTagText, { color: "rgba(255,255,255,0.8)" }]}
            >
              {currentWord.word}
            </Text>
          </View>
          {currentWord.senses.map((s, i) => (
            <View key={i} style={styles.senseRow}>
              <Text style={styles.sensePos}>{POS_KR[s.pos]}</Text>
              <Text style={styles.meaningText}>{s.meaning}</Text>
            </View>
          ))}
          <Text style={styles.exampleText}>"{currentWord.example}"</Text>
        </>
      ) : (
        <>
          <View
            style={[
              styles.levelTag,
              { backgroundColor: "rgba(255,255,255,0.15)" },
            ]}
          >
            <Text
              style={[styles.levelTagText, { color: "rgba(255,255,255,0.8)" }]}
            >
              {currentWord.senses[0].meaning}
            </Text>
          </View>
          <Text style={styles.meaningText}>{currentWord.word}</Text>
          <Text style={styles.posText2}>
            {currentWord.senses.map((s) => POS_KR[s.pos]).join(" / ")}
          </Text>
          <Text style={styles.exampleText}>"{currentWord.example}"</Text>
        </>
      );

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={restart} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← 설정</Text>
          </TouchableOpacity>
          <Text style={styles.headerProgress}>
            {cardIndex + 1} / {studyWords.length}
          </Text>
          <View style={styles.sessionBadges}>
            <Text style={[styles.badge, { color: COLORS.success }]}>
              ✓{sessionStats.correct}
            </Text>
            <Text style={[styles.badge, { color: COLORS.error }]}>
              ✗{sessionStats.wrong}
            </Text>
          </View>
        </View>

        <View style={styles.progressBarWrap}>
          <View
            style={[
              styles.progressFill,
              { width: `${(cardIndex / studyWords.length) * 100}%` as any },
            ]}
          />
        </View>

        {isReviewPhase && (
          <View style={styles.reviewBadge}>
            <Text style={styles.reviewBadgeText}>🔄 복습 모드</Text>
          </View>
        )}

        <Animated.View
          style={[
            styles.cardContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={handleFlip}
            style={styles.cardTouchable}
          >
            {/* Front */}
            <Animated.View
              style={[
                styles.card,
                styles.cardFront,
                SHADOWS.heavy,
                { transform: [{ rotateY: frontRot }] },
              ]}
            >
              <View
                style={[
                  styles.levelTag,
                  { backgroundColor: LEVEL_COLORS[currentWord.level] + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.levelTagText,
                    { color: LEVEL_COLORS[currentWord.level] },
                  ]}
                >
                  {LEVEL_LABEL[currentWord.level]}
                </Text>
              </View>
              {frontContent}
              <Text style={styles.flipHint}>
                탭하여 {direction === "en-ko" ? "뜻" : "영단어"} 보기
              </Text>
              <TouchableOpacity
                style={styles.bookmarkBtn}
                onPress={() => toggleBookmark(currentWord.id)}
              >
                <Text style={styles.bookmarkEmoji}>
                  {wordProgress?.bookmarked ? "⭐" : "☆"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            {/* Back */}
            <Animated.View
              style={[
                styles.card,
                styles.cardBack,
                SHADOWS.heavy,
                { transform: [{ rotateY: backRot }] },
              ]}
            >
              {backContent}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {isFlipped ? (
          <View style={styles.actionArea}>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>⚡ 확실히 알아요</Text>
              <Text style={styles.confirmBtnSub}>이후 학습에서 제외</Text>
            </TouchableOpacity>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.wrongBtn]}
                onPress={() => handleMark(false)}
              >
                <Text style={styles.actionBtnText}>✗ 몰랐어요</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.correctBtn]}
                onPress={() => handleMark(true)}
              >
                <Text style={styles.actionBtnText}>✓ 알았어요</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.hintRow}>
            <Text style={styles.hintText}>
              카드를 탭해서 {direction === "en-ko" ? "뜻을" : "영단어를"}{" "}
              확인하세요
            </Text>
          </View>
        )}
      </View>
    );
  }

  // ── Quiz Mode ──────────────────────────────────────────────────────────────
  const quizCorrect = correctAnswer(currentWord);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={restart} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← 설정</Text>
        </TouchableOpacity>
        <Text style={styles.headerProgress}>
          {cardIndex + 1} / {studyWords.length}
        </Text>
        <View style={styles.sessionBadges}>
          <Text style={[styles.badge, { color: COLORS.success }]}>
            ✓{sessionStats.correct}
          </Text>
          <Text style={[styles.badge, { color: COLORS.error }]}>
            ✗{sessionStats.wrong}
          </Text>
        </View>
      </View>

      <View style={styles.progressBarWrap}>
        <View
          style={[
            styles.progressFill,
            { width: `${(cardIndex / studyWords.length) * 100}%` as any },
          ]}
        />
      </View>

      {isReviewPhase && (
        <View style={styles.reviewBadge}>
          <Text style={styles.reviewBadgeText}>🔄 복습 모드</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.quizContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.levelTag,
            {
              backgroundColor: LEVEL_COLORS[currentWord.level] + "20",
              alignSelf: "flex-start",
              marginBottom: 12,
            },
          ]}
        >
          <Text
            style={[
              styles.levelTagText,
              { color: LEVEL_COLORS[currentWord.level] },
            ]}
          >
            {LEVEL_LABEL[currentWord.level]}
          </Text>
        </View>

        <View style={[styles.quizQuestionCard, SHADOWS.heavy]}>
          <Text style={styles.quizLabel}>
            {direction === "en-ko" ? "뜻을 고르세요" : "영단어를 고르세요"}
          </Text>
          {direction === "en-ko" ? (
            <>
              <Text style={styles.quizWord}>{currentWord.word}</Text>
              <Text style={styles.quizPos}>
                {currentWord.senses.map((s) => POS_KR[s.pos]).join(" / ")}
              </Text>
            </>
          ) : (
            <>
              {currentWord.senses.map((s, i) => (
                <View key={i} style={{ alignItems: "center" }}>
                  <Text style={styles.quizPos}>{POS_KR[s.pos]}</Text>
                  <Text style={styles.quizWord}>{s.meaning}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={styles.choices}>
          {quizChoices.map((choice, idx) => {
            let choiceStyle = styles.choice;
            let textColor = COLORS.text;
            if (quizSelected !== null) {
              if (choice === quizCorrect) {
                choiceStyle = StyleSheet.flatten([
                  styles.choice,
                  styles.choiceCorrect,
                ]) as any;
                textColor = "#FFFFFF";
              } else if (choice === quizSelected) {
                choiceStyle = StyleSheet.flatten([
                  styles.choice,
                  styles.choiceWrong,
                ]) as any;
                textColor = "#FFFFFF";
              } else {
                choiceStyle = StyleSheet.flatten([
                  styles.choice,
                  styles.choiceDimmed,
                ]) as any;
                textColor = COLORS.textMuted;
              }
            }
            return (
              <TouchableOpacity
                key={idx}
                style={choiceStyle}
                onPress={() => handleQuizSelect(choice)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.choiceIndex,
                    {
                      color:
                        quizSelected !== null ? textColor : COLORS.textMuted,
                    },
                  ]}
                >
                  {String.fromCharCode(65 + idx)}
                </Text>
                <Text style={[styles.choiceText, { color: textColor }]}>
                  {choice}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {quizSelected === null && (
          <TouchableOpacity
            style={styles.confirmBtnSmall}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmBtnSmallText}>
              ⚡ 확실히 알아요 — 이후 학습에서 제외
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },

  // Setup
  setupContent: {
    padding: 20,
    paddingBottom: 60,
    gap: 14,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  modeRow: {
    flexDirection: "row",
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  modeCardActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + "08",
  },
  modeEmoji: {
    fontSize: 28,
  },
  modeName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  modeNameActive: {
    color: COLORS.accent,
  },
  modeDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },
  infoHighlight: {
    color: COLORS.accent,
    fontWeight: "800",
  },
  infoSubText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted },
  startBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  startBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 17,
  },

  // Review prompt
  reviewPromptContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  reviewPromptEmoji: { fontSize: 64 },
  reviewPromptTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 12,
  },
  reviewPromptDesc: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 26,
    marginTop: 10,
    marginBottom: 32,
  },
  reviewPromptCount: {
    color: COLORS.accent,
    fontWeight: "800",
    fontSize: 20,
  },
  reviewBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 12,
  },
  reviewBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipBtnText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 14 },

  // Review badge (during review phase)
  reviewBadge: {
    alignSelf: "center",
    backgroundColor: COLORS.accent + "15",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.accent + "40",
  },
  reviewBadgeText: { fontSize: 12, color: COLORS.accent, fontWeight: "700" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  headerProgress: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  sessionBadges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressBarWrap: {
    height: 3,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },

  // Flashcard
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  cardTouchable: {
    width: "100%",
    aspectRatio: 0.72,
  },
  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 24,
    padding: 28,
    justifyContent: "center",
    alignItems: "center",
    backfaceVisibility: "hidden",
    gap: 10,
  },
  cardFront: { backgroundColor: COLORS.surface },
  cardBack: { backgroundColor: COLORS.primary },
  levelTag: {
    position: "absolute",
    top: 20,
    left: 20,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelTagText: { fontSize: 12, fontWeight: "700" },
  wordText: {
    fontSize: 40,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: -1,
  },
  posText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "500" },
  posText2: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  senseRow: { alignItems: "center", marginVertical: 2 },
  sensePos: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
    marginBottom: 2,
  },
  flipHint: {
    position: "absolute",
    bottom: 24,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  bookmarkBtn: { position: "absolute", top: 16, right: 20 },
  bookmarkEmoji: { fontSize: 22 },
  meaningText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  exampleText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Action area (flashcard)
  actionArea: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    paddingTop: 12,
    gap: 10,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    gap: 2,
  },
  confirmBtnText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 15,
  },
  confirmBtnSub: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  wrongBtn: { backgroundColor: COLORS.error },
  correctBtn: { backgroundColor: COLORS.success },
  actionBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  hintRow: {
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    paddingTop: 16,
    alignItems: "center",
  },
  hintText: { fontSize: 13, color: COLORS.textMuted },

  // Quiz
  quizContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  quizQuestionCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  quizLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  quizWord: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  quizPos: { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  choices: { gap: 10 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  choiceCorrect: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: COLORS.success,
  },
  choiceWrong: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.error,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  choiceDimmed: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    opacity: 0.4,
  },
  choiceIndex: { fontSize: 13, fontWeight: "700", width: 18 },
  choiceText: { fontSize: 15, fontWeight: "600", flex: 1 },
  confirmBtnSmall: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  confirmBtnSmallText: {
    color: COLORS.accent,
    fontWeight: "600",
    fontSize: 13,
  },

  // Result
  resultEmoji: { fontSize: 64 },
  resultScore: { fontSize: 52, fontWeight: "800", color: COLORS.text },
  resultSub: { fontSize: 15, color: COLORS.textMuted },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    marginTop: 12,
  },
  resultItem: { alignItems: "center", gap: 4 },
  resultNum: { fontSize: 30, fontWeight: "800" },
  resultLabel: { fontSize: 12, color: COLORS.textMuted },
  resultDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  masteryHint: {
    marginTop: 20,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  masteryHintText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  restartBtn: {
    marginTop: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  restartBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
