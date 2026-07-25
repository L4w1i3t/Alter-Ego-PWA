import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';

// Cursor blinking animation
const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

const TypingContainer = styled.div`
  position: relative;
`;

const TypingText = styled.span`
  display: inline-block;
`;

const TypingCursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: currentColor;
  margin-left: 2px;
  animation: ${blink} 1s infinite;
  vertical-align: baseline;
`;

interface TypingAnimationProps {
  text: string;
  speed?: number; // Characters per second
  onComplete?: () => void;
  showCursor?: boolean;
  className?: string;
  children?: (displayText: string, isComplete: boolean) => React.ReactNode;
}

/** At or above this the text is revealed in one go. */
const INSTANT_SPEED = 1000;

/**
 * Reveals `text` a character at a time.
 *
 * Driven by requestAnimationFrame against a wall-clock start time rather than a
 * setTimeout chain that advanced one character per tick. The old approach cost
 * one timer and one React render for every single character, so a 1500-character
 * reply meant 1500 renders of the message list -- the main source of the typing
 * animation feeling heavy on slower machines. Now the visible length is derived
 * from elapsed time, so the work is capped at one render per frame no matter how
 * high the characters-per-second setting goes, and it stays accurate if a frame
 * is dropped instead of drifting slower like the timer chain did.
 */
const TypingAnimation: React.FC<TypingAnimationProps> = ({
  text,
  speed = 50, // Default 50 characters per second (quite fast for VN feel)
  onComplete,
  showCursor = true,
  className,
  children,
}) => {
  const [visibleCount, setVisibleCount] = useState(0);

  // Kept in a ref so a caller passing an inline arrow does not restart the
  // animation on every parent render.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const total = text.length;

    if (speed >= INSTANT_SPEED || total === 0) {
      setVisibleCount(total);
      onCompleteRef.current?.();
      return;
    }

    setVisibleCount(0);

    let frame = 0;
    const started = performance.now();
    const charsPerMs = speed / 1000;

    const tick = (now: number) => {
      const revealed = Math.min(total, Math.floor((now - started) * charsPerMs));

      // Only re-render when the visible length actually changed. At low speeds
      // most frames reveal nothing.
      setVisibleCount(prev => (prev === revealed ? prev : revealed));

      if (revealed >= total) {
        onCompleteRef.current?.();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, speed]);

  const isComplete = visibleCount >= text.length;
  const displayText = isComplete ? text : text.slice(0, visibleCount);

  // If children render prop is provided, use it
  if (children) {
    return <>{children(displayText, isComplete)}</>;
  }

  // Default rendering
  return (
    <TypingContainer className={className}>
      <TypingText>{displayText}</TypingText>
      {showCursor && !isComplete && <TypingCursor />}
    </TypingContainer>
  );
};

export default TypingAnimation;
