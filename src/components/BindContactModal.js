import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalTokens } from './modalTokens';

/**
 * 绑定联系方式弹窗组件（居中弹出）
 * 支持绑定手机号和邮箱，包含验证码功能
 * 支持国际手机号格式
 */
export default function BindContactModal({
  visible,
  onClose,
  type = 'phone',
  // 'phone' | 'email'
  currentValue = '',
  onSubmit
}) {
  const [step, setStep] = useState(1); // 1: 输入联系方式, 2: 输入验证码
  const [contactValue, setContactValue] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [contactError, setContactError] = useState(''); // 联系方式错误提示
  const [codeError, setCodeError] = useState(''); // 验证码错误提示

  const isPhone = type === 'phone';
  const title = isPhone ? '绑定手机号' : '绑定邮箱';
  const placeholder = isPhone ? '请输入手机号' : '请输入邮箱地址';
  const icon = isPhone ? 'phone-portrait' : 'mail';

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 重置状态
  useEffect(() => {
    if (visible) {
      setStep(1);
      setContactValue('');
      setVerifyCode('');
      setCountdown(0);
      setContactError('');
      setCodeError('');
    }
  }, [visible]);

  // 清除联系方式错误提示
  useEffect(() => {
    if (contactValue) {
      setContactError('');
    }
  }, [contactValue]);

  // 清除验证码错误提示
  useEffect(() => {
    if (verifyCode) {
      setCodeError('');
    }
  }, [verifyCode]);

  // 验证国际手机号格式（支持多国格式）
  const validatePhone = phone => {
    // 移除所有空格、横线、括号等
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // 基本格式验证：
    // - 可以以 + 开头（国际区号）
    // - 长度在 10-15 位之间
    // - 只包含数字和可选的前导 +
    // - 首位数字不能为 0
    const basicRegex = /^\+?[1-9]\d{9,14}$/;
    if (!basicRegex.test(cleanPhone)) {
      return false;
    }

    // 移除区号前缀进行进一步验证
    const phoneWithoutPrefix = cleanPhone.replace(/^\+\d{1,3}/, '');

    // 检查是否为无效模式：
    // 1. 连续相同数字（如：1111111111）
    if (/^(\d)\1{9,}$/.test(phoneWithoutPrefix)) {
      return false;
    }

    // 2. 连续递增数字（如：1234567890）
    if (/^(?:0(?=1)|1(?=2)|2(?=3)|3(?=4)|4(?=5)|5(?=6)|6(?=7)|7(?=8)|8(?=9)){9}\d$/.test(phoneWithoutPrefix)) {
      return false;
    }

    // 3. 连续递减数字（如：9876543210）
    if (/^(?:9(?=8)|8(?=7)|7(?=6)|6(?=5)|5(?=4)|4(?=3)|3(?=2)|2(?=1)|1(?=0)){9}\d$/.test(phoneWithoutPrefix)) {
      return false;
    }

    // 4. 重复模式（如：123123123123）
    if (/^(\d{2,4})\1{2,}$/.test(phoneWithoutPrefix)) {
      return false;
    }
    return true;
  };

  // 验证邮箱格式
  const validateEmail = email => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 验证联系方式
  const validateContact = () => {
    if (!contactValue.trim()) {
      setContactError(`请输入${isPhone ? '手机号' : '邮箱地址'}`);
      return false;
    }
    if (isPhone && !validatePhone(contactValue)) {
      setContactError('请输入正确的手机号格式');
      return false;
    }
    if (!isPhone && !validateEmail(contactValue)) {
      setContactError('请输入正确的邮箱格式');
      return false;
    }
    setContactError('');
    return true;
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!validateContact()) return;
    setIsSending(true);
    try {
      // TODO: 调用发送验证码 API
      // await authApi.sendVerifyCode({ type, contact: contactValue });

      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`发送验证码到 ${contactValue}`);
      setCountdown(60);
      setStep(2);
    } catch (error) {
      console.error('发送验证码失败:', error);
      setContactError(error.message || '发送失败，请稍后重试');
    } finally {
      setIsSending(false);
    }
  };

  // 重新发送验证码
  const handleResendCode = async () => {
    if (countdown > 0) return;
    setIsSending(true);
    setCodeError('');
    try {
      // TODO: 调用发送验证码 API
      // await authApi.sendVerifyCode({ type, contact: contactValue });

      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`重新发送验证码到 ${contactValue}`);
      setCountdown(60);
    } catch (error) {
      console.error('重新发送验证码失败:', error);
      setCodeError(error.message || '发送失败，请稍后重试');
    } finally {
      setIsSending(false);
    }
  };

  // 提交绑定
  const handleSubmit = async () => {
    if (!verifyCode.trim()) {
      setCodeError('请输入验证码');
      return;
    }
    if (verifyCode.length !== 6) {
      setCodeError('请输入6位验证码');
      return;
    }
    setIsLoading(true);
    setCodeError('');
    try {
      // TODO: 调用绑定 API
      // await userApi.bindContact({ type, contact: contactValue, code: verifyCode });

      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`绑定成功: ${contactValue}`);
      if (onSubmit) {
        onSubmit(contactValue);
      }
      onClose();
    } catch (error) {
      console.error('绑定失败:', error);
      setCodeError(error.message || '验证码错误或已过期');
    } finally {
      setIsLoading(false);
    }
  };

  // 返回上一步
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setVerifyCode('');
      setCodeError('');
    } else {
      onClose();
    }
  };
  return <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 头部 */}
          <View style={styles.header}>
            {step === 2 && <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#1f2937" />
              </TouchableOpacity>}
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* 内容区域 */}
          <View style={styles.content}>
            {step === 1 ?
          // 步骤1: 输入联系方式
          <>
                <View style={styles.inputSection}>
                  <View style={styles.inputLabel}>
                    <Ionicons name={icon} size={20} color="#6b7280" />
                    <Text style={styles.inputLabelText}>
                      {isPhone ? '手机号' : '邮箱地址'}
                    </Text>
                  </View>
                  <View style={[styles.inputWrapper, contactError && styles.inputWrapperError]}>
                    <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor="#9ca3af" value={contactValue} onChangeText={setContactValue} keyboardType={isPhone ? 'phone-pad' : 'email-address'} autoCapitalize="none" autoFocus />
                    {contactValue.length > 0 && <TouchableOpacity onPress={() => setContactValue('')} style={styles.clearBtn}>
                        <Ionicons name="close-circle" size={20} color="#9ca3af" />
                      </TouchableOpacity>}
                  </View>
                  {contactError ? <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={16} color="#ef4444" />
                      <Text style={styles.errorText}>{contactError}</Text>
                    </View> : null}
                </View>

                {Boolean(currentValue) && <View style={styles.currentInfo}>
                    <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.currentInfoText}>
                      当前{isPhone ? '手机号' : '邮箱'}：{currentValue}
                    </Text>
                  </View>}

                <View style={styles.tips}>
                  <Text style={styles.tipsTitle}>温馨提示：</Text>
                  <Text style={styles.tipsText}>
                    • {isPhone ? '手机号' : '邮箱'}将用于账号安全验证
                  </Text>
                  <Text style={styles.tipsText}>
                    • 绑定后可用于找回密码和接收通知
                  </Text>
                  {Boolean(isPhone) && <Text style={styles.tipsText}>
                      • 支持国际手机号格式（如：+1234567890）
                    </Text>}
                </View>

                <TouchableOpacity style={[styles.submitBtn, isSending && styles.submitBtnDisabled]} onPress={handleSendCode} disabled={isSending}>
                  {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>获取验证码</Text>}
                </TouchableOpacity>
              </> :
          // 步骤2: 输入验证码
          <>
                <View style={styles.verifyInfo}>
                  <Ionicons name="mail-outline" size={48} color="#ef4444" />
                  <Text style={styles.verifyInfoText}>
                    验证码已发送至
                  </Text>
                  <Text style={styles.verifyInfoContact}>{contactValue}</Text>
                </View>

                <View style={styles.inputSection}>
                  <View style={styles.inputLabel}>
                    <Ionicons name="key-outline" size={20} color="#6b7280" />
                    <Text style={styles.inputLabelText}>验证码</Text>
                  </View>
                  <View style={[styles.inputWrapper, codeError && styles.inputWrapperError]}>
                    <TextInput style={styles.input} placeholder="请输入6位验证码" placeholderTextColor="#9ca3af" value={verifyCode} onChangeText={setVerifyCode} keyboardType="number-pad" maxLength={6} autoFocus />
                  </View>
                  {codeError ? <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={16} color="#ef4444" />
                      <Text style={styles.errorText}>{codeError}</Text>
                    </View> : null}
                </View>

                <View style={styles.resendSection}>
                  <Text style={styles.resendText}>没有收到验证码？</Text>
                  <TouchableOpacity onPress={handleResendCode} disabled={countdown > 0 || isSending}>
                    <Text style={[styles.resendBtn, (countdown > 0 || isSending) && styles.resendBtnDisabled]}>
                      {isSending ? '发送中...' : countdown > 0 ? `${countdown}秒后重发` : '重新发送'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>确认绑定</Text>}
                </TouchableOpacity>
              </>}
          </View>
        </View>
      </View>
    </Modal>;
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: modalTokens.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: modalTokens.border,
    shadowColor: modalTokens.shadow,
    shadowOffset: {
      width: 0,
      height: 12
    },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  backBtn: {
    padding: 4,
    width: 32
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: modalTokens.textPrimary,
    flex: 1,
    textAlign: 'center'
  },
  closeBtn: {
    padding: 4,
    width: 32,
    alignItems: 'flex-end'
  },
  content: {
    padding: 20
  },
  inputSection: {
    marginBottom: 16
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8
  },
  inputLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: modalTokens.textSecondary
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modalTokens.border,
    paddingHorizontal: 16
  },
  inputWrapperError: {
    borderColor: modalTokens.danger,
    backgroundColor: modalTokens.dangerSoft
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: modalTokens.textPrimary,
    paddingVertical: 12
  },
  clearBtn: {
    padding: 4
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6
  },
  errorText: {
    fontSize: 13,
    color: modalTokens.danger,
    flex: 1
  },
  currentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.primarySoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8
  },
  currentInfoText: {
    fontSize: 13,
    color: '#3b82f6',
    flex: 1
  },
  tips: {
    backgroundColor: modalTokens.warningSoft,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 6
  },
  tipsText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 18,
    marginBottom: 2
  },
  verifyInfo: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20
  },
  verifyInfoText: {
    fontSize: 14,
    color: modalTokens.textSecondary,
    marginTop: 12
  },
  verifyInfoContact: {
    fontSize: 16,
    fontWeight: '600',
    color: modalTokens.textPrimary,
    marginTop: 6
  },
  resendSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8
  },
  resendText: {
    fontSize: 13,
    color: modalTokens.textSecondary
  },
  resendBtn: {
    fontSize: 13,
    color: modalTokens.danger,
    fontWeight: '500'
  },
  resendBtnDisabled: {
    color: modalTokens.textMuted
  },
  submitBtn: {
    backgroundColor: modalTokens.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnDisabled: {
    backgroundColor: '#fda4af'
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});