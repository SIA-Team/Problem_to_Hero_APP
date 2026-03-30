import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import occupationApi from '../services/api/occupationApi';
import { modalTokens } from './modalTokens';

const OCCUPATION_TREE_CACHE_TTL = 30 * 60 * 1000;

let occupationPickerCache = null;
let occupationPickerCacheTime = 0;
let occupationPickerRequest = null;

const getNodeLabel = (node) => {
  if (!node) {
    return '';
  }

  return (node.nameCn || node.name || '').trim();
};

const getNodeCacheKey = (node, index = 0) =>
  `${node?.id || node?.code || node?.label || 'occupation-node'}-${index}`;

const normalizeLookupValue = (value) => (value || '').trim();

const normalizeNodes = (nodes = []) =>
  nodes
    .map((node) => {
      const label = getNodeLabel(node);
      const children = normalizeNodes(node.children || []);

      if (!label && children.length === 0) {
        return null;
      }

      return {
        ...node,
        label,
        selectable: node.selectable !== false,
        children,
      };
    })
    .filter(Boolean);

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

const buildPickerDataset = (rawNodes = []) => {
  const normalizedNodes = normalizeNodes(rawNodes);

  return {
    nodes: normalizedNodes,
    pickerMode: analyzePickerMode(normalizedNodes),
    selectionIndex: buildSelectionIndex(normalizedNodes),
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

      return setOccupationPickerCache(
        buildPickerDataset(response?.data?.nodes || [])
      );
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

const OccupationOptionItem = React.memo(
  function OccupationOptionItem({
    node,
    isSelected,
    pickerMode,
    onPress,
  }) {
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
          {isSelected ? (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={modalTokens.danger}
            />
          ) : null}
          {pickerMode === 'cascade' && node.children.length > 0 ? (
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
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEmptyResult, setIsEmptyResult] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [pickerMode, setPickerMode] = useState('single');
  const [browsePath, setBrowsePath] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  const applyPickerDataset = (dataset, value) => {
    const matchedSelection = findSelectionByValue(dataset, value);

    setNodes(dataset.nodes);
    setPickerMode(dataset.pickerMode);
    setBrowsePath(matchedSelection?.ancestors || []);
    setSelectedNode(matchedSelection?.node || null);
    setIsEmptyResult(dataset.nodes.length === 0);
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
      setSelectedNode(null);
      setBrowsePath([]);
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

  const currentNodes = useMemo(() => {
    if (pickerMode === 'single') {
      return nodes;
    }

    return browsePath.length > 0
      ? browsePath[browsePath.length - 1].children || []
      : nodes;
  }, [browsePath, nodes, pickerMode]);

  const selectedPathText = useMemo(() => {
    if (!selectedNode) {
      return '';
    }

    const pathNames = Array.isArray(selectedNode.pathNamesCn)
      ? selectedNode.pathNamesCn.filter(Boolean)
      : [];

    if (pathNames.length > 0) {
      return pathNames.join(' / ');
    }

    const labels = [...browsePath.map((item) => item.label), selectedNode.label]
      .filter(Boolean);

    return labels.join(' / ');
  }, [browsePath, selectedNode]);

  const handleSelectNode = (node) => {
    if (node.selectable) {
      setSelectedNode(node);
    }

    if (pickerMode === 'cascade' && node.children.length > 0) {
      setBrowsePath((prev) => [...prev, node]);
    }
  };

  const handleConfirm = () => {
    if (!selectedNode?.selectable) {
      return;
    }

    onConfirm(selectedNode.label);
  };

  const renderBreadcrumb = () => {
    if (pickerMode !== 'cascade') {
      return null;
    }

    return (
      <View style={styles.breadcrumbContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breadcrumbContent}
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

    if (isEmptyResult && currentNodes.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons
            name="briefcase-outline"
            size={40}
            color={modalTokens.textMuted}
          />
          <Text style={styles.stateTitle}>没有可选职业</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={currentNodes}
        extraData={selectedNode}
        keyExtractor={(item, index) => getNodeCacheKey(item, index)}
        renderItem={({ item }) => (
          <OccupationOptionItem
            node={item}
            isSelected={isSameNode(selectedNode, item)}
            pickerMode={pickerMode}
            onPress={handleSelectNode}
          />
        )}
        style={styles.optionList}
        contentContainerStyle={styles.optionListContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={18}
        maxToRenderPerBatch={24}
        updateCellsBatchingPeriod={32}
        windowSize={8}
        removeClippedSubviews={currentNodes.length > 20}
      />
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
              disabled={!selectedNode?.selectable}
            >
              <Text
                style={[
                  styles.confirmText,
                  !selectedNode?.selectable && styles.confirmTextDisabled,
                ]}
              >
                确定
              </Text>
            </TouchableOpacity>
          </View>

          {selectedPathText ? (
            <View style={styles.selectionBar}>
              <Text style={styles.selectionLabel}>已选择</Text>
              <Text style={styles.selectionValue} numberOfLines={2}>
                {selectedPathText}
              </Text>
            </View>
          ) : null}

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
    height: '80%',
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
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
    paddingBottom: 8,
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
