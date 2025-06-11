/**
 * Utility to prevent overscroll/bounce scrolling behavior on mobile devices
 * This provides JavaScript-based prevention as a fallback to CSS solutions
 */

export const preventOverscroll = () => {
  // Prevent pull-to-refresh on mobile
  let startY = 0;
  let isAtTop = false;

  const preventPullToRefresh = (e: TouchEvent) => {
    const touch = e.touches[0];
    const currentY = touch.clientY;

    if (e.type === 'touchstart') {
      startY = currentY;
      isAtTop = window.scrollY === 0;
    } else if (e.type === 'touchmove') {
      const deltaY = currentY - startY;
      
      // If scrolling down at the top of the page, prevent the default behavior
      if (isAtTop && deltaY > 0) {
        e.preventDefault();
      }
      
      // Prevent overscroll at the bottom
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight;
      if (isAtBottom && deltaY < 0) {
        e.preventDefault();
      }
    }
  };

  // Prevent overscroll with wheel events (for trackpads, etc.)
  const preventWheelOverscroll = (e: WheelEvent) => {
    const isAtTop = window.scrollY === 0;
    const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight;
    
    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      e.preventDefault();
    }
  };

  // Add event listeners
  document.addEventListener('touchstart', preventPullToRefresh, { passive: false });
  document.addEventListener('touchmove', preventPullToRefresh, { passive: false });
  document.addEventListener('wheel', preventWheelOverscroll, { passive: false });

  // Return cleanup function
  return () => {
    document.removeEventListener('touchstart', preventPullToRefresh);
    document.removeEventListener('touchmove', preventPullToRefresh);
    document.removeEventListener('wheel', preventWheelOverscroll);
  };
};

/**
 * Alternative approach: completely disable touch scrolling and handle it manually
 * Use this if the above approach isn't sufficient
 */
export const disableTouchScrolling = () => {
  const preventTouch = (e: TouchEvent) => {
    e.preventDefault();
  };

  document.addEventListener('touchmove', preventTouch, { passive: false });

  return () => {
    document.removeEventListener('touchmove', preventTouch);
  };
};

/**
 * More targeted approach: only prevent overscroll in specific scenarios
 */
export const preventOverscrollOnElement = (element: HTMLElement) => {
  let startY = 0;
  let currentY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    startY = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    
    const isScrollable = element.scrollHeight > element.clientHeight;
    
    if (!isScrollable) {
      // If element is not scrollable, prevent all touch movement
      e.preventDefault();
      return;
    }

    const isAtTop = element.scrollTop === 0;
    const isAtBottom = element.scrollTop + element.clientHeight >= element.scrollHeight;

    // Prevent overscroll
    if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
      e.preventDefault();
    }
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
  };
};
