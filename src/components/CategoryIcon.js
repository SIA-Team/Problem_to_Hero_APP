import React from 'react';
import { View } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Ionicons } from '@expo/vector-icons';

import { scaleFont } from '../utils/responsive';
/**
 * 分类图标组件
 * 支持 Font Awesome 格式的图标显示
 * 
 * @param {string} icon - Font Awesome 图标格式，如 "fas fa-home" 或 "fa-home"
 * @param {number} size - 图标大小
 * @param {string} color - 图标颜色
 * @param {object} style - 额外样式
 */
const CategoryIcon = ({ icon, size = 20, color = '#666', style }) => {
  if (!icon) {
    // 没有图标时显示默认图标
    return <Ionicons name="pricetag" size={size} color={color} style={style} />;
  }

  // 解析 Font Awesome 图标格式
  const parseIcon = (iconString) => {
    if (!iconString) return null;
    
    let iconName = iconString.trim();
    
    // 移除 "fas "、"far "、"fal "、"fab " 等前缀
    iconName = iconName.replace(/^(fas|far|fal|fab)\s+/i, '');
    
    // 移除 "fa-" 前缀
    iconName = iconName.replace(/^fa-/i, '');
    
    return iconName;
  };

  const iconName = parseIcon(icon);

  if (!iconName) {
    return <Ionicons name="pricetag" size={size} color={color} style={style} />;
  }

  // 使用 Font Awesome 5 显示图标
  return (
    <FontAwesome5 
      name={iconName} 
      size={size} 
      color={color} 
      style={style}
      solid  // 使用实心图标（对应 fas）
    />
  );
};

export default CategoryIcon;
