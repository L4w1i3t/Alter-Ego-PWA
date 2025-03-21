import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import ChatBubble from './ChatBubble';
import { theme } from '../../styles/theme';
import { Message } from '../../types';

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

interface ChatAreaProps {
  messages: Message[];
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ChatContainer>
      {messages.map((message, index) => (
        <ChatBubble
          key={index}
          message={message.text}
          isUser={message.isUser}
          timestamp={message.timestamp}
        />
      ))}
      <div ref={messagesEndRef} />
    </ChatContainer>
  );
};

export default ChatArea;