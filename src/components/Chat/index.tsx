import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ChatArea from './ChatArea';
import ChatInput from './ChatInput';
import { Message } from '../../types';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import { sendMessageToAI } from '../../services/aiService';
import { useApi } from '../../context/ApiContext';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Chat: React.FC = () => {
  const { currentPersona } = useApi();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm ALTER EGO!",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { transcript, isListening, startListening, stopListening } =
    useVoiceRecognition();

  // Toggle voice recognition
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Handle sending a message
  const handleSendMessage = async (text: string) => {
    // Add user message to chat
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Send to AI service
      const response = await sendMessageToAI(text);

      // Add AI response to chat
      const aiMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);

      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle voice transcription
  useEffect(() => {
    if (transcript && !isListening && transcript.trim() !== '') {
      handleSendMessage(transcript);
    }
  }, [transcript, isListening]);

  return (
    <ChatContainer>
      <ChatArea messages={messages} />
      <ChatInput
        onSendMessage={handleSendMessage}
        isListening={isListening}
        onToggleListen={toggleListening}
        currentPersona={currentPersona}
      />
    </ChatContainer>
  );
};

export default Chat;
