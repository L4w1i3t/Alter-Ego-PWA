import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadSettings } from '../../utils/storageUtils'; // Assuming this is defined in your constants file
import TypingAnimation from '../Common/TypingAnimation';

const MainContentContainer = styled.main`
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  padding: 2vh 2vw;
  gap: 2vw;
  overflow: auto;
  
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 0.75rem;
    gap: 0.75rem;
    height: calc(100vh - 150px); /* Account for header (~50px), footer (~50px), query section (~50px) */
    min-height: 300px; /* Ensure minimum usable space */
    width: 100%;
    max-width: 100vw;
    box-sizing: border-box;
    overflow-x: hidden; /* Prevent horizontal scrolling */
  }
`;

const ResponseArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 2;
  gap: 2vh;
  min-width: 40vw;
  
  @media (max-width: 768px) {
    flex: none;
    width: 100%;
    gap: 1rem;
    order: 1;
  }
`;

const ResponseBox = styled.div<{ $showEmotions: boolean }>`
  background: #002000;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  padding: 2vh 1vw;
  height: ${props => props.$showEmotions ? '45vh' : '65vh'};
  overflow-y: auto;
  flex: none;
  word-wrap: break-word;
  
  @media (max-width: 768px) {
    height: ${props => props.$showEmotions ? '25vh' : '35vh'};
    min-height: 150px;
    max-height: ${props => props.$showEmotions ? '25vh' : '35vh'};
    padding: 0.75rem;
    font-size: 0.9rem;
    line-height: 1.4;
    width: 100%;
    box-sizing: border-box;
  }
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

const DetectedEmotionsSection = styled.div<{ $show: boolean }>`
  display: ${props => props.$show ? 'flex' : 'none'};
  gap: 1vh;
    @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
    order: 3;
    width: 100%;
  }
`;

const EmotionsSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1vh;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    width: 100%;
  }
`;

const EmotionsBox = styled.div`
  background: #002000;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  padding: 1vh 1vw;
  height: 10vh;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    height: 6vh;
    min-height: 40px;
    padding: 0.5rem;
    font-size: 0.8rem;
    width: 100%;
    box-sizing: border-box;
  }
`;

const EmotionsTitle = styled.h3`
  margin: 0;
  font-size: 1em;
  
  @media (max-width: 768px) {
    font-size: 0.9em;
    text-align: center;
  }
`;

const EmotionText = styled.p`
  color: red;
