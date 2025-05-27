import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ChatArea from './ChatArea';
import ChatInput from './ChatInput';
import { Message } from '../../types';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import { sendMessageToAI } from '../../services/aiService';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I'm ALTER EGO!",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { 
    transcript, 
    isListening, 
    startListening, 
    stopListening 
  } = useVoiceRecognition();

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
      text,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      // Send to AI service
      const response = await sendMessageToAI(text);
      
      // Add AI response to chat
      const aiMessage: Message = {
        text: response,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Add error message
      const errorMessage: Message = {
        text: "Sorry, I encountered an error processing your request.",
        isUser: false,
        timestamp: new Date(),
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
      />
    </ChatContainer>
  );
};

export default Chat;