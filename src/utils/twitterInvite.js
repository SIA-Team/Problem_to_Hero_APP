import { Linking, Alert } from 'react-native';
import { showAppAlert } from './appAlert';

/**
 * Twitter 邀请工具
 * 前端可以直接使用，不需要后端
 */

/**
 * 通过 Twitter 邀请用户（打开 Twitter 分享）
 * @param {string} twitterUsername - Twitter 用户名（不含@）
 * @param {string} inviterName - 邀请者名称
 * @param {string} questionTitle - 问题标题
 * @param {string} questionUrl - 问题链接
 */
export const inviteViaTwitterShare = async (
  twitterUsername,
  inviterName,
  questionTitle,
  questionUrl
) => {
  try {
    // 构建邀请文本
    const text = `@${twitterUsername} ${inviterName}邀请您回答"${questionTitle}"这个问题 ${questionUrl}`;
    
    // Twitter Intent URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    console.log('📤 打开 Twitter 分享:', twitterUrl);
    
    // 检查是否可以打开 URL
    const canOpen = await Linking.canOpenURL(twitterUrl);
    
    if (canOpen) {
      await Linking.openURL(twitterUrl);
      return { success: true };
    } else {
      throw new Error('无法打开 Twitter');
    }
  } catch (error) {
    console.error('❌ 打开 Twitter 失败:', error);
    
    showAppAlert(
      '无法打开 Twitter',
      '请确保已安装 Twitter 应用或使用浏览器',
      [{ text: '确定' }]
    );
    
    return { success: false, error: error.message };
  }
};

/**
 * 通过 Twitter DM 邀请（需要后端支持）
 * @param {string} twitterUsername - Twitter 用户名
 * @param {string} inviterName - 邀请者名称
 * @param {string} questionTitle - 问题标题
 * @param {string} questionUrl - 问题链接
 */
export const inviteViaDM = async (
  twitterUsername,
  inviterName,
  questionTitle,
  questionUrl
) => {
  // 这个需要后端实现
  // 前端只是调用后端接口
  console.log('📤 发送 DM 邀请（需要后端实现）');
  
  // TODO: 调用后端 API
  // const response = await twitterApi.sendDM(...);
  
  return { success: false, error: '需要后端实现' };
};

/**
 * 生成邀请链接（可以分享到任何地方）
 * @param {string} questionId - 问题 ID
 * @param {string} inviterId - 邀请者 ID
 * @returns {string} 邀请链接
 */
export const generateInviteLink = (questionId, inviterId) => {
  // 生成带邀请者信息的问题链接
  const baseUrl = 'https://your-app.com'; // 替换为你的应用域名
  return `${baseUrl}/question/${questionId}?inviter=${inviterId}`;
};

/**
 * 复制邀请文本到剪贴板
 * @param {string} twitterUsername - Twitter 用户名
 * @param {string} inviterName - 邀请者名称
 * @param {string} questionTitle - 问题标题
 * @param {string} questionUrl - 问题链接
 */
export const copyInviteText = (
  twitterUsername,
  inviterName,
  questionTitle,
  questionUrl
) => {
  const text = `@${twitterUsername} ${inviterName}邀请您回答"${questionTitle}"这个问题 ${questionUrl}`;
  
  // 复制到剪贴板
  // Clipboard.setString(text);
  
  return text;
};

export default {
  inviteViaTwitterShare,
  inviteViaDM,
  generateInviteLink,
  copyInviteText,
};
