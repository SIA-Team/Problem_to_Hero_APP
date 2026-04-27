import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import occupationApi from '../services/api/occupationApi';
import { modalTokens } from './modalTokens';

const OCCUPATION_TREE_CACHE_TTL = 30 * 60 * 1000;
const MAX_CUSTOM_OCCUPATION_LENGTH = 30;
const MAX_CUSTOM_DESCRIPTION_LENGTH = 120;
const SEARCH_RESULT_LIMIT = 50;

let occupationPickerCache = null;
let occupationPickerCacheTime = 0;
let occupationPickerRequest = null;

const toArray = (value) => (Array.isArray(value) ? value : []);

const getNodeLabel = (node) => {
  if (!node) {
    return '';
  }

  return (
    node.nameCn ||
    node.name ||
    node.label ||
    node.title ||
    node.occupationName ||
    node.professionName ||
    ''
  )
    .toString()
    .trim();
};

const getNodeDescription = (node) =>
  (
    node?.description ||
    node?.desc ||
    node?.remark ||
    node?.summary ||
    ''
  )
    .toString()
    .trim();

const getNodePathNames = (node) => {
  if (!node) {
    return [];
  }

  const pathSource =
    node.pathNamesCn ||
    node.pathNames ||
    node.path ||
    node.fullPathNames ||
    node.parentPathNames ||
    [];

  if (Array.isArray(pathSource)) {
    return pathSource
      .filter(Boolean)
      .map((item) => item.toString().trim())
      .filter(Boolean);
  }

  if (typeof pathSource === 'string') {
    return pathSource
      .split(/[/>|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const getNodeChildren = (node) =>
  toArray(
    node?.children ||
      node?.child ||
      node?.childList ||
      node?.childrenList ||
      node?.subList ||
      node?.subTree ||
      node?.subCategories ||
      node?.categoryList ||
      node?.occupationChildren ||
      node?.items ||
      node?.nodes ||
      node?.occupationList
  );

const getNodeCacheKey = (node, index = 0) =>
  `${node?.id || node?.code || node?.label || 'occupation-node'}-${index}`;

const normalizeLookupValue = (value) => (value || '').trim();

const formatPathText = (pathNames, fallback = '职业') => {
  const safePathNames = toArray(pathNames).filter(Boolean);
  return safePathNames.length > 0 ? safePathNames.join(' / ') : fallback;
};

const normalizeNodes = (nodes = []) =>
  toArray(nodes)
    .map((node) => {
      const label = getNodeLabel(node);
      const children = normalizeNodes(getNodeChildren(node));
      const childCount = Number(node?.childCount ?? children.length ?? 0);

      if (!label && children.length === 0) {
        return null;
      }

      return {
        ...node,
        label,
        description: getNodeDescription(node),
        selectable: node.selectable !== false || childCount <= 0,
        pathNamesCn: getNodePathNames(node),
        children,
      };
    })
    .filter(Boolean);

const extractOccupationNodes = (response) => {
  const responseData = response?.data;

  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (!responseData || typeof responseData !== 'object') {
    return [];
  }

  return toArray(
    responseData.nodes ||
      responseData.list ||
      responseData.rows ||
      responseData.tree ||
      responseData.data ||
      responseData.items
  );
};

const analyzePickerMode = (nodes) => {
  let maxDepth = 0;
  let hasChildren = false;

  const walk = (items, depth) => {
    if (!items.length) {
      return;
    }

    maxDepth = Math.max(maxDepth, depth);

    items.forEach((item) => {
      if (item.children.length > 0) {
        hasChildren = true;
        walk(item.children, depth + 1);
      }
    });
  };

  walk(nodes, 1);
  return hasChildren || maxDepth > 1 ? 'cascade' : 'single';
};

const buildSelectionIndex = (nodes) => {
  const selectionIndex = new Map();

  const walk = (items, ancestors = []) => {
    items.forEach((node) => {
      const pathNames = Array.isArray(node.pathNamesCn)
        ? node.pathNamesCn.filter(Boolean)
        : [];
      const lookupValues = [node.label, pathNames[pathNames.length - 1]];

      lookupValues.forEach((value) => {
        const key = normalizeLookupValue(value);

        if (key && !selectionIndex.has(key)) {
          selectionIndex.set(key, {
            node,
            ancestors,
          });
        }
      });

      if (node.children.length > 0) {
        walk(node.children, [...ancestors, node]);
      }
    });
  };

  walk(nodes);
  return selectionIndex;
};

const buildSearchIndex = (nodes) => {
  const searchIndex = [];

  const walk = (items, ancestors = []) => {
    items.forEach((node) => {
      const fallbackPathNames = [
        ...ancestors.map((item) => item.label).filter(Boolean),
        node.label,
      ].filter(Boolean);
      const pathNames = toArray(node.pathNamesCn).filter(Boolean);
      const resolvedPathNames =
        pathNames.length > 0 ? pathNames : fallbackPathNames;
      const pathText = formatPathText(resolvedPathNames);
      const searchableText = [
        node.label,
        node.description,
        pathText,
        resolvedPathNames.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      searchIndex.push({
        node,
        ancestors,
        pathNames: resolvedPathNames,
        pathText,
        searchableText,
      });

      if (node.children.length > 0) {
        walk(node.children, [...ancestors, node]);
      }
    });
  };

  walk(nodes);
  return searchIndex;
};

const buildPickerDataset = (rawNodes = []) => {
  const normalizedNodes = normalizeNodes(rawNodes);

  return {
    nodes: normalizedNodes,
    pickerMode: analyzePickerMode(normalizedNodes),
    selectionIndex: buildSelectionIndex(normalizedNodes),
    searchIndex: buildSearchIndex(normalizedNodes),
  };
};

const hasFreshOccupationPickerCache = () =>
  Boolean(
    occupationPickerCache &&
      Date.now() - occupationPickerCacheTime < OCCUPATION_TREE_CACHE_TTL
  );

const getCachedOccupationPickerData = ({ includeStale = false } = {}) => {
  if (!occupationPickerCache) {
    return null;
  }

  if (includeStale || hasFreshOccupationPickerCache()) {
    return occupationPickerCache;
  }

  return null;
};

const setOccupationPickerCache = (dataset) => {
  occupationPickerCache = dataset;
  occupationPickerCacheTime = Date.now();
  return dataset;
};

const fetchOccupationPickerData = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh) {
    const cachedDataset = getCachedOccupationPickerData();

    if (cachedDataset) {
      return cachedDataset;
    }
  }

  if (occupationPickerRequest) {
    return occupationPickerRequest;
  }

  occupationPickerRequest = occupationApi
    .getOccupationTree()
    .then((response) => {
      if (response?.code !== 200) {
        throw new Error(response?.msg || '获取职业数据失败');
      }

      const rawNodes = extractOccupationNodes(response);
      return setOccupationPickerCache(buildPickerDataset(rawNodes));
    })
    .finally(() => {
      occupationPickerRequest = null;
    });

  return occupationPickerRequest;
};

const findSelectionByValue = (dataset, currentValue) =>
  dataset?.selectionIndex.get(normalizeLookupValue(currentValue)) || null;

const isSameNode = (leftNode, rightNode) => {
  if (!leftNode || !rightNode) {
    return false;
  }

  if (leftNode.id != null && rightNode.id != null) {
    return leftNode.id === rightNode.id;
  }

  if (leftNode.code && rightNode.code) {
    return leftNode.code === rightNode.code;
  }

  return leftNode.label === rightNode.label;
};

const getFriendlyErrorMessage = (message) => {
  if (!message) {
    return '职业数据暂时不可用，请稍后重试。';
  }

  if (message.includes('No static resource')) {
    return '职业接口尚未部署到当前服务器。';
  }

  if (message.includes("doesn't exist")) {
    return '职业数据表尚未初始化。';
  }

  return message;
};

const buildPresetSelection = (node, ancestors = []) => {
  const normalizedAncestors = toArray(ancestors).filter(Boolean);
  const fallbackPathNames = [
    ...normalizedAncestors.map((item) => item.label).filter(Boolean),
    node?.label,
  ].filter(Boolean);
  const fullPathNames = toArray(node?.pathNamesCn).filter(Boolean);
  const resolvedPathNames =
    fullPathNames.length > 0 ? fullPathNames : fallbackPathNames;
  const attachPathNames = resolvedPathNames.slice(0, -1);
  const parentNode =
    normalizedAncestors.length > 0
      ? normalizedAncestors[normalizedAncestors.length - 1]
      : null;

  return {
    source: 'occupation-picker',
    type: 'preset',
    isCustom: false,
    value: node?.label || '',
    label: node?.label || '',
    displayValue: node?.label || '',
    fullPathNames: resolvedPathNames,
    fullPathText: formatPathText(resolvedPathNames),
    attachPathNames,
    attachPathText: formatPathText(attachPathNames),
    mountDepth: attachPathNames.length,
    customDepth: resolvedPathNames.length,
    parentId: parentNode?.id ?? null,
    parentCode: parentNode?.code ?? null,
    parentName: parentNode?.label ?? null,
    selectedNodeId: node?.id ?? null,
    selectedNodeCode: node?.code ?? null,
    selectedNode: node || null,
  };
};

const buildCustomSelection = ({ customName, browsePath = [] }) => {
  const trimmedName = (customName || '').trim();
  const attachPathNames = toArray(browsePath)
    .map((item) => item?.label)
    .filter(Boolean);
  const parentNode =
    browsePath.length > 0 ? browsePath[browsePath.length - 1] : null;
  const fullPathNames = trimmedName
    ? [...attachPathNames, trimmedName]
    : [...attachPathNames];

  return {
    source: 'occupation-picker',
    type: 'custom',
    isCustom: true,
    value: trimmedName,
    label: trimmedName,
    displayValue: trimmedName,
    customName: trimmedName,
    fullPathNames,
    fullPathText: formatPathText(fullPathNames),
    attachPathNames,
    attachPathText: formatPathText(attachPathNames),
    mountDepth: attachPathNames.length,
    customDepth: attachPathNames.length + 1,
    parentId: parentNode?.id ?? null,
    parentCode: parentNode?.code ?? null,
    parentName: parentNode?.label ?? null,
    selectedNodeId: null,
    selectedNodeCode: null,
    selectedNode: null,
  };
};

const OccupationSearchResultItem = React.memo(function OccupationSearchResultItem({
  item,
  isSelected,
  onPress,
}) {
  const hasChildren = item.node.children.length > 0;

  return (
    <TouchableOpacity
      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
    >
      <View style={styles.optionMain}>
        <Text
          style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}
        >
          {item.node.label}
        </Text>
        <Text style={styles.searchResultPath} numberOfLines={1}>
          {item.pathText}
        </Text>
        {item.node.description ? (
          <Text style={styles.optionDescription} numberOfLines={2}>
            {item.node.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.optionRight}>
        {hasChildren ? (
          <View style={styles.optionTag}>
            <Text style={styles.optionTagText}>进入分类</Text>
          </View>
        ) : null}
        {isSelected ? (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={modalTokens.danger}
          />
        ) : (
          <Ionicons
            name={hasChildren ? 'chevron-forward' : 'ellipse-outline'}
            size={hasChildren ? 18 : 16}
            color={modalTokens.textMuted}
          />
        )}
      </View>
    </TouchableOpacity>
  );
});

const OccupationOptionItem = React.memo(
  function OccupationOptionItem({
    node,
    isSelected,
    pickerMode,
    onPress,
  }) {
    const hasChildren = pickerMode === 'cascade' && node.children.length > 0;
    const showSelectableBadge = !hasChildren && node.selectable && !isSelected;

    return (
      <TouchableOpacity
        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
        activeOpacity={0.7}
        onPress={() => onPress(node)}
      >
        <View style={styles.optionMain}>
          <Text
            style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}
          >
            {node.label}
          </Text>
          {node.description ? (
            <Text style={styles.optionDescription} numberOfLines={2}>
              {node.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.optionRight}>
          {hasChildren ? (
            <View style={styles.optionTag}>
              <Text style={styles.optionTagText}>继续选择</Text>
            </View>
          ) : null}
          {showSelectableBadge ? (
            <View style={styles.optionTagSelectable}>
              <Text style={styles.optionTagSelectableText}>可选</Text>
            </View>
          ) : null}
          {isSelected ? (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={modalTokens.danger}
            />
          ) : null}
          {hasChildren ? (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={modalTokens.textMuted}
            />
          ) : null}
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) =>
    prevProps.node === nextProps.node &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.pickerMode === nextProps.pickerMode
);

export const warmOccupationPickerData = () =>
  fetchOccupationPickerData().catch(() => null);

export default function OccupationPickerModal({
  visible,
  currentValue = '',
  onClose,
  onConfirm,
  onSubmitCustomOccupation,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEmptyResult, setIsEmptyResult] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [searchIndex, setSearchIndex] = useState([]);
  const [pickerMode, setPickerMode] = useState('single');
  const [browsePath, setBrowsePath] = useState([]);
  const [activeMode, setActiveMode] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customTouched, setCustomTouched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [customSubmitError, setCustomSubmitError] = useState('');
  const [customSubmitSuccess, setCustomSubmitSuccess] = useState('');
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const [shouldRenderCustomEditor, setShouldRenderCustomEditor] = useState(false);
  const customPanelAnimation = useRef(new Animated.Value(0)).current;
  const customAutoCollapseTimerRef = useRef(null);

  const applyPickerDataset = (dataset, value) => {
    const matchedSelection = findSelectionByValue(dataset, value);
    const normalizedValue = normalizeLookupValue(value);

    setNodes(dataset.nodes);
    setSearchIndex(dataset.searchIndex || []);
    setPickerMode(dataset.pickerMode);
    setIsEmptyResult(dataset.nodes.length === 0);
    setCustomTouched(false);
    setSearchQuery('');
    setCustomSubmitError('');
    setCustomSubmitSuccess('');
    setIsCustomExpanded(false);
    setCustomDescription('');

    if (matchedSelection?.node) {
      setBrowsePath(matchedSelection.ancestors || []);
      setSelectedPreset(
        buildPresetSelection(
          matchedSelection.node,
          matchedSelection.ancestors || []
        )
      );
      setActiveMode('preset');
      setCustomName('');
      return;
    }

    setSelectedPreset(null);

    if (normalizedValue) {
      setBrowsePath([]);
      setActiveMode('custom');
      setCustomName(normalizedValue);
      return;
    }

    setBrowsePath([]);
    setActiveMode(null);
    setCustomName('');
  };

  const loadOccupationTree = async (active = true) => {
    setError('');

    const cachedDataset = getCachedOccupationPickerData({ includeStale: true });

    if (cachedDataset) {
      applyPickerDataset(cachedDataset, currentValue);
      setLoading(false);

      if (hasFreshOccupationPickerCache()) {
        return;
      }
    } else {
      setLoading(true);
      setIsEmptyResult(false);
    }

    try {
      const dataset = await fetchOccupationPickerData({
        forceRefresh: Boolean(cachedDataset),
      });

      if (!active) {
        return;
      }

      applyPickerDataset(dataset, currentValue);
    } catch (loadError) {
      if (!active) {
        return;
      }

      if (cachedDataset) {
        return;
      }

      setNodes([]);
      setSearchIndex([]);
      setSelectedPreset(null);
      setActiveMode(null);
      setBrowsePath([]);
      setCustomName('');
      setCustomTouched(false);
      setCustomSubmitError('');
      setCustomSubmitSuccess('');
      setIsCustomExpanded(false);
      setCustomDescription('');
      setIsEmptyResult(false);
      setError(
        getFriendlyErrorMessage(
          loadError?.message || loadError?.data?.msg || ''
        )
      );
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    let active = true;
    loadOccupationTree(active);

    return () => {
      active = false;
    };
  }, [visible, currentValue]);

  useEffect(() => {
    if (customAutoCollapseTimerRef.current) {
      clearTimeout(customAutoCollapseTimerRef.current);
      customAutoCollapseTimerRef.current = null;
    }

    if (isCustomExpanded) {
      setShouldRenderCustomEditor(true);
      Animated.timing(customPanelAnimation, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return undefined;
    }

    Animated.timing(customPanelAnimation, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setShouldRenderCustomEditor(false);
      }
    });

    return undefined;
  }, [customPanelAnimation, isCustomExpanded]);

  useEffect(
    () => () => {
      if (customAutoCollapseTimerRef.current) {
        clearTimeout(customAutoCollapseTimerRef.current);
      }
    },
    []
  );

  const currentNodes = useMemo(() => {
    if (pickerMode === 'single') {
      return nodes;
    }

    return browsePath.length > 0
      ? browsePath[browsePath.length - 1].children || []
      : nodes;
  }, [browsePath, nodes, pickerMode]);

  const trimmedSearchQuery = searchQuery.trim();
  const isSearching = trimmedSearchQuery.length > 0;

  const listRenderKey = useMemo(() => {
    const pathKey = browsePath
      .map((item, index) => item?.id || item?.code || item?.label || `level-${index}`)
      .join('-');

    return `${pickerMode}-${pathKey || 'root'}-${currentNodes.length}-${trimmedSearchQuery}`;
  }, [browsePath, currentNodes.length, pickerMode, trimmedSearchQuery]);

  const currentSearchResults = useMemo(() => {
    if (!trimmedSearchQuery) {
      return [];
    }

    const normalizedQuery = trimmedSearchQuery.toLowerCase();

    return searchIndex
      .filter((item) => item.searchableText.includes(normalizedQuery))
      .slice(0, SEARCH_RESULT_LIMIT);
  }, [searchIndex, trimmedSearchQuery]);

  const currentCustomSelection = useMemo(() => {
    const selection = buildCustomSelection({ customName, browsePath });

    return {
      ...selection,
      customName: selection.customName,
      description: customDescription.trim(),
    };
  }, [browsePath, customDescription, customName]);

  const currentSelection = useMemo(() => {
    if (activeMode === 'custom') {
      return currentCustomSelection.value ? currentCustomSelection : null;
    }

    if (activeMode === 'preset') {
      return selectedPreset;
    }

    return null;
  }, [activeMode, currentCustomSelection, selectedPreset]);

  const customNameError = useMemo(() => {
    const trimmedName = customName.trim();

    if (activeMode !== 'custom') {
      return '';
    }

    if (!trimmedName) {
      return customTouched ? '请输入自定义职业名称' : '';
    }

    if (trimmedName.length > MAX_CUSTOM_OCCUPATION_LENGTH) {
      return `最多输入 ${MAX_CUSTOM_OCCUPATION_LENGTH} 个字符`;
    }

    return '';
  }, [activeMode, customName, customTouched]);

  const canConfirm = useMemo(() => {
    if (activeMode === 'preset') {
      return Boolean(selectedPreset?.value);
    }

    return false;
  }, [activeMode, selectedPreset]);

  const canSubmitCustom = useMemo(() => {
    if (activeMode !== 'custom') {
      return false;
    }

    const trimmedName = customName.trim();
    return (
      Boolean(trimmedName) &&
      trimmedName.length <= MAX_CUSTOM_OCCUPATION_LENGTH &&
      !customNameError &&
      !isSubmittingCustom
    );
  }, [activeMode, customName, customNameError, isSubmittingCustom]);

  const handleSelectNode = (node) => {
    setSelectedPreset(buildPresetSelection(node, browsePath));
    setActiveMode('preset');
    setIsCustomExpanded(false);

    if (pickerMode === 'cascade' && node.children.length > 0) {
      setBrowsePath((prev) => [...prev, node]);
    }
  };

  const handleOpenCustomEditor = () => {
    setSearchQuery('');
    setActiveMode('custom');
    setCustomTouched(false);
    setCustomSubmitError('');
    setCustomSubmitSuccess('');
    setIsCustomExpanded(true);
  };

  const handleToggleCustomSection = () => {
    if (isCustomExpanded) {
      setIsCustomExpanded(false);
      return;
    }

    handleOpenCustomEditor();
  };

  const handleChangeCustomName = (text) => {
    setCustomName(text);
    setCustomTouched(true);
    setCustomSubmitError('');
    setCustomSubmitSuccess('');

    if (activeMode !== 'custom') {
      setActiveMode('custom');
    }
  };

  const handleChangeCustomDescription = (text) => {
    setCustomDescription(text);
    setCustomSubmitError('');
    setCustomSubmitSuccess('');

    if (activeMode !== 'custom') {
      setActiveMode('custom');
    }
  };

  const handleConfirm = () => {
    if (!canConfirm || !currentSelection) {
      if (activeMode === 'custom') {
        setCustomTouched(true);
      }
      return;
    }

    onConfirm(currentSelection);
  };

  const handleSubmitCustomOccupation = async () => {
    if (!canSubmitCustom) {
      setCustomTouched(true);
      return;
    }

    const requestPayload = {
      ...currentCustomSelection,
      requestType: 'custom-occupation-application',
      reviewStatus: 'pending',
    };

    setIsSubmittingCustom(true);
    setCustomSubmitError('');

    try {
      const result = onSubmitCustomOccupation
        ? await onSubmitCustomOccupation(requestPayload)
        : { message: '申请已提交，审核通过后才可使用该职业。' };

      setCustomSubmitSuccess(
        result?.message || '申请已提交，审核通过后才可使用该职业。'
      );
      setCustomName('');
      setCustomDescription('');
      setCustomTouched(false);
      setSearchQuery('');
      customAutoCollapseTimerRef.current = setTimeout(() => {
        setIsCustomExpanded(false);
      }, 900);
    } catch (submitError) {
      setCustomSubmitError(
        submitError?.message || '提交申请失败，请稍后重试。'
      );
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleSearchResultPress = (item) => {
    setSelectedPreset(buildPresetSelection(item.node, item.ancestors));
    setActiveMode('preset');
    setSearchQuery('');
    setIsCustomExpanded(false);

    if (pickerMode === 'cascade' && item.node.children.length > 0) {
      setBrowsePath([...item.ancestors, item.node]);
      return;
    }

    setBrowsePath(item.ancestors || []);
  };

  const renderBreadcrumb = () => {
    if (pickerMode !== 'cascade' || isSearching) {
      return null;
    }

    return (
      <View style={styles.breadcrumbContainer}>
        {browsePath.length > 0 ? (
          <TouchableOpacity
            style={styles.breadcrumbBackButton}
            onPress={() => setBrowsePath((prev) => prev.slice(0, -1))}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chevron-back"
              size={16}
              color={modalTokens.textSecondary}
            />
            <Text style={styles.breadcrumbBackText}>上一级</Text>
          </TouchableOpacity>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breadcrumbContent}
          style={styles.breadcrumbScroll}
        >
          <TouchableOpacity
            style={styles.breadcrumbItem}
            onPress={() => setBrowsePath([])}
          >
            <Text
              style={[
                styles.breadcrumbText,
                browsePath.length === 0 && styles.breadcrumbTextActive,
              ]}
            >
              职业
            </Text>
          </TouchableOpacity>

          {browsePath.map((item, index) => (
            <React.Fragment key={getNodeCacheKey(item, index)}>
              <View style={styles.breadcrumbSeparator}>
                <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
              </View>
              <TouchableOpacity
                style={styles.breadcrumbItem}
                onPress={() => setBrowsePath(browsePath.slice(0, index + 1))}
              >
                <Text
                  style={[
                    styles.breadcrumbText,
                    index === browsePath.length - 1 &&
                      styles.breadcrumbTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderCustomComposer = () => {
    const attachPathText = currentCustomSelection.attachPathText;
    const customSummaryText = customSubmitSuccess
      ? customSubmitSuccess
      : isCustomExpanded
        ? `挂载到：${attachPathText}`
        : '未找到合适职业时，可提交审核新增';
    const customStatusText = customSubmitSuccess ? '审核中' : '需审核';

    return (
      <View style={styles.customSection}>
        <TouchableOpacity
          style={[
            styles.customSummaryRow,
            isCustomExpanded && styles.customSummaryRowExpanded,
          ]}
          activeOpacity={0.85}
          onPress={handleToggleCustomSection}
        >
          <View style={styles.customSummaryMain}>
            <View style={styles.customSummaryTitleRow}>
              <Text style={styles.customSummaryTitle}>申请自定义职业</Text>
              <View
                style={[
                  styles.customSummaryBadge,
                  customSubmitSuccess && styles.customSummaryBadgePending,
                ]}
              >
                <Text
                  style={[
                    styles.customSummaryBadgeText,
                    customSubmitSuccess && styles.customSummaryBadgeTextPending,
                  ]}
                >
                  {customStatusText}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.customSummaryText,
                customSubmitSuccess && styles.customSummaryTextSuccess,
              ]}
              numberOfLines={isCustomExpanded ? 2 : 1}
            >
              {customSummaryText}
            </Text>
          </View>
          <Ionicons
            name={isCustomExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={modalTokens.textMuted}
          />
        </TouchableOpacity>

        {shouldRenderCustomEditor ? (
          <Animated.View
            style={[
              styles.customEditor,
              {
                opacity: customPanelAnimation,
                maxHeight: customPanelAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 430],
                }),
                transform: [
                  {
                    translateY: customPanelAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.customAttachText}>挂载到：{attachPathText}</Text>
            <Text style={styles.customReviewText}>
              自定义职业需要先提交审核，审核通过后才会加入可选职业，当前职业不会立即变更。
            </Text>

            <TextInput
              style={[
                styles.customInput,
                customNameError && styles.customInputError,
              ]}
              value={customName}
              onChangeText={handleChangeCustomName}
              placeholder="请输入自定义职业名称"
              placeholderTextColor="#94a3b8"
              maxLength={MAX_CUSTOM_OCCUPATION_LENGTH}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleSubmitCustomOccupation}
              editable={!isSubmittingCustom}
            />

            <View style={styles.customMetaRow}>
              <Text
                style={[
                  styles.customHintText,
                  customNameError && styles.customHintTextError,
                ]}
              >
                {customNameError || '请尽量使用清晰、通用的职业名称，便于审核通过。'}
              </Text>
              <Text style={styles.customCountText}>
                {customName.length}/{MAX_CUSTOM_OCCUPATION_LENGTH}
              </Text>
            </View>

            <View style={styles.customDescriptionHeader}>
              <Text style={styles.customDescriptionLabel}>补充说明</Text>
              <Text style={styles.customDescriptionOptional}>选填</Text>
            </View>

            <TextInput
              style={styles.customDescriptionInput}
              value={customDescription}
              onChangeText={handleChangeCustomDescription}
              placeholder="可补充该职业的工作内容、适用场景，或说明为什么建议挂载到当前分类"
              placeholderTextColor="#94a3b8"
              maxLength={MAX_CUSTOM_DESCRIPTION_LENGTH}
              multiline
              textAlignVertical="top"
              editable={!isSubmittingCustom}
            />

            <View style={styles.customDescriptionMetaRow}>
              <Text style={styles.customDescriptionHint}>
                建议用 1-2 句话说明，能帮助审核更快理解你的申请。
              </Text>
              <Text style={styles.customDescriptionCountText}>
                {customDescription.length}/{MAX_CUSTOM_DESCRIPTION_LENGTH}
              </Text>
            </View>

            {customSubmitError ? (
              <Text style={styles.customSubmitErrorText}>{customSubmitError}</Text>
            ) : null}

            {customSubmitSuccess ? (
              <View style={styles.customSuccessCard}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={modalTokens.textSecondary}
                />
                <View style={styles.customSuccessContent}>
                  <Text style={styles.customSuccessTitle}>申请已提交</Text>
                  <Text style={styles.customSuccessText}>{customSubmitSuccess}</Text>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.customSubmitButton,
                (!canSubmitCustom || isSubmittingCustom) &&
                  styles.customSubmitButtonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handleSubmitCustomOccupation}
              disabled={!canSubmitCustom || isSubmittingCustom}
            >
              {isSubmittingCustom ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.customSubmitButtonText}>提交职业申请</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </View>
    );
  };

  const renderSearchBar = () => (
    <View style={styles.searchSection}>
      <View style={styles.searchBox}>
        <Ionicons
          name="search-outline"
          size={16}
          color={modalTokens.textMuted}
        />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="搜索职业名称"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="close-circle"
              size={16}
              color={modalTokens.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={modalTokens.danger} />
          <Text style={styles.stateTitle}>正在加载职业数据</Text>
          <Text style={styles.stateText}>请稍候...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={40}
            color={modalTokens.textMuted}
          />
          <Text style={styles.stateTitle}>职业接口请求失败</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.8}
            onPress={() => loadOccupationTree(true)}
          >
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        key={listRenderKey}
        style={styles.optionList}
        contentContainerStyle={styles.optionListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!isSearching ? renderCustomComposer() : null}

        {isEmptyResult && currentNodes.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons
              name="briefcase-outline"
              size={32}
              color={modalTokens.textMuted}
            />
            <Text style={styles.stateCardTitle}>没有可选职业</Text>
          </View>
        ) : null}

        {isSearching ? (
          currentSearchResults.length > 0 ? (
            <>
              <View style={styles.searchResultHeader}>
                <Text style={styles.searchResultHeaderText}>搜索结果</Text>
                <Text style={styles.searchResultCountText}>
                  {currentSearchResults.length} 项
                </Text>
              </View>
              {currentSearchResults.map((item, index) => (
                <OccupationSearchResultItem
                  key={getNodeCacheKey(item.node, index)}
                  item={item}
                  isSelected={
                    activeMode === 'preset' &&
                    isSameNode(selectedPreset?.selectedNode, item.node)
                  }
                  onPress={handleSearchResultPress}
                />
              ))}
            </>
          ) : (
            <View style={styles.searchEmptyContainer}>
              <Ionicons
                name="search-outline"
                size={28}
                color={modalTokens.textMuted}
              />
              <Text style={styles.searchEmptyTitle}>没有找到匹配的职业</Text>
              <Text style={styles.searchEmptyText}>
                你可以换个关键词，或直接添加自定义职业。
              </Text>
              <TouchableOpacity
                style={styles.searchEmptyAction}
                activeOpacity={0.8}
                onPress={handleOpenCustomEditor}
              >
                <Text style={styles.searchEmptyActionText}>申请自定义职业</Text>
              </TouchableOpacity>
            </View>
          )
        ) : currentNodes.length > 0 ? (
          currentNodes.map((item, index) => (
            <OccupationOptionItem
              key={getNodeCacheKey(item, index)}
              node={item}
              isSelected={
                activeMode === 'preset' &&
                isSameNode(selectedPreset?.selectedNode, item)
              }
              pickerMode={pickerMode}
              onPress={handleSelectNode}
            />
          ))
        ) : browsePath.length > 0 ? (
          <View style={styles.emptyLevelContainer}>
            <Text style={styles.emptyLevelText}>
              当前分类下暂无可继续选择的职业项，你可以直接提交自定义职业。
            </Text>
          </View>
          ) : null}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modal}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={modalTokens.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>选择职业</Text>
            <TouchableOpacity
              onPress={handleConfirm}
              style={styles.headerButton}
              disabled={!canConfirm}
            >
              <Text
                style={[
                  styles.confirmText,
                  !canConfirm && styles.confirmTextDisabled,
                ]}
              >
                确定
              </Text>
            </TouchableOpacity>
          </View>

          {activeMode === 'preset' && currentSelection?.fullPathNames?.length ? (
            <View style={styles.selectionBar}>
              <Text style={styles.selectionLabel}>已选择</Text>
              <Text style={styles.selectionValue} numberOfLines={2}>
                {currentSelection.fullPathText}
              </Text>
            </View>
          ) : null}

          {renderSearchBar()}
          {renderBreadcrumb()}
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    height: '82%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
  },
  headerButton: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: modalTokens.danger,
  },
  confirmTextDisabled: {
    color: modalTokens.textMuted,
  },
  selectionBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: modalTokens.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
  },
  selectionLabel: {
    fontSize: 12,
    color: modalTokens.textSecondary,
    marginBottom: 4,
  },
  selectionValue: {
    fontSize: 14,
    color: modalTokens.textPrimary,
    lineHeight: 20,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
    backgroundColor: modalTokens.surface,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 0,
    fontSize: 14,
    color: modalTokens.textPrimary,
  },
  breadcrumbBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
    marginRight: 8,
  },
  breadcrumbBackText: {
    fontSize: 13,
    color: modalTokens.textSecondary,
    marginLeft: 2,
  },
  breadcrumbScroll: {
    flex: 1,
  },
  breadcrumbContent: {
    alignItems: 'center',
  },
  breadcrumbItem: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  breadcrumbSeparator: {
    paddingHorizontal: 2,
  },
  breadcrumbText: {
    fontSize: 14,
    color: modalTokens.textMuted,
  },
  breadcrumbTextActive: {
    color: modalTokens.danger,
    fontWeight: '600',
  },
  optionList: {
    flex: 1,
  },
  optionListContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  customSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#fff',
  },
  customSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  customSummaryRowExpanded: {
    paddingBottom: 8,
  },
  customSummaryMain: {
    flex: 1,
    paddingRight: 12,
  },
  customSummaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customSummaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  customSummaryBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  customSummaryBadgePending: {
    backgroundColor: '#fef3c7',
  },
  customSummaryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: modalTokens.textSecondary,
  },
  customSummaryBadgeTextPending: {
    color: '#b45309',
  },
  customSummaryText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: modalTokens.textSecondary,
  },
  customSummaryTextSuccess: {
    color: modalTokens.textPrimary,
  },
  customEditor: {
    marginTop: 2,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eceff3',
    overflow: 'hidden',
  },
  customAttachText: {
    fontSize: 12,
    lineHeight: 18,
    color: modalTokens.textSecondary,
  },
  customReviewText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: modalTokens.textSecondary,
  },
  customInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: modalTokens.textPrimary,
    backgroundColor: '#ffffff',
  },
  customInputError: {
    borderColor: modalTokens.danger,
  },
  customMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  customHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: modalTokens.textSecondary,
  },
  customHintTextError: {
    color: modalTokens.danger,
  },
  customCountText: {
    marginLeft: 12,
    fontSize: 12,
    color: modalTokens.textMuted,
  },
  customDescriptionHeader: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  customDescriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  customDescriptionOptional: {
    marginLeft: 8,
    fontSize: 11,
    color: modalTokens.textMuted,
  },
  customDescriptionInput: {
    marginTop: 8,
    minHeight: 82,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    color: modalTokens.textPrimary,
    backgroundColor: '#ffffff',
  },
  customDescriptionMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  customDescriptionHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: modalTokens.textSecondary,
  },
  customDescriptionCountText: {
    marginLeft: 12,
    fontSize: 12,
    color: modalTokens.textMuted,
  },
  customSubmitErrorText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: modalTokens.danger,
  },
  customSuccessCard: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  customSuccessContent: {
    flex: 1,
    marginLeft: 10,
  },
  customSuccessTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  customSuccessText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: modalTokens.textSecondary,
  },
  customSubmitButton: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: modalTokens.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  customSubmitButtonDisabled: {
    backgroundColor: '#f3b4bb',
  },
  customSubmitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  stateCard: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 18,
    backgroundColor: modalTokens.surfaceSoft,
    alignItems: 'center',
  },
  stateCardTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  emptyLevelContainer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyLevelText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: modalTokens.textMuted,
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchResultHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: modalTokens.textSecondary,
  },
  searchResultCountText: {
    fontSize: 12,
    color: modalTokens.textMuted,
  },
  searchResultPath: {
    marginTop: 4,
    fontSize: 12,
    color: modalTokens.textSecondary,
  },
  searchEmptyContainer: {
    paddingHorizontal: 28,
    paddingVertical: 56,
    alignItems: 'center',
  },
  searchEmptyTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  searchEmptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: modalTokens.textSecondary,
  },
  searchEmptyAction: {
    marginTop: 14,
    paddingVertical: 4,
  },
  searchEmptyActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionItemSelected: {
    backgroundColor: modalTokens.dangerSoft,
  },
  optionMain: {
    flex: 1,
    paddingRight: 12,
  },
  optionTitle: {
    fontSize: 15,
    color: modalTokens.textPrimary,
  },
  optionTitleSelected: {
    color: modalTokens.danger,
    fontWeight: '600',
  },
  optionDescription: {
    marginTop: 4,
    fontSize: 12,
    color: modalTokens.textSecondary,
    lineHeight: 18,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  optionTagText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
  },
  optionTagSelectable: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f0fdf4',
  },
  optionTagSelectableText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '600',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  stateText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: modalTokens.textSecondary,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: modalTokens.dangerSoft,
    borderWidth: 1,
    borderColor: modalTokens.danger,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: modalTokens.danger,
  },
});
