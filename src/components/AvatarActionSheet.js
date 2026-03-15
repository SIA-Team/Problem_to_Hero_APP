import React from 'react';
import ImagePickerSheet from './ImagePickerSheet';

export default function AvatarActionSheet({
  visible,
  onClose,
  onImageSelected,
  title = 'Change avatar',
}) {
  return (
    <ImagePickerSheet
      visible={visible}
      onClose={onClose}
      onImageSelected={onImageSelected}
      title={title}
    />
  );
}
