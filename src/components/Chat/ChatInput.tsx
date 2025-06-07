import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import { markEvent, startTimer, endTimer } from '../../utils/performanceMetrics';

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
  
  &:focus {
    outline: 1px solid ${theme.colors.primary};
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    font-size: 16px; /* Prevent zoom on iOS */
    min-height: 44px;
    touch-action: manipulation;
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

  return (
    <InputContainer>
      <TextInput
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message..."
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