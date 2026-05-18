import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useWordStore } from '../../store/wordStore';
import { OXFORD_3000, LEVEL_COLORS, CEFR, POS_KR, LEVEL_LABEL } from '../../data/oxford3000';
import { COLORS, SHADOWS } from '../../utils/colors';

const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2'];
type FilterTab = 'all' | 'bookmarked' | 'mastered' | 'learning' | 'confirmed';

const FILTER_LABELS: Record<FilterTab, string> = {
  all: '전체',
  bookmarked: '⭐ 북마크',
  mastered: '✅ 완료',
  learning: '📖 학습중',
  confirmed: '⚡ 제외됨',
};

export default function WordListScreen() {
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFR | 'all'>('all');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const { progress, toggleBookmark, unconfirmWord, getConfirmedCount } = useWordStore();

  const confirmedCount = getConfirmedCount();

  const filtered = useMemo(() => {
    return OXFORD_3000.filter((w) => {
      if (selectedLevel !== 'all' && w.level !== selectedLevel) return false;
      const p = progress[w.id];
      if (filterTab === 'bookmarked' && !p?.bookmarked) return false;
      if (filterTab === 'mastered' && p?.status !== 'mastered') return false;
      if (filterTab === 'learning' && p?.status !== 'learning') return false;
      if (filterTab === 'confirmed' && p?.status !== 'confirmed') return false;
      if (filterTab === 'all' && p?.status === 'confirmed') return false; // 제외 단어는 '전체'에서 숨김
      if (search) {
        const q = search.toLowerCase();
        return w.word.toLowerCase().includes(q) || w.senses.some((s) => s.meaning.includes(q));
      }
      return true;
    });
  }, [search, selectedLevel, filterTab, progress]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>단어장</Text>
        <Text style={styles.headerCount}>{filtered.length}개</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="단어 검색..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Level Filter */}
      <View style={styles.levelFilter}>
        <TouchableOpacity
          style={[styles.levelChip, selectedLevel === 'all' && styles.levelChipActive]}
          onPress={() => setSelectedLevel('all')}
        >
          <Text style={[styles.levelChipText, selectedLevel === 'all' && styles.levelChipTextActive]}>전체</Text>
        </TouchableOpacity>
        {LEVELS.map((l) => (
          <TouchableOpacity
            key={l}
            style={[
              styles.levelChip,
              selectedLevel === l && { backgroundColor: LEVEL_COLORS[l], borderColor: LEVEL_COLORS[l] },
            ]}
            onPress={() => setSelectedLevel(l)}
          >
            <Text style={[styles.levelChipText, selectedLevel === l && styles.levelChipTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(Object.keys(FILTER_LABELS) as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filterTab === tab && styles.filterTabActive]}
            onPress={() => setFilterTab(tab)}
          >
            <Text style={[styles.filterTabText, filterTab === tab && styles.filterTabTextActive]}>
              {FILTER_LABELS[tab]}
              {tab === 'confirmed' && confirmedCount > 0 ? ` ${confirmedCount}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mastered banner */}
      {filterTab === 'mastered' && (
        <View style={styles.masteredBanner}>
          <Text style={styles.masteredBannerText}>
            ✅ 같은 단어를 5회 연속 정답하면 완료로 분류돼요.
          </Text>
        </View>
      )}

      {/* Confirmed banner */}
      {filterTab === 'confirmed' && (
        <View style={styles.confirmedBanner}>
          <Text style={styles.confirmedBannerText}>
            ⚡ "확실히 알아요"로 표시한 단어예요. 단어 카드의 버튼을 눌러 학습 목록에 다시 추가할 수 있어요.
          </Text>
        </View>
      )}

      {/* Word List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const p = progress[item.id];
          const isBookmarked = p?.bookmarked ?? false;
          const status = p?.status ?? 'unseen';
          const isConfirmed = status === 'confirmed';

          return (
            <View style={[styles.wordCard, SHADOWS.card, isConfirmed && styles.wordCardConfirmed]}>
              <View style={styles.wordMain}>
                <View style={styles.wordLeft}>
                  <View style={styles.wordTopRow}>
                    <Text style={styles.wordText}>{item.word}</Text>
                    <View style={[styles.levelDot, { backgroundColor: LEVEL_COLORS[item.level] }]} />
                  </View>
                  {item.senses.map((sense, i) => (
                    <View key={i} style={styles.senseRow}>
                      <Text style={styles.posText}>{POS_KR[sense.pos]}</Text>
                      <Text style={styles.meaningText}>{sense.meaning}</Text>
                    </View>
                  ))}
                  <Text style={styles.exampleText} numberOfLines={1}>"{item.example}"</Text>
                </View>
                {!isConfirmed && (
                  <TouchableOpacity onPress={() => toggleBookmark(item.id)} style={styles.bookmarkBtn}>
                    <Text style={styles.bookmarkEmoji}>{isBookmarked ? '⭐' : '☆'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.statusRow}>
                {isConfirmed ? (
                  <>
                    <View style={styles.confirmedBadge}>
                      <Text style={styles.confirmedBadgeText}>⚡ 학습 제외됨</Text>
                    </View>
                    <TouchableOpacity style={styles.restoreBtn} onPress={() => unconfirmWord(item.id)}>
                      <Text style={styles.restoreBtnText}>학습 목록에 추가</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={[
                      styles.statusBadge,
                      status === 'mastered' && styles.statusMastered,
                      status === 'learning' && styles.statusLearning,
                      status === 'unseen' && styles.statusUnseen,
                    ]}>
                      <Text style={[
                        styles.statusText,
                        status === 'mastered' && { color: COLORS.success },
                        status === 'learning' && { color: COLORS.warning },
                        status === 'unseen' && { color: COLORS.textMuted },
                      ]}>
                        {status === 'mastered' ? '✅ 완료' : status === 'learning' ? '📖 학습중' : '미학습'}
                      </Text>
                    </View>
                    {p && (
                      <Text style={styles.statsText}>맞음 {p.correctCount} / 틀림 {p.wrongCount}</Text>
                    )}
                  </>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{filterTab === 'confirmed' ? '⚡' : '🔍'}</Text>
            <Text style={styles.emptyText}>
              {filterTab === 'confirmed'
                ? '제외된 단어가 없어요.'
                : '검색 결과가 없어요.'}
            </Text>
          </View>
        }
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerCount: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  clearBtn: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  levelFilter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 10,
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
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 4,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: COLORS.border,
  },
  filterTabText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  masteredBanner: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#4CAF5010',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#4CAF5030',
  },
  masteredBannerText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  confirmedBanner: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: COLORS.accent + '10',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  confirmedBannerText: {
    fontSize: 12,
    color: COLORS.accent,
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 10,
  },
  wordCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  wordCardConfirmed: {
    opacity: 0.75,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  wordMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  wordLeft: {
    flex: 1,
    gap: 3,
  },
  wordTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  senseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 1,
  },
  posText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  meaningText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  exampleText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  bookmarkBtn: { padding: 4 },
  bookmarkEmoji: { fontSize: 20 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusMastered: { backgroundColor: COLORS.success + '15' },
  statusLearning: { backgroundColor: COLORS.warning + '15' },
  statusUnseen: { backgroundColor: COLORS.border },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  confirmedBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.accent + '15',
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  restoreBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: COLORS.primary,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, color: COLORS.textMuted },
});
