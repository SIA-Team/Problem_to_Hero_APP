import React from 'react';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

const parseFontAwesome5Icon = iconString => {
  if (!iconString) {
    return null;
  }

  const tokens = String(iconString)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const styleMap = {
    fas: 'solid',
    far: 'regular',
    fal: 'light',
    fab: 'brand',
  };
  let iconType = 'solid';
  let iconName = '';

  tokens.forEach(token => {
    const normalizedToken = token.toLowerCase();

    if (styleMap[normalizedToken]) {
      iconType = styleMap[normalizedToken];
      return;
    }

    if (normalizedToken.startsWith('fa-')) {
      iconName = normalizedToken.replace(/^fa-/, '');
      return;
    }

    if (!iconName) {
      iconName = normalizedToken;
    }
  });

  if (!iconName) {
    return null;
  }

  return {
    iconName,
    iconType,
  };
};

const CategoryIcon = ({ icon, size = 20, color = '#666', style }) => {
  const parsedIcon = parseFontAwesome5Icon(icon);

  if (!parsedIcon?.iconName) {
    return <Ionicons name="pricetag" size={size} color={color} style={style} />;
  }

  const iconStyleProps =
    parsedIcon.iconType === 'brand'
      ? { brand: true }
      : parsedIcon.iconType === 'regular'
        ? { regular: true }
        : parsedIcon.iconType === 'light'
          ? { light: true }
          : { solid: true };

  return (
    <FontAwesome5
      name={parsedIcon.iconName}
      size={size}
      color={color}
      style={style}
      {...iconStyleProps}
    />
  );
};

export default CategoryIcon;
