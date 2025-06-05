import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import TypingAnimation from '../Common/TypingAnimation';
import { loadSettings } from '../../utils/storageUtils';

interface BubbleProps {
  isUser: boolean;
}

const Bubble = styled.div<BubbleProps>`
  max-width: 70%;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  background-color: ${props => props.isUser ? theme.colors.primary : theme.colors.surface};
  color: ${theme.colors.text};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  box-shadow: ${theme.shadows.sm};
  position: relative;
`;

const MessageText = styled.p`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
`;

const Timestamp = styled.div`
  font-size: 0.7rem;
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
  text-align: right;
`;

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser, timestamp }) => {
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);

  // Get text speed from settings
  const settings = loadSettings();
  const textSpeed = settings.textSpeed || 40;

  return (
    <Bubble isUser={isUser}>
      {isUser ? (
        <MessageText>{message}</MessageText>
      ) : (        <TypingAnimation 
          text={message} 
          speed={textSpeed} // Use text speed from settings
          showCursor={true}
        >
          {(displayText: string, isComplete: boolean) => (
            <MessageText>{displayText}</MessageText>
          )}
        </TypingAnimation>
      )}
      <Timestamp>{formattedTime}</Timestamp>
    </Bubble>
  );
};

export default ChatBubble;