import React, { useEffect, useRef, useState } from 'react';
import Toast from './Toast';
import { subscribeToast } from '../utils/toast';

const TOAST_SWITCH_DELAY_MS = 100;

const ToastContainer = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('error');
  const [duration, setDuration] = useState(2000);
  const visibleRef = useRef(false);
  const pendingToastRef = useRef(null);
  const switchTimerRef = useRef(null);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    const cleanupTimer = () => {
      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }
    };

    const applyToast = (nextToast) => {
      setMessage(nextToast.message);
      setType(nextToast.type || 'error');
      setDuration(nextToast.duration || 2000);
      setVisible(true);
    };

    const unsubscribe = subscribeToast((nextToast) => {
      console.log('ToastContainer received toast:', nextToast);
      cleanupTimer();

      if (visibleRef.current) {
        pendingToastRef.current = nextToast;
        setVisible(false);
        switchTimerRef.current = setTimeout(() => {
          const queuedToast = pendingToastRef.current;
          pendingToastRef.current = null;
          if (queuedToast) {
            applyToast(queuedToast);
          }
        }, TOAST_SWITCH_DELAY_MS);
        return;
      }

      applyToast(nextToast);
    });

    return () => {
      cleanupTimer();
      pendingToastRef.current = null;
      unsubscribe();
    };
  }, []);

  const handleHide = () => {
    console.log('ToastContainer handleHide called');
    setVisible(false);
  };

  return (
    <Toast
      visible={visible}
      message={message}
      type={type}
      duration={duration}
      onHide={handleHide}
    />
  );
};

export default ToastContainer;
