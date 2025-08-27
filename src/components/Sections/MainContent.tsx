import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadSettings } from '../../utils/storageUtils'; // Assuming this is defined in your constants file
import TypingAnimation from '../Common/TypingAnimation';
import { openImageInNewTab } from '../../utils/imageUtils';

const MainContentContainer = styled.main`
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  padding: 2vh 2vw;
  gap: 2vw;
  overflow: auto;

  @media (max-width: 768px) {
    /* Use CSS Grid for better mobile layout control */
    display: grid;
    grid-template-rows: auto auto 1fr; /* response, emotions, avatar */
    padding: 0.75rem;
    gap: 0.75rem;
    height: calc(100vh - 150px);
    min-height: 500px; /* Ensure minimum height for avatar */
    width: 100%;
    max-width: 100vw;
    box-sizing: border-box;
    overflow-x: hidden;
    /* Ensure grid items don't overflow */
    grid-template-areas:
      'response'
      'emotions'
      'avatar';
  }
`;

const ResponseArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 2;
  gap: 2vh;
  min-width: 40vw;

  @media (max-width: 768px) {
    grid-area: response;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }
`;

const ResponseBox = styled.div<{ $showEmotions: boolean }>`
  background: #002000;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  padding: 2vh 1vw;
  height: ${props => (props.$showEmotions ? '45vh' : '65vh')};
  overflow-y: auto;
  flex: none;
  word-wrap: break-word;

  @media (max-width: 768px) {
    height: ${props =>
      props.$showEmotions
        ? '150px'
        : '200px'}; /* Use fixed heights instead of vh */
    min-height: 120px;
    max-height: ${props => (props.$showEmotions ? '150px' : '200px')};
    padding: 0.75rem;
    font-size: 0.9rem;
    line-height: 1.4;
    width: 100%;
    box-sizing: border-box;
    /* Ensure it doesn't take all available space */
    flex-shrink: 1;
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

const ImageContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  margin: 0.5em 0;
`;

const MessageImage = styled.img`
  max-width: 150px;
  max-height: 150px;
  border-radius: 0.2em;
  border: 1px solid #0f0;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    max-width: 100px;
    max-height: 100px;
  }
`;

const ThinkingMessage = styled.div`
  color: #888;
  font-style: italic;
