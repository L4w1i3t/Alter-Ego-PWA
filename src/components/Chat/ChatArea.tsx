import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import ChatBubble from './ChatBubble';
import { theme } from '../../styles/theme';
import { Message } from '../../types';
import { markEvent, endTimer } from '../../utils/performanceMetrics';
import { loadSettings } from '../../utils/storageUtils';

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: calc(${theme.spacing.md} * var(--ae-spacing-scale));
  display: flex;
  flex-direction: column;
  gap: calc(${theme.spacing.md} * var(--ae-spacing-scale));
`;

interface ChatAreaProps {
  messages: Message[];
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);
  const settings = loadSettings();

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // If a new message was added and it's from the AI, mark it for performance tracking
    if (messages.length > prevMessagesLength.current) {
      const latestMessage = messages[messages.length - 1];

      if (latestMessage.role !== 'user') {
        // End the timer for message processing (started in ChatInput)
        const responseTime = endTimer('message_processing');

        // Log the AI response event with its length and response time
        markEvent('ai_response_received', {
          length: latestMessage.content.length,
          responseTime: responseTime || undefined,
        });
      }
    }

    prevMessagesLength.current = messages.length;
  }, [messages]);

  const showTimestamps = settings.showTimestamps ?? true;

  return (
    <ChatContainer>
      {messages.map((message, index) => (
        <ChatBubble
          key={index}
          message={message.content}
          isUser={message.role === 'user'}
          timestamp={message.timestamp ? new Date(message.timestamp) : new Date()}
          images={message.images}
          showTimestamp={showTimestamps}
        />
      ))}
      <div ref={messagesEndRef} />
    </ChatContainer>
  );
};

export default ChatArea;
