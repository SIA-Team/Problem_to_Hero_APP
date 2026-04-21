import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function defaultGetImageUri(image) {
  return typeof image === 'string' ? image : image?.uri || image?.url || '';
}

export default function ComposerImageGrid({
  images,
  onRemove,
  getImageUri = defaultGetImageUri,
  renderItemOverlay,
  containerStyle,
  itemStyle,
  imageStyle,
  removeButtonStyle,
  removeIconSize = 20,
  removeIconColor = '#ef4444',
}) {
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {images.map((image, index) => {
        const imageUri = getImageUri(image);

        if (!imageUri) {
          return null;
        }

        return (
          <View key={`${imageUri}-${index}`} style={[styles.item, itemStyle]}>
            <Image source={{ uri: imageUri }} style={[styles.image, imageStyle]} />
            {renderItemOverlay ? renderItemOverlay(image, index) : null}
            <TouchableOpacity
              style={[styles.removeButton, removeButtonStyle]}
              onPress={() => onRemove?.(index)}
            >
              <Ionicons name="close-circle" size={removeIconSize} color={removeIconColor} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
});
