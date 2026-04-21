export const MAX_COMPOSER_IMAGE_COUNT = 9;

const normalizeImages = images => (Array.isArray(images) ? images : []);

export const getComposerImageUri = image =>
  typeof image === 'string' ? image : image?.uri || image?.url || '';

export const isComposerImageLimitReached = images =>
  normalizeImages(images).length >= MAX_COMPOSER_IMAGE_COUNT;

export const appendComposerImage = (images, image) => [
  ...normalizeImages(images),
  image,
];

export const removeComposerImageAt = (images, index) =>
  normalizeImages(images).filter((_, imageIndex) => imageIndex !== index);
