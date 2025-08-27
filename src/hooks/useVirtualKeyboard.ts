import { useEffect, useState } from 'react';

interface VirtualKeyboardAPI extends EventTarget {
  overlaysContent: boolean;
  boundingRect: DOMRect;
}

declare global {
  interface Navigator {
    virtualKeyboard?: VirtualKeyboardAPI;
  }
}

export const useVirtualKeyboard = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Modern browsers with Virtual Keyboard API
    if ('virtualKeyboard' in navigator) {
      const vk = navigator.virtualKeyboard!;

      const handleGeometryChange = () => {
        const rect = vk.boundingRect;
        const isVisible = rect.height > 0;
        setIsKeyboardVisible(isVisible);
        setKeyboardHeight(rect.height);
      };

      vk.addEventListener('geometrychange', handleGeometryChange);

      return () => {
        vk.removeEventListener('geometrychange', handleGeometryChange);
      };
    } else {
      // Fallback for older browsers - detect viewport changes
      let initialViewport = window.visualViewport?.height || window.innerHeight;

      const handleViewportChange = () => {
        const currentViewport =
          window.visualViewport?.height || window.innerHeight;
        const heightDifference = initialViewport - currentViewport;

        // Consider keyboard visible if viewport height decreased by more than 150px
        const keyboardVisible = heightDifference > 150;
        setIsKeyboardVisible(keyboardVisible);
        setKeyboardHeight(keyboardVisible ? heightDifference : 0);
      };

      // Use visualViewport if available (modern browsers)
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportChange);
        return () => {
          window.visualViewport?.removeEventListener(
            'resize',
            handleViewportChange
          );
        };
      } else {
        // Fallback to window resize
        window.addEventListener('resize', handleViewportChange);
        return () => {
          window.removeEventListener('resize', handleViewportChange);
        };
      }
    }
  }, []);

  // Effect to add/remove keyboard-open class to body
  useEffect(() => {
    if (isKeyboardVisible) {
      document.body.classList.add('keyboard-open');
      document.body.style.setProperty(
        '--keyboard-height',
        `${keyboardHeight}px`
      );
    } else {
      document.body.classList.remove('keyboard-open');
      document.body.style.removeProperty('--keyboard-height');
    }

    return () => {
      document.body.classList.remove('keyboard-open');
      document.body.style.removeProperty('--keyboard-height');
    };
  }, [isKeyboardVisible, keyboardHeight]);

  return {
    isKeyboardVisible,
    keyboardHeight,
  };
};
