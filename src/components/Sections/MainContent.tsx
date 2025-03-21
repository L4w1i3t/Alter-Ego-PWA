import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const MainContentContainer = styled.main`
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  padding: 2vh 2vw;
  gap: 2vw;
  overflow: auto;
`;

const ResponseArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 2;
  gap: 2vh;
  min-width: 40vw;
`;

const ResponseBox = styled.div`
  background: #002000;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  padding: 2vh 1vw;
  height: 45vh;
  overflow-y: auto;
  flex: none;
  word-wrap: break-word;
`;

const MessageContainer = styled.div`
  margin-bottom: 1em;
`;

const UserMessage = styled.div`
  color: #0ff;
  margin-bottom: 0.5em;
`;

const AIMessage = styled.div`
  color: #0f0;
`;

const ThinkingMessage = styled.div`
  color: #888;
  font-style: italic;
`;

const DetectedEmotionsSection = styled.div`
  display: flex;
  gap: 1vh;
`;

const EmotionsSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1vh;
`;

const EmotionsBox = styled.div`
  background: #002000;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  padding: 1vh 1vw;
  height: 10vh;
  overflow-y: auto;
`;

const EmotionsTitle = styled.h3`
  margin: 0;
  font-size: 1em;
`;

const EmotionText = styled.p`
  color: red;
`;

const AvatarArea = styled.div`
  flex: 1;
  background: #002000;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  padding: 2vh 1vw;
  min-width: 20vw;
  max-height: 65vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const AvatarImage = styled.img`
  min-width: 100%;
  min-height: 100%;
  object-fit: cover;
  align-self: flex-start;
  filter: hue-rotate(90deg) saturate(3) brightness(1.2);
`;

interface Message {
  isUser: boolean;
  text: string;
}

interface MainContentProps {}

const MainContent: React.FC<MainContentProps> = () => {
  const [messages, setMessages] = useState<Message[]>([
    { isUser: false, text: "Hello, and welcome to ALTER EGO!" }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [userEmotions, setUserEmotions] = useState<string[]>([]);
  const [responseEmotions, setResponseEmotions] = useState<string[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral");
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    const responseBox = document.querySelector('.response-box');
    if (responseBox) {
      responseBox.scrollTop = responseBox.scrollHeight;
    }
  }, [messages]);
  
  // Listen for user queries
  useEffect(() => {
    const handleUserQuery = (event: CustomEvent<{ query: string }>) => {
      const { query } = event.detail;
      
      // Add user message
      setMessages(prev => [...prev, { isUser: true, text: query }]);
      
      // Show thinking state
      setIsThinking(true);
      setCurrentEmotion("THINKING");
    };
    
    // Listen for query responses
    const handleQueryResponse = (event: CustomEvent<any>) => {
      if (!event.detail) return;
      
      const { response, userEmotions = [], responseEmotions = [], emotion = "neutral" } = event.detail;
      
      // Update emotions
      setUserEmotions(userEmotions);
      setResponseEmotions(responseEmotions);
      setCurrentEmotion(emotion);
      
      // Hide thinking state
      setIsThinking(false);
      
      // Add AI response
      setMessages(prev => [...prev, { isUser: false, text: response }]);
    };
    
    // Add event listeners
    window.addEventListener('user-query', handleUserQuery as EventListener);
    window.addEventListener('query-response', handleQueryResponse as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('user-query', handleUserQuery as EventListener);
      window.removeEventListener('query-response', handleQueryResponse as EventListener);
    };
  }, []);
  
  return (
    <MainContentContainer>
      <ResponseArea>
        <ResponseBox className="response-box">
          {messages.map((message, index) => (
            <MessageContainer key={index}>
              {message.isUser ? (
                <UserMessage>YOU: {message.text}</UserMessage>
              ) : (
                <AIMessage>ALTER EGO: {message.text}</AIMessage>
              )}
            </MessageContainer>
          ))}
          {isThinking && (
            <ThinkingMessage>ALTER EGO is thinking...</ThinkingMessage>
          )}
        </ResponseBox>
        <DetectedEmotionsSection>
          <EmotionsSection>
            <EmotionsTitle>DETECTED USER EMOTIONS:</EmotionsTitle>
            <EmotionsBox>
              {userEmotions.map((emotion, index) => (
                <EmotionText key={index}>{emotion}</EmotionText>
              ))}
            </EmotionsBox>
          </EmotionsSection>
          <EmotionsSection>
            <EmotionsTitle>DETECTED RESPONSE EMOTIONS:</EmotionsTitle>
            <EmotionsBox>
              {responseEmotions.map((emotion, index) => (
                <EmotionText key={index}>{emotion}</EmotionText>
              ))}
            </EmotionsBox>
          </EmotionsSection>
        </DetectedEmotionsSection>
      </ResponseArea>
      <AvatarArea>
        <AvatarImage 
          src={`/assets/avatar/DEFAULT/${currentEmotion}.png`}
          alt={`Avatar showing ${currentEmotion}`} 
          onError={(e) => {
            console.error("Failed to load avatar image:", e);
            setAvatarLoadError(true);
            // Fallback to neutral if the current emotion fails to load
            if (currentEmotion !== "neutral") {
              setCurrentEmotion("neutral");
            }
          }}
        />
      </AvatarArea>
    </MainContentContainer>
  );
};

export default MainContent;