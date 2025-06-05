import React, { useState, useEffect } from 'react';
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

const TypingAnimation: React.FC<TypingAnimationProps> = ({
  text,
  speed = 50, // Default 50 characters per second (quite fast for VN feel)
  onComplete,
  showCursor = true,
  className,
  children
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  useEffect(() => {
    // Reset when text changes
    setDisplayText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  useEffect(() => {
    // Handle instant text (speed >= 1000)
    if (speed >= 1000) {
      setDisplayText(text);
      setCurrentIndex(text.length);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 1000 / speed); // Convert speed to milliseconds per character

      return () => clearTimeout(timeout);
    } else if (currentIndex >= text.length && !isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, text, speed, onComplete, isComplete]);

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