`;

const AvatarArea = styled.div<{ $showEmotions: boolean }>`
  flex: 1;
  background: #002000;
  border: 1px solid #0f0;
  border-radius: 1.2em;
  min-width: 20vw;
  max-height: 65vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Align to top since we're showing top half */
  position: relative;
  
  @media (max-width: 768px) {
    flex: none;
    width: 100%;
    height: ${props => props.$showEmotions ? '18vh' : '30vh'};
    min-height: 100px;
    max-height: ${props => props.$showEmotions ? '18vh' : '30vh'};
    padding: 0.5rem;
    order: 2;
    margin-bottom: 0.5rem;
    box-sizing: border-box;
    align-items: flex-start; /* Consistent top alignment */
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 200%; /* Make image twice the container height */
  object-fit: cover;
  object-position: center top; /* Show top half of the image */
  filter: hue-rotate(90deg) saturate(3) brightness(1.2);
  
  @media (max-width: 768px) {
    width: 60%;
    height: 200%; /* Consistent behavior on mobile */
    object-fit: cover;
    object-position: center top; /* Always show top half */
    margin-top: -10%;
  }
`;

const AvatarPlaceholder = styled.div`
  font-size: 5rem;
  color: #0f0;
  text-align: center;
`;

interface Message {
  isUser: boolean;
  text: string;
}

interface MainContentProps {
  personaContent?: string;
  activeCharacter?: string;
}

const MainContent: React.FC<MainContentProps> = ({ 
  personaContent = "", 
  activeCharacter = "ALTER EGO" 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [userEmotions, setUserEmotions] = useState<string[]>([]);
  const [responseEmotions, setResponseEmotions] = useState<string[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral");
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  
  // Load settings to check if emotion detection should be shown
  const settings = loadSettings();
  const showEmotionDetection = settings.showEmotionDetection ?? false;
  
  // Initialize with welcome message only when component first mounts
  useEffect(() => {
    const welcomeMessage = `Hello, and welcome to ${activeCharacter}!`;
    setMessages([{ isUser: false, text: welcomeMessage }]);
    // This effect should only run once when the component mounts
  }, []);
  
  // Update character name in messages if it changes
  useEffect(() => {
    // This only updates the display name in messages without adding a new welcome message
    if (activeCharacter) {
      // Force a re-render to update character name in displayed messages
      setMessages(prevMessages => [...prevMessages]);
    }
  }, [activeCharacter]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    const responseBox = document.querySelector('.response-box');
    if (responseBox) {
      responseBox.scrollTop = responseBox.scrollHeight;
    }
  }, [messages]);

  // Load the memory limit from settings
  const { memoryBuffer } = loadSettings();
  
  // Listen for user queries and event to clear chat display
  useEffect(() => {
    const handleUserQuery = (event: CustomEvent<{ query: string }>) => {
      const { query } = event.detail;
      
      // Add user message to history (keep all messages visible)
      setMessages(prev => {
        return [...prev, { isUser: true, text: query }];
      });
      
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
      
      // Add AI response to history (keep all messages visible)
      setMessages(prev => {
        return [...prev, { isUser: false, text: response }];
      });
    };
    
    // Listen for clear chat display event
    const handleClearChatDisplay = () => {
      // Reset messages to empty array
      setMessages([]);
      // Reset emotions
      setUserEmotions([]);
      setResponseEmotions([]);
      setCurrentEmotion("neutral");
    };
    
    // Add event listeners
    window.addEventListener('user-query', handleUserQuery as EventListener);
    window.addEventListener('query-response', handleQueryResponse as EventListener);
    window.addEventListener('clear-chat-display', handleClearChatDisplay as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('user-query', handleUserQuery as EventListener);
      window.removeEventListener('query-response', handleQueryResponse as EventListener);
      window.removeEventListener('clear-chat-display', handleClearChatDisplay as EventListener);
    };
  }, [activeCharacter]); // Removed memoryBuffer from dependencies as we're not using it here
  
  return (
    <MainContentContainer>
      <ResponseArea>
        <ResponseBox className="response-box" $showEmotions={showEmotionDetection}>          
          {messages.map((message, index) => (
            <MessageContainer key={index}>
              {message.isUser ? (
                <UserMessage>YOU: {message.text}</UserMessage>              ) : (                <AIMessage>
                  {activeCharacter}: <TypingAnimation 
                    text={message.text} 
                    speed={loadSettings().textSpeed || 40} // Use text speed from settings
                    showCursor={true}
                  >
                    {(displayText: string, isComplete: boolean) => (
                      <span>{displayText}</span>
                    )}
                  </TypingAnimation>
                </AIMessage>
              )}
            </MessageContainer>
          ))}
          {isThinking && (
            <ThinkingMessage>{activeCharacter} is thinking...</ThinkingMessage>
          )}        </ResponseBox>
        <DetectedEmotionsSection $show={showEmotionDetection}>
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
      </ResponseArea>      <AvatarArea $showEmotions={showEmotionDetection}>
        {!avatarLoadError ? (
          <AvatarImage 
            src={`/assets/avatar/ALTER EGO/${currentEmotion}.png`}
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
        ) : (
          <AvatarPlaceholder>👤</AvatarPlaceholder>
        )}
      </AvatarArea>
    </MainContentContainer>
  );
};

export default MainContent;