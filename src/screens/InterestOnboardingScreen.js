import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import questionCategoryService from '../services/questionCategoryService';
import { showToast } from '../utils/toast';

const normalizeText = (value) => (value || '').toString().trim().toLowerCase();

export default function InterestOnboardingScreen({ userId, onComplete, onSkip }) {
  const [loadingLevel1, setLoadingLevel1] = useState(true);
  const [level1Categories, setLevel1Categories] = useState([]);
  const [selectedLevel1Ids, setSelectedLevel1Ids] = useState([]);
  const [activeLevel1Id, setActiveLevel1Id] = useState(null);
  const [level2ByParent, setLevel2ByParent] = useState({});
  const [loadingLevel2Map, setLoadingLevel2Map] = useState({});
  const [selectedLevel2Map, setSelectedLevel2Map] = useState({});
  const [level1Search, setLevel1Search] = useState('');
  const [level2Search, setLevel2Search] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchLevel1 = async () => {
      setLoadingLevel1(true);

      try {
        const rows = await questionCategoryService.getLevel1Categories();

        const normalized = rows.map((item) => ({
          id: Number(item.id),
          name: item.name,
          icon: item.icon,
        }));

        if (!mounted) return;

        setLevel1Categories(normalized);
        setActiveLevel1Id((prev) => prev || normalized[0]?.id || null);
      } catch (error) {
        console.error('Failed to load level1 categories:', error);
        if (mounted) {
          showToast('Failed to load categories. Please retry later.', 'error');
        }
      } finally {
        if (mounted) {
          setLoadingLevel1(false);
        }
      }
    };

    fetchLevel1();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedLevel1List = useMemo(() => {
    const selectedSet = new Set(selectedLevel1Ids);
    return level1Categories.filter((item) => selectedSet.has(item.id));
  }, [level1Categories, selectedLevel1Ids]);

  const selectedLevel2List = useMemo(() => Object.values(selectedLevel2Map), [selectedLevel2Map]);

  const filteredLevel1Categories = useMemo(() => {
    const keyword = normalizeText(level1Search);
    if (!keyword) return level1Categories;

    return level1Categories.filter((item) => normalizeText(item.name).includes(keyword));
  }, [level1Categories, level1Search]);

  const activeLevel2List = useMemo(() => {
    if (!activeLevel1Id) return [];

    const source = level2ByParent[activeLevel1Id] || [];
    const keyword = normalizeText(level2Search);

    if (!keyword) return source;

    return source.filter((item) => normalizeText(item.name).includes(keyword));
  }, [activeLevel1Id, level2ByParent, level2Search]);

  const loadLevel2 = async (parentId) => {
    if (!parentId) return;
    if (level2ByParent[parentId]) return;

    setLoadingLevel2Map((prev) => ({
      ...prev,
      [parentId]: true,
    }));

    try {
      const rows = await questionCategoryService.getLevel2Categories(parentId);

      const parentName = level1Categories.find((item) => item.id === parentId)?.name || '';
      const normalized = rows.map((item) => ({
        id: Number(item.id),
        name: item.name,
        parentId,
        parentName,
      }));

      setLevel2ByParent((prev) => ({
        ...prev,
        [parentId]: normalized,
      }));
    } catch (error) {
      console.error('Failed to load level2 categories:', error);
      showToast('Failed to load subcategories.', 'error');
      setLevel2ByParent((prev) => ({
        ...prev,
        [parentId]: [],
      }));
    } finally {
      setLoadingLevel2Map((prev) => ({
        ...prev,
        [parentId]: false,
      }));
    }
  };

  const handleToggleLevel1 = async (category) => {
    const categoryId = category.id;

    setSelectedLevel1Ids((prev) => {
      const exists = prev.includes(categoryId);
      return exists ? prev.filter((id) => id !== categoryId) : [...prev, categoryId];
    });

    setActiveLevel1Id(categoryId);
    await loadLevel2(categoryId);
  };

  const handleSwitchActiveLevel1 = (parentId) => {
    setActiveLevel1Id(parentId);
    loadLevel2(parentId);
  };

  const handleToggleLevel2 = (category) => {
    const key = String(category.id);

    setSelectedLevel2Map((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }

      return {
        ...prev,
        [key]: {
          id: category.id,
          name: category.name,
          parentId: category.parentId,
          parentName: category.parentName,
        },
      };
    });
  };

  const handleComplete = async () => {
    if (!userId) {
      showToast('Unable to identify current user.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        userId,
        level1: selectedLevel1List.map((item) => ({
          id: item.id,
          name: item.name,
        })),
        level2: selectedLevel2List.map((item) => ({
          id: item.id,
          name: item.name,
          parentId: item.parentId,
          parentName: item.parentName,
        })),
      };

      await onComplete?.(payload);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      await onSkip?.();
    } finally {
      setSubmitting(false);
    }
  };

  const renderLevel1Card = ({ item }) => {
    const selected = selectedLevel1Ids.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.level1Card, selected && styles.level1CardSelected]}
        onPress={() => handleToggleLevel1(item)}
        activeOpacity={0.8}
      >
        <View style={styles.level1CardTitleRow}>
          <Text style={[styles.level1CardTitle, selected && styles.level1CardTitleSelected]} numberOfLines={2}>
            {item.name}
          </Text>
          {selected ? <Ionicons name="checkmark-circle" size={20} color="#ef4444" /> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose your interests</Text>
        <Text style={styles.subtitle}>
          We will use your selections to personalize question recommendations.
        </Text>
        <Text style={styles.stepText}>Choose major categories and subcategories on this page.</Text>
      </View>

      {loadingLevel1 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : null}

      {!loadingLevel1 ? (
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search major categories"
            placeholderTextColor="#9ca3af"
            value={level1Search}
            onChangeText={setLevel1Search}
          />

          <View style={styles.selectedSummaryBox}>
            <Text style={styles.selectedSummaryText}>Selected {selectedLevel1Ids.length} major categories</Text>
          </View>

          <View style={styles.level1List}>
            {filteredLevel1Categories.map((item, index) => {
              if (index % 2 === 0) {
                const nextItem = filteredLevel1Categories[index + 1];
                return (
                  <View key={`row-${item.id}`} style={styles.level1Row}>
                    {renderLevel1Card({ item })}
                    {nextItem ? renderLevel1Card({ item: nextItem }) : <View style={{ width: '48.4%' }} />}
                  </View>
                );
              }
              return null;
            })}
          </View>

          <Text style={styles.sectionTitle}>Subcategories</Text>
          <ScrollView
            horizontal
            style={styles.level1TabsScroll}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.level1Tabs}
          >
            {level1Categories.map((item) => {
              const active = item.id === activeLevel1Id;
              const selected = selectedLevel1Ids.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.level1Tab, active && styles.level1TabActive, selected && styles.level1TabSelected]}
                  onPress={() => handleSwitchActiveLevel1(item.id)}
                >
                  <Text style={[styles.level1TabText, active && styles.level1TabTextActive]}>{item.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TextInput
            style={styles.searchInput}
            placeholder="Search subcategories"
            placeholderTextColor="#9ca3af"
            value={level2Search}
            onChangeText={setLevel2Search}
          />

          <View style={styles.selectedSummaryBox}>
            <Text style={styles.selectedSummaryText}>
              Selected {selectedLevel2List.length} subcategories
            </Text>
          </View>

          {selectedLevel2List.length > 0 ? (
            <View style={styles.selectedLevel2Chips}>
              {selectedLevel2List.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.selectedLevel2Chip}
                  onPress={() => handleToggleLevel2(item)}
                >
                  <Text style={styles.selectedLevel2ChipText}>{item.name}</Text>
                  <Ionicons name="close" size={14} color="#ef4444" />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {activeLevel1Id && loadingLevel2Map[activeLevel1Id] ? (
            <View style={styles.loadingBoxSmall}>
              <ActivityIndicator size="small" color="#ef4444" />
              <Text style={styles.loadingTextSmall}>Loading subcategories...</Text>
            </View>
          ) : null}

          <View style={styles.level2ListContent}>
            {activeLevel2List.map((item) => {
              const selected = Boolean(selectedLevel2Map[String(item.id)]);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.level2Chip, selected && styles.level2ChipSelected]}
                  onPress={() => handleToggleLevel2(item)}
                >
                  <Text style={[styles.level2ChipText, selected && styles.level2ChipTextSelected]}>{item.name}</Text>
                </TouchableOpacity>
              );
            })}

            {!activeLevel1Id ? (
              <Text style={styles.emptyText}>No major categories available.</Text>
            ) : null}

            {activeLevel1Id && !loadingLevel2Map[activeLevel1Id] && activeLevel2List.length === 0 ? (
              <Text style={styles.emptyText}>No subcategories found.</Text>
            ) : null}
          </View>
        </ScrollView>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={submitting}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleComplete} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Start using app</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
  },
  progressRow: {
    marginTop: 14,
    alignItems: 'center',
    flexDirection: 'row',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d1d5db',
  },
  progressDotActive: {
    backgroundColor: '#ef4444',
  },
  progressLine: {
    marginHorizontal: 6,
    height: 2,
    width: 56,
    backgroundColor: '#e5e7eb',
  },
  progressLineActive: {
    backgroundColor: '#ef4444',
  },
  stepText: {
    marginTop: 12,
    fontSize: 12,
    color: '#6b7280',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  selectedSummaryBox: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
  },
  selectedSummaryText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
  },
  level1List: {
    paddingBottom: 6,
  },
  level1Row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  sectionTitle: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  level1Card: {
    width: '48.4%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
    minHeight: 84,
    justifyContent: 'space-between',
  },
  level1CardSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  level1CardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  level1CardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  level1CardTitleSelected: {
    color: '#991b1b',
  },
  level1Tabs: {
    gap: 10,
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 2,
  },
  level1TabsScroll: {
    flexGrow: 0,
  },
  level1Tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  level1TabActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  level1TabSelected: {
    borderColor: '#fca5a5',
  },
  level1TabText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  level1TabTextActive: {
    color: '#991b1b',
  },
  selectedLevel2Chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
    marginBottom: 10,
  },
  selectedLevel2Chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignSelf: 'flex-start',
  },
  selectedLevel2ChipText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '600',
  },
  level2ListContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
  },
  level2Chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  level2ChipSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  level2ChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  level2ChipTextSelected: {
    color: '#991b1b',
    fontWeight: '600',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingBoxSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  loadingTextSmall: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
