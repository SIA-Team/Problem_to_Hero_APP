/**
 * 提取IP属地的最后一级名称
 * 例如: "美国 加利福尼亚州 旧金山" -> "旧金山"
 * 例如: "中国 北京市" -> "北京市"
 * 例如: "日本" -> "日本"
 * 
 * @param {string} location - 完整的IP属地字符串
 * @returns {string} - 最后一级的属地名称
 */
export function getLastLocationLevel(location) {
  if (!location || typeof location !== 'string') {
    return '';
  }

  // 去除首尾空格
  const trimmed = location.trim();
  
  // 按空格分割
  const parts = trimmed.split(/\s+/);
  
  // 返回最后一个部分
  return parts[parts.length - 1] || trimmed;
}
