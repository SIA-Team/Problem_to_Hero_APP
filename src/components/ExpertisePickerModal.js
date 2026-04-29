import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import questionCategoryService from '../services/questionCategoryService';
import { modalTokens } from './modalTokens';

const normalizeText = (value) => (value || '').toString().trim().toLowerCase();

const normalizeCurrentValue = (currentValue = {}) => {
  const level1 = Array.isArray(currentValue?.level1) ? currentValue.level1 : [];
  const level2 = Array.isArray(currentValue?.level2) ? currentValue.level2 : [];

  const selectedLevel1Ids = level1
    .map((item) => Number(item?.id))
    .filter((id) => Number.isFinite(id) && id > 0);

  const selectedLevel2Map = {};

  level2.forEach((item) => {
    const id = Number(item?.id);
    const parentId = Number(item?.parentId);

    if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(parentId) || parentId <= 0) {
      return;
    }

    selectedLevel2Map[String(id)] = {
      id,
      name: item?.name || '',
      parentId,
      parentName: item?.parentName || '',
    };

    if (!selectedLevel1Ids.includes(parentId)) {
      selectedLevel1Ids.push(parentId);
    }
  });

  return {
    selectedLevel1Ids,
    selectedLevel2Map,
  };
};

export default function ExpertisePickerModal({
  visible,
  currentValue,
  onClose,
  onConfirm,
}) {
  const insets = useSafeAreaInsets();
  const initialTopInset = initialWindowMetrics?.insets?.top ?? 0;
  const topSafeInset = Math.max(
    insets.top || 0,
    initialTopInset,
    Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0
  );
  const [loadingLevel1, setLoadingLevel1] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [level1Categories, setLevel1Categories] = useState([]);
  const [activeLevel1Id, setActiveLevel1Id] = useState(null);
  const [level2ByParent, setLevel2ByParent] = useState({});
  const [loadingLevel2Map, setLoadingLevel2Map] = useState({});

  const [selectedLevel1Ids, setSelectedLevel1Ids] = useState([]);
  const [selectedLevel2Map, setSelectedLevel2Map] = useState({});

  const [level1Search, setLevel1Search] = useState('');
  const [level2Search, setLevel2Search] = useState('');
  const initializedSnapshotRef = useRef('');
  const loadedLevel2ParentIdsRef = useRef(new Set());

  const selectedLevel2List = useMemo(
    () => Object.values(selectedLevel2Map),
    [selectedLevel2Map]
  );

  const level1NameMap = useMemo(() => {
    const map = new Map();

    level1Categories.forEach((item) => {
      map.set(item.id, item.name);
    });

    return map;
  }, [level1Categories]);

  const selectedLevel1List = useMemo(() => {
    const selectedSet = new Set(selectedLevel1Ids);
    return level1Categories.filter((item) => selectedSet.has(item.id));
  }, [level1Categories, selectedLevel1Ids]);

  const filteredLevel1Categories = useMemo(() => {
    const keyword = normalizeText(level1Search);
    if (!keyword) {
      return level1Categories;
    }

    return level1Categories.filter((item) =>
      normalizeText(item.name).includes(keyword)
    );
  }, [level1Categories, level1Search]);

  const activeLevel2List = useMemo(() => {
    if (!activeLevel1Id) {
      return [];
    }

    const source = level2ByParent[activeLevel1Id] || [];
    const keyword = normalizeText(level2Search);

    if (!keyword) {
      return source;
    }

    return source.filter((item) => normalizeText(item.name).includes(keyword));
  }, [activeLevel1Id, level2ByParent, level2Search]);

  const activeLevel1Name = useMemo(
    () => level1NameMap.get(activeLevel1Id) || '',
    [activeLevel1Id, level1NameMap]
  );

  const loadLevel2 = useCallback(
    async (parentId) => {
      if (!parentId || loadedLevel2ParentIdsRef.current.has(parentId)) {
        return;
      }

      setLoadingLevel2Map((prev) => ({
        ...prev,
        [parentId]: true,
      }));

      try {
        const rows = await questionCategoryService.getLevel2Categories(parentId, {
          parentName: level1NameMap.get(parentId) || '',
        });

        const normalized = rows.map((item) => ({
          id: Number(item.id),
          name: item.name,
          parentId,
          parentName: item.parentName || level1NameMap.get(parentId) || '',
        }));

        setLevel2ByParent((prev) => ({
          ...prev,
          [parentId]: normalized,
        }));
        loadedLevel2ParentIdsRef.current.add(parentId);
      } catch (loadError) {
        setLevel2ByParent((prev) => ({
          ...prev,
          [parentId]: [],
        }));

        setError(loadError?.message || '加载小类失败，请稍后重试。');
      } finally {
        setLoadingLevel2Map((prev) => ({
          ...prev,
          [parentId]: false,
        }));
      }
    },
    [level1NameMap]
  );

  const currentValueSnapshot = useMemo(() => {
    const normalized = normalizeCurrentValue(currentValue);
    return JSON.stringify(normalized);
  }, [currentValue]);

  useEffect(() => {
    if (!visible) {
      initializedSnapshotRef.current = '';
      return;
    }

    if (initializedSnapshotRef.current === currentValueSnapshot) {
      return;
    }

    const normalized = JSON.parse(currentValueSnapshot);
    setSelectedLevel1Ids(normalized.selectedLevel1Ids);
    setSelectedLevel2Map(normalized.selectedLevel2Map);
    setActiveLevel1Id(normalized.selectedLevel1Ids[0] || null);
    setLevel1Search('');
    setLevel2Search('');
    setError('');
    initializedSnapshotRef.current = currentValueSnapshot;
  }, [currentValueSnapshot, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let active = true;

    const loadLevel1 = async () => {
      if (level1Categories.length > 0) {
        return;
      }

      setLoadingLevel1(true);

      try {
        const rows = await questionCategoryService.getLevel1Categories();

        if (!active) {
          return;
        }

        const normalized = rows
          .map((item) => ({
            id: Number(item.id),
            name: item.name,
          }))
          .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name);

        setLevel1Categories(normalized);

        if (!activeLevel1Id && normalized.length > 0) {
          setActiveLevel1Id(normalized[0].id);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError?.message || '加载分类失败，请稍后重试。');
      } finally {
        if (active) {
          setLoadingLevel1(false);
        }
      }
    };

    loadLevel1();

    return () => {
      active = false;
    };
  }, [visible, activeLevel1Id, level1Categories.length]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (!activeLevel1Id && level1Categories.length > 0) {
      setActiveLevel1Id(level1Categories[0].id);
      return;
    }

    if (activeLevel1Id) {
      loadLevel2(activeLevel1Id);
    }
  }, [activeLevel1Id, level1Categories, loadLevel2, visible]);

  const toggleLevel1 = (item) => {
    const categoryId = item.id;
    const exists = selectedLevel1Ids.includes(categoryId);

    if (exists) {
      const nextLevel1Ids = selectedLevel1Ids.filter((id) => id !== categoryId);
      const nextLevel2Map = { ...selectedLevel2Map };

      Object.keys(nextLevel2Map).forEach((id) => {
        if (nextLevel2Map[id]?.parentId === categoryId) {
          delete nextLevel2Map[id];
        }
      });

      setSelectedLevel1Ids(nextLevel1Ids);
      setSelectedLevel2Map(nextLevel2Map);

      if (activeLevel1Id === categoryId) {
        setActiveLevel1Id(nextLevel1Ids[0] || level1Categories[0]?.id || null);
      }

      return;
    }

    const nextLevel1Ids = [...selectedLevel1Ids, categoryId];
    setSelectedLevel1Ids(nextLevel1Ids);
    setActiveLevel1Id(categoryId);
    loadLevel2(categoryId);
  };

  const toggleLevel2 = (item) => {
    const key = String(item.id);

    if (selectedLevel2Map[key]) {
      const next = { ...selectedLevel2Map };
      delete next[key];
      setSelectedLevel2Map(next);
      return;
    }

    setSelectedLevel2Map((prev) => ({
      ...prev,
      [key]: {
        id: item.id,
        name: item.name,
        parentId: item.parentId,
        parentName: item.parentName || level1NameMap.get(item.parentId) || '',
      },
    }));

    if (!selectedLevel1Ids.includes(item.parentId)) {
      setSelectedLevel1Ids((prev) => [...prev, item.parentId]);
    }
  };

  const handleConfirm = async () => {
    if (submitting) {
      return;
    }

    const selectedLevel1Set = new Set(selectedLevel1Ids);
    const level1 = level1Categories
      .filter((item) => selectedLevel1Set.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
      }));

    const level2 = selectedLevel2List.map((item) => ({
      id: item.id,
      name: item.name,
      parentId: item.parentId,
      parentName: item.parentName || level1NameMap.get(item.parentId) || '',
    }));

    setSubmitting(true);

    try {
      await onConfirm?.({ level1, level2 });
    } finally {
      setSubmitting(false);
    }
  };

  const renderLevel1Item = ({ item }) => {
    const isActive = item.id === activeLevel1Id;
    const isSelected = selectedLevel1Ids.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.level1Item, isActive && styles.level1ItemActive]}
        onPress={() => {
          setActiveLevel1Id(item.id);
          loadLevel2(item.id);
        }}
        activeOpacity={0.8}
      >
        <Text
          style={[styles.level1ItemText, isActive && styles.level1ItemTextActive]}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        <TouchableOpacity
          style={styles.level1SelectButton}
          onPress={() => toggleLevel1(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={isSelected ? '#ef4444' : '#cbd5e1'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderLevel2Item = ({ item }) => {
    const selected = Boolean(selectedLevel2Map[String(item.id)]);

    return (
      <TouchableOpacity
        style={[styles.level2Chip, selected && styles.level2ChipSelected]}
        onPress={() => toggleLevel2(item)}
        activeOpacity={0.8}
      >
        <Text
          style={[styles.level2ChipText, selected && styles.level2ChipTextSelected]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: topSafeInset + 8 }]}>
          <TouchableOpacity onPress={onClose} disabled={submitting}>
            <Text style={styles.headerCancel}>取消</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>擅长领域</Text>
            <Text style={styles.headerSubtitle}>
              已选 {selectedLevel1List.length} 个大类 / {selectedLevel2List.length} 个小类
            </Text>
          </View>
          <TouchableOpacity onPress={handleConfirm} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color={modalTokens.danger} />
            ) : (
              <Text style={styles.headerConfirm}>保存</Text>
            )}
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {selectedLevel2List.length > 0 ? (
          <View style={styles.selectedBox}>
            <ScrollView
              style={styles.selectedScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={styles.selectedChipsWrap}>
                {selectedLevel2List.map((item) => (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={styles.selectedChip}
                    onPress={() => toggleLevel2(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectedChipText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Ionicons name="close" size={12} color="#b91c1c" />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.content}>
          <View style={styles.level1Panel}>
            <TextInput
              style={styles.searchInput}
              placeholder="搜索大类"
              placeholderTextColor="#9ca3af"
              value={level1Search}
              onChangeText={setLevel1Search}
            />

            {loadingLevel1 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#ef4444" />
              </View>
            ) : (
              <FlatList
                data={filteredLevel1Categories}
                renderItem={renderLevel1Item}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.level1List}
              />
            )}
          </View>

          <View style={styles.level2Panel}>
            <View style={styles.level2PanelHeader}>
              <Text style={styles.level2PanelTitle} numberOfLines={1}>
                {activeLevel1Name || '请选择大类'}
              </Text>

              {activeLevel1Id ? (
                <TouchableOpacity
                  style={styles.level1QuickToggle}
                  onPress={() => {
                    const activeCategory = level1Categories.find((item) => item.id === activeLevel1Id);
                    if (activeCategory) {
                      toggleLevel1(activeCategory);
                    }
                  }}
                >
                  <Ionicons
                    name={selectedLevel1Ids.includes(activeLevel1Id) ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={selectedLevel1Ids.includes(activeLevel1Id) ? '#ef4444' : '#cbd5e1'}
                  />
                  <Text style={styles.level1QuickToggleText}>选中大类</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="搜索小类"
              placeholderTextColor="#9ca3af"
              value={level2Search}
              onChangeText={setLevel2Search}
            />

            {activeLevel1Id && loadingLevel2Map[activeLevel1Id] ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#ef4444" />
              </View>
            ) : null}

            {!loadingLevel2Map[activeLevel1Id] && activeLevel2List.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>暂无可选小类</Text>
              </View>
            ) : (
              <FlatList
                data={activeLevel2List}
                renderItem={renderLevel2Item}
                keyExtractor={(item) => String(item.id)}
                numColumns={2}
                columnWrapperStyle={styles.level2Row}
                contentContainerStyle={styles.level2List}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingBottom: 10,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  headerCancel: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '600',
  },
  headerConfirm: {
    fontSize: 15,
    color: modalTokens.danger,
    fontWeight: '700',
  },
  errorText: {
    marginHorizontal: 16,
    marginTop: 10,
    color: '#b91c1c',
    fontSize: 12,
  },
  selectedBox: {
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
    maxHeight: 118,
  },
  selectedScroll: {
    flexGrow: 0,
  },
  selectedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: '100%',
  },
  selectedChipText: {
    marginRight: 6,
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
  },
  level1Panel: {
    width: 128,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e5e7eb',
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  level2Panel: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#111827',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  level1List: {
    paddingBottom: 20,
  },
  level1Item: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
    minHeight: 56,
    justifyContent: 'center',
  },
  level1ItemActive: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  level1ItemText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    paddingRight: 20,
  },
  level1ItemTextActive: {
    color: '#991b1b',
  },
  level1SelectButton: {
    position: 'absolute',
    right: 6,
    top: 6,
  },
  level2PanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  level2PanelTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  level1QuickToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  level1QuickToggleText: {
    marginLeft: 4,
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  level2List: {
    paddingBottom: 20,
  },
  level2Row: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  level2Chip: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    minHeight: 52,
    justifyContent: 'center',
  },
  level2ChipSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fff1f2',
  },
  level2ChipText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  level2ChipTextSelected: {
    color: '#991b1b',
    fontWeight: '600',
  },
});


