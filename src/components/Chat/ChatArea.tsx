import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import ChatBubble from './ChatBubble';
import { theme } from '../../styles/theme';
import { Message } from '../../types';
import { markEvent, endTimer } from '../../utils/performanceMetrics';

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
  const prevMessagesLength = useRef(messages.length);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // If a new message was added and it's from the AI, mark it for performance tracking
    if (messages.length > prevMessagesLength.current) {
      const latestMessage = messages[messages.length - 1];

      if (!latestMessage.isUser) {
        // End the timer for message processing (started in ChatInput)
        const responseTime = endTimer('message_processing');

        // Log the AI response event with its length and response time
        markEvent('ai_response_received', {
          length: latestMessage.text.length,
          responseTime: responseTime || undefined,
        });
      }
    }

    prevMessagesLength.current = messages.length;
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
