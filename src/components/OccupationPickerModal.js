import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

const getNodeLabel = (node) => {
  if (!node) {
    return '';
  }

  return (node.nameCn || node.name || '').trim();
};

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

const findNodeByValue = (nodes, currentValue, ancestors = []) => {
  const normalizedValue = (currentValue || '').trim();

  if (!normalizedValue) {
    return null;
  }

  for (const node of nodes) {
    const pathNames = Array.isArray(node.pathNamesCn)
      ? node.pathNamesCn.filter(Boolean)
      : [];

    if (
      node.label === normalizedValue ||
      pathNames[pathNames.length - 1] === normalizedValue
    ) {
      return {
        node,
        ancestors,
      };
    }

    const found = findNodeByValue(node.children, normalizedValue, [
      ...ancestors,
      node,
    ]);

    if (found) {
      return found;
    }
  }

  return null;
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

  const loadOccupationTree = async (active = true) => {
    setLoading(true);
    setError('');
    setIsEmptyResult(false);

    try {
      const response = await occupationApi.getOccupationTree();

      if (!active) {
        return;
      }

      if (response?.code !== 200) {
        throw new Error(response?.msg || '获取职业数据失败');
      }

      const normalizedNodes = normalizeNodes(response?.data?.nodes || []);
      const mode = analyzePickerMode(normalizedNodes);
      const matched = findNodeByValue(normalizedNodes, currentValue);

      setNodes(normalizedNodes);
      setPickerMode(mode);
      setBrowsePath(matched?.ancestors || []);
      setSelectedNode(matched?.node || null);
      setIsEmptyResult(normalizedNodes.length === 0);
    } catch (loadError) {
      if (!active) {
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
            <React.Fragment key={`${item.id || item.code || item.label}-${index}`}>
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
                    index === browsePath.length - 1 && styles.breadcrumbTextActive,
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
      <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
        {currentNodes.map((node, index) => {
          const isSelected =
            selectedNode?.id === node.id && selectedNode?.code === node.code
              ? true
              : selectedNode?.id === node.id || selectedNode?.label === node.label;

          return (
            <TouchableOpacity
              key={`${node.id || node.code || node.label}-${index}`}
              style={[
                styles.optionItem,
                isSelected && styles.optionItemSelected,
              ]}
              activeOpacity={0.7}
              onPress={() => handleSelectNode(node)}
            >
              <View style={styles.optionMain}>
                <Text
                  style={[
                    styles.optionTitle,
                    isSelected && styles.optionTitleSelected,
                  ]}
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
        })}
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
              <Text style={styles.selectionLabel}>已选</Text>
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
