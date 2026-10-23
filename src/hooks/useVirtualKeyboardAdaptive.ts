import { useState, useEffect, useRef, useCallback } from 'react';

export const useVirtualKeyboardAdaptive = (initialSuppressNative: boolean = false) => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [suppressNativeKeyboard, setSuppressNativeKeyboard] = useState(initialSuppressNative);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Monitor visualViewport for mobile soft keyboard popup (Android/iOS)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewport = window.visualViewport;

    const handleResize = () => {
      if (viewport) {
        const heightDiff = window.innerHeight - viewport.height;
        // Threshold: If viewport shrunk by more than 150px, keyboard is open
        const isOpen = heightDiff > 150;
        setIsKeyboardOpen(isOpen);
        setKeyboardHeight(isOpen ? heightDiff : 0);

        if (isOpen && inputRef.current) {
          // Keep input field centered and visible
          setTimeout(() => {
            inputRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }, 100);
        }
      }
    };

    if (viewport) {
      viewport.addEventListener('resize', handleResize);
      viewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (viewport) {
        viewport.removeEventListener('resize', handleResize);
        viewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const handleFocus = useCallback(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);
    }
  }, []);

  const dismissKeyboard = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
    // Also remove focus from active element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsKeyboardOpen(false);
  }, []);

  return {
    isKeyboardOpen,
    keyboardHeight,
    suppressNativeKeyboard,
    setSuppressNativeKeyboard,
    inputRef,
    handleFocus,
    dismissKeyboard,
  };
};
