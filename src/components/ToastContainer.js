import React, { useState, useImperativeHandle, forwardRef } from 'react';
import Toast from './Toast';

/**
 * Toast 容器组件
 * 用于在应用中显示 Toast 提示
 */
const ToastContainer = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('error');
  const [duration, setDuration] = useState(2000);

  useImperativeHandle(ref, () => ({
    show: (msg, toastType = 'error', toastDuration = 2000) => {
      console.log('📦 ToastContainer.show 被调用:', { msg, toastType, toastDuration });
      
      // 如果当前有Toast在显示，先隐藏
      if (visible) {
        setVisible(false);
        setTimeout(() => {
          setMessage(msg);
          setType(toastType);
          setDuration(toastDuration);
          setVisible(true);
        }, 100);
      } else {
        setMessage(msg);
        setType(toastType);
        setDuration(toastDuration);
        setVisible(true);
      }
    },
  }));

  const handleHide = () => {
    console.log('📦 ToastContainer.handleHide 被调用');
    setVisible(false);
  };

  console.log('📦 ToastContainer 渲染:', { visible, message, type });

  return (
    <Toast
      visible={visible}
      message={message}
      type={type}
      duration={duration}
      onHide={handleHide}
    />
  );
});

export default ToastContainer;