`;

const DetectedEmotionsSection = styled.div<{ $show: boolean }>`
  display: ${props => (props.$show ? 'flex' : 'none')};
  gap: 1vh;
  @media (max-width: 768px) {
    grid-area: emotions;
    display: ${props => (props.$show ? 'flex' : 'none')};
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    /* Limit the height so it doesn't take up too much space */
    max-height: 120px;
    overflow-y: auto;
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
    height: 50px; /* Fixed small height on mobile */
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
    grid-area: avatar;
    display: flex !important;
    width: 100%;
    height: 250px; /* Fixed height for consistency */
    min-height: 200px;
    max-height: 300px;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    box-sizing: border-box;
    align-items: flex-start;
    justify-content: center;
    /* Force visibility */
    visibility: visible !important;
    opacity: 1 !important;
    /* Enhanced border for debugging */
    border-width: 3px;
    border-color: #0f0;
    border-style: solid;
    /* Ensure it takes the remaining space */
    flex: 1;
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 200%; /* Make image twice the container height */
  object-fit: cover;
  object-position: center top; /* Show top half of the image */
  filter: hue-rotate(90deg) saturate(3) brightness(1.2);

  @media (max-width: 768px) {
    width: 80%; /* Increase width for better visibility */
    height: 200%; /* Consistent behavior on mobile */
    object-fit: cover;
    object-position: center top; /* Always show top half */
    margin-top: -10%;
    /* Ensure image is visible */
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
  }
`;

const AvatarPlaceholder = styled.div`
  font-size: 5rem;
  color: #0f0;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 3rem; /* Smaller but still visible on mobile */
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }
`;

interface Message {
  isUser: boolean;
  text: string;
  images?: string[]; // Array of image URLs for display
}

interface MainContentProps {
  personaContent?: string;
  activeCharacter?: string;
}

const MainContent: React.FC<MainContentProps> = ({
  personaContent = '',
  activeCharacter = 'ALTER EGO',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [userEmotions, setUserEmotions] = useState<string[]>([]);
  const [responseEmotions, setResponseEmotions] = useState<string[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  // Load settings to check if emotion detection should be shown
  const settings = loadSettings();
  const showEmotionDetection = settings.showEmotionDetection ?? false;

  // Debug mobile layout issues
  useEffect(() => {
    const checkMobileLayout = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        console.log('Mobile layout active:', {
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          showEmotionDetection: showEmotionDetection,
          availableHeight: window.innerHeight - 150, // approximate
        });
      }
    };

    checkMobileLayout();
    window.addEventListener('resize', checkMobileLayout);

    return () => window.removeEventListener('resize', checkMobileLayout);
  }, [showEmotionDetection]);

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

  // Handle image click to open in new tab
  const handleImageClick = (imageUrl: string) => {
    openImageInNewTab(imageUrl);
  };

  // Listen for user queries and event to clear chat display
  useEffect(() => {
    const handleUserQuery = (
      event: CustomEvent<{ query: string; images?: File[] }>
    ) => {
      const { query, images } = event.detail;

      // Convert images to data URLs for display
      const imageUrls: string[] = [];
      if (images && images.length > 0) {
        images.forEach(image => {
          const reader = new FileReader();
          reader.onload = e => {
            if (e.target?.result) {
              imageUrls.push(e.target.result as string);

              // Update message once all images are processed
              if (imageUrls.length === images.length) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  // Find the last user message and add images to it
                  for (let i = newMessages.length - 1; i >= 0; i--) {
                    if (
                      newMessages[i].isUser &&
                      newMessages[i].text === query
                    ) {
                      newMessages[i] = { ...newMessages[i], images: imageUrls };
                      break;
                    }
                  }
                  return newMessages;
                });
              }
            }
          };
          reader.readAsDataURL(image);
        });
      }

      // Add user message to history (keep all messages visible)
      setMessages(prev => {
        return [
          ...prev,
          {
            isUser: true,
            text: query,
            ...(images && images.length > 0 && { images: [] }), // Will be updated by reader above
          },
        ];
      });

      // Show thinking state
      setIsThinking(true);
      setCurrentEmotion('THINKING');
    };

    // Listen for query responses
    const handleQueryResponse = (event: CustomEvent<any>) => {
      if (!event.detail) return;

      const {
        response,
        userEmotions = [],
        responseEmotions = [],
        emotion = 'neutral',
      } = event.detail;

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
      setCurrentEmotion('neutral');
    };

    // Add event listeners
    window.addEventListener('user-query', handleUserQuery as EventListener);
    window.addEventListener(
      'query-response',
      handleQueryResponse as EventListener
    );
    window.addEventListener(
      'clear-chat-display',
      handleClearChatDisplay as EventListener
    );

    // Clean up
    return () => {
      window.removeEventListener(
        'user-query',
        handleUserQuery as EventListener
      );
      window.removeEventListener(
        'query-response',
        handleQueryResponse as EventListener
      );
      window.removeEventListener(
        'clear-chat-display',
        handleClearChatDisplay as EventListener
      );
    };
  }, [activeCharacter]); // Removed memoryBuffer from dependencies as we're not using it here

  return (
    <MainContentContainer>
      <ResponseArea>
        <ResponseBox
          className="response-box"
          $showEmotions={showEmotionDetection}
        >
          {messages.map((message, index) => (
            <MessageContainer key={index}>
              {message.isUser ? (
                <>
                  <UserMessage>YOU: {message.text}</UserMessage>
                  {/* Display user images if present */}
                  {message.images && message.images.length > 0 && (
                    <ImageContainer>
                      {message.images.map((imageUrl, imgIndex) => (
                        <MessageImage
                          key={imgIndex}
                          src={imageUrl}
                          alt={`User image ${imgIndex + 1}`}
                          onClick={() => handleImageClick(imageUrl)}
                          title="Click to view full size"
                        />
                      ))}
                    </ImageContainer>
                  )}
                </>
              ) : (
                <AIMessage>
                  {activeCharacter}:{' '}
                  <TypingAnimation
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
          )}{' '}
        </ResponseBox>
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
      </ResponseArea>
      <AvatarArea $showEmotions={showEmotionDetection}>
        {!avatarLoadError ? (
          <AvatarImage
            src={`/assets/avatar/ALTER EGO/${currentEmotion}.png`}
            alt={`Avatar showing ${currentEmotion}`}
            onError={e => {
              console.error('Failed to load avatar image:', e);
              setAvatarLoadError(true);
              // Fallback to neutral if the current emotion fails to load
              if (currentEmotion !== 'neutral') {
                setCurrentEmotion('neutral');
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
