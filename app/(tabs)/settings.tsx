import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useWordStore } from '../../store/wordStore';
import { COLORS, SHADOWS } from '../../utils/colors';

const GOAL_OPTIONS = [10, 20, 30, 50];

export default function SettingsScreen() {
  const { dailyGoal, setDailyGoal, resetProgress, getMasteredCount, getConfirmedCount } =
    useWordStore();

  const masteredCount = getMasteredCount();
  const confirmedCount = getConfirmedCount();

  const handleReset = () => {
    Alert.alert(
      '학습 기록 초기화',
      '모든 학습 진행 상황이 삭제돼요. 이 작업은 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: () => resetProgress(),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>설정</Text>

      {/* Daily Goal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>일일 목표</Text>
        <Text style={styles.sectionDesc}>하루에 학습할 목표 단어 수를 설정해요.</Text>
        <View style={[styles.card, SHADOWS.card]}>
          <View style={styles.goalRow}>
            {GOAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.goalChip, dailyGoal === opt && styles.goalChipActive]}
                onPress={() => setDailyGoal(opt)}
              >
                <Text style={[styles.goalChipText, dailyGoal === opt && styles.goalChipTextActive]}>
                  {opt}개
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.goalHint}>현재 목표: 하루 {dailyGoal}개</Text>
        </View>
      </View>

      {/* Progress Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>학습 현황</Text>
        <View style={[styles.card, SHADOWS.card]}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{masteredCount}</Text>
              <Text style={styles.statLabel}>완료 단어</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{confirmedCount}</Text>
              <Text style={styles.statLabel}>제외 단어</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Reset */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>데이터 관리</Text>
        <TouchableOpacity
          style={[styles.card, styles.resetCard, SHADOWS.card]}
          onPress={handleReset}
          activeOpacity={0.8}
        >
          <View style={styles.resetContent}>
            <Text style={styles.resetTitle}>학습 기록 초기화</Text>
            <Text style={styles.resetDesc}>
              모든 진행 상황, 북마크, 스트릭이 삭제돼요.
            </Text>
          </View>
          <Text style={styles.resetArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>앱 정보</Text>
        <View style={[styles.card, SHADOWS.card]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>단어 수</Text>
            <Text style={styles.infoValue}>498개 (Oxford 3000)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CEFR 레벨</Text>
            <Text style={styles.infoValue}>A1 · A2 · B1 · B2</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>버전</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>
      </View>
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
    paddingBottom: 48,
    gap: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: -4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
  },
  goalRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  goalChip: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  goalChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  goalChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  goalChipTextActive: {
    color: '#FFFFFF',
  },
  goalHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  resetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A510',
    backgroundColor: '#FFF5F5',
  },
  resetContent: {
    flex: 1,
    gap: 3,
  },
  resetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.error,
  },
  resetDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  resetArrow: {
    fontSize: 22,
    color: COLORS.error,
    fontWeight: '300',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 6,
  },
});
