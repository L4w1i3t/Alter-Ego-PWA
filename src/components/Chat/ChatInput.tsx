import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import { markEvent, startTimer, endTimer } from '../../utils/performanceMetrics';
import { useVirtualKeyboard } from '../../hooks/useVirtualKeyboard';

const InputContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  
  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.75rem;
    position: sticky;
    bottom: 0;
    z-index: 10;
  }
`;

const TextInput = styled.input`
  flex: 1;
  padding: ${theme.spacing.md};
  border: none;
  border-radius: ${theme.borderRadius.md};
  background-color: rgba(255, 255, 255, 0.1);
  color: ${theme.colors.text};
  font-size: 1rem;
  
  /* Ensure virtual keyboard works on mobile */
  -webkit-user-select: text !important;
  user-select: text !important;
  -webkit-appearance: none;
  appearance: none;
  cursor: text;
  pointer-events: auto;
  
  &:focus {
    outline: 1px solid ${theme.colors.primary};
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    font-size: 16px !important; /* Prevent zoom on iOS */
    min-height: 44px;
    touch-action: manipulation;
    /* iOS specific fixes */
    -webkit-border-radius: ${theme.borderRadius.md};
    /* Ensure keyboard appears */
    -webkit-user-select: text !important;
    user-select: text !important;
  }
  
  /* iPad specific styles */
  @media screen and (min-device-width: 768px) and (max-device-width: 1024px) {
    font-size: 16px !important;
    -webkit-appearance: none !important;
    appearance: none !important;
    -webkit-user-select: text !important;
    user-select: text !important;
    pointer-events: auto !important;
    touch-action: manipulation !important;
    cursor: text !important;
  }
`;

const SendButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: ${theme.borderRadius.circle};
  background-color: ${theme.colors.primary};
  color: white;
  font-size: 1.2rem;
  transition: background-color ${theme.transitions.fast};
  
  &:hover {
    background-color: ${theme.colors.secondary};
  }
  
  &:disabled {
    background-color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    width: 56px;
    height: 56px;
    font-size: 1.4rem;
    min-width: 44px;
    min-height: 44px;
    touch-action: manipulation;
  }
`;

const MicButton = styled(SendButton)`
  background-color: ${props => props.disabled ? 'rgba(255, 255, 255, 0.3)' : theme.colors.success};
`;

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isListening: boolean;
  onToggleListen: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isListening, 
  onToggleListen 
}) => {
  const [message, setMessage] = useState('');
  const { isKeyboardVisible } = useVirtualKeyboard();
  const inputRef = useRef<HTMLInputElement>(null);

  // iPad-specific keyboard fix
  useEffect(() => {
    const isIPad = /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
    
    if (isIPad && inputRef.current) {
      const input = inputRef.current;
      
      // Remove readonly attribute that might prevent keyboard
      input.removeAttribute('readonly');
      
      // Add event listeners to force keyboard on iPad
      const forceKeyboard = () => {
        input.focus();
        input.click();
      };
      
      input.addEventListener('touchstart', forceKeyboard);
      input.addEventListener('touchend', forceKeyboard);
      
      return () => {
        input.removeEventListener('touchstart', forceKeyboard);
        input.removeEventListener('touchend', forceKeyboard);
      };
    }
  }, []);

  const handleSend = () => {
    if (message.trim()) {
      // Mark event for metrics tracking
      markEvent('user_message_sent', { length: message.length });
      
      // Start timer for message processing
      startTimer('message_processing');
      
      onSendMessage(message);
      setMessage('');
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Force focus and keyboard on iPad
    const input = e.target;
    
    // iPad specific: ensure readonly is not set
    input.removeAttribute('readonly');
    
    // Ensure the input is visible when focused on mobile
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300); // Delay to allow virtual keyboard to appear
    }
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    // iPad specific: force focus on click
    const input = e.target as HTMLInputElement;
    input.focus();
    
    // Trigger input event to ensure keyboard appears
    setTimeout(() => {
      input.click();
      input.focus();
    }, 100);
  };
  return (
    <InputContainer className="chat-input-container">      <TextInput
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        onFocus={handleInputFocus}
        onClick={handleInputClick}
        placeholder="Type your message..."
        autoComplete="off"
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck={true}
        inputMode="text"
        tabIndex={0}
      />
      <MicButton 
        onClick={onToggleListen} 
        title={isListening ? "Stop listening" : "Start voice input"}
      >
        <span role="img" aria-label="microphone">
          {isListening ? '🛑' : '🎤'}
        </span>
      </MicButton>
      <SendButton 
        onClick={handleSend} 
        disabled={!message.trim()}
        title="Send message"
      >
        <span role="img" aria-label="send">📤</span>
      </SendButton>
    </InputContainer>
  );
};

export default ChatInput;