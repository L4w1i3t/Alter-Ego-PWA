import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { loadSettings, Settings, getPersonaChatHistory } from '../../utils/storageUtils';
import { EVENTS, UI } from '../../config/constants';
import TypingAnimation from '../Common/TypingAnimation';
import { openImageInNewTab } from '../../utils/imageUtils';
import { UserIcon } from '../Common/Icons';
import { useApi } from '../../context/ApiContext';

const MainContentContainer = styled.main`
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  padding: 2vh 2vw;
  gap: 2vw;
  overflow: auto;
  min-height: 0;

  @media (max-width: 768px) {
    flex-direction: column;
    flex-wrap: nowrap;
    padding: 0.75rem;
    gap: 0.5rem;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    width: 100%;
  }
`;

const ResponseArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 2;
  gap: 2vh;
  min-width: 40vw;
  min-height: 0;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    gap: 0.5rem;
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
    flex: 1;
    min-height: 100px;
    height: auto;
    max-height: none;
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
    display: ${props => (props.$show ? 'flex' : 'none')};
    flex-direction: column;
    flex-shrink: 0;
    gap: 0.5rem;
    width: 100%;
    max-height: 110px;
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
  align-items: flex-start;
  position: relative;

  @media (max-width: 768px) {
    width: 100%;
    height: 220px;
    min-height: 160px;
    max-height: 260px;
    flex-shrink: 0;
    padding: 0.5rem;
    box-sizing: border-box;
    align-items: flex-start;
    justify-content: center;
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 200%;
  object-fit: cover;
  object-position: center top;
  filter: hue-rotate(90deg) saturate(3) brightness(1.2);

  @media (max-width: 768px) {
    width: 80%;
    height: 200%;
    object-fit: cover;
    object-position: center top;
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
  instant?: boolean; // When true, bypass typing animation (e.g. restored history)
}

interface MainContentProps {
  personaContent?: string;
  activeCharacter?: string;
}

const MainContent: React.FC<MainContentProps> = ({
  personaContent = '',
  activeCharacter = 'ALTER EGO',
}) => {
  const { conversationHistory } = useApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [userEmotions, setUserEmotions] = useState<string[]>([]);
  const [responseEmotions, setResponseEmotions] = useState<string[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const isProduction = process.env.NODE_ENV === 'production';
  const [showEmotionDetection, setShowEmotionDetection] = useState(() => {
    const initialSettings = loadSettings();
    return !isProduction && (initialSettings.showEmotionDetection ?? false);
  });

  // Track the last persona so we can detect persona changes vs. normal re-mounts
  const prevCharacterRef = useRef<string>(activeCharacter);

  // Caps the display messages array to the configured limit
  const capMessages = (msgs: Message[]): Message[] => {
    if (msgs.length <= UI.DISPLAY_MESSAGE_CAP) return msgs;
    return msgs.slice(msgs.length - UI.DISPLAY_MESSAGE_CAP);
  };

  useEffect(() => {
    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Settings>).detail;
      if (detail && typeof detail === 'object') {
        setShowEmotionDetection(
          !isProduction && (detail.showEmotionDetection ?? false)
        );
      } else {
        const latest = loadSettings();
        setShowEmotionDetection(
          !isProduction && (latest.showEmotionDetection ?? false)
        );
      }
    };

    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === 'alterEgoSettings') {
        const latest = loadSettings();
        setShowEmotionDetection(
          !isProduction && (latest.showEmotionDetection ?? false)
        );
      }
    };

    window.addEventListener(
      EVENTS.SETTINGS_UPDATED,
      handleSettingsUpdated as EventListener
    );
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener(
        EVENTS.SETTINGS_UPDATED,
        handleSettingsUpdated as EventListener
      );
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [isProduction]);
  // Hydrate display messages from persisted conversation history.
  // On mount: restore prior messages so mode switches preserve the chat.
  // On persona change: clear and show welcome for the new persona.
  useEffect(() => {
    const personaChanged = prevCharacterRef.current !== activeCharacter;
    prevCharacterRef.current = activeCharacter;

    // If the user switched personas, start fresh with a welcome message
    if (personaChanged) {
      setMessages([
        { isUser: false, text: `Hello, and welcome to ${activeCharacter}!`, instant: true },
      ]);
      return;
    }

    // Try to restore from ApiContext first, then fall back to localStorage
    let source = conversationHistory;
    if (!source.length) {
      const stored = getPersonaChatHistory(activeCharacter);
      if (stored?.messages?.length) {
        source = stored.messages;
      }
    }

    if (source.length) {
      const restored: Message[] = source
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ isUser: m.role === 'user', text: m.content, instant: true }));
      setMessages(capMessages(restored));
    } else {
      // No history at all, show the welcome message
      setMessages([
        { isUser: false, text: `Hello, and welcome to ${activeCharacter}!`, instant: true },
      ]);
    }
    // Only run on mount and when the active character changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Add user message to history, capped to prevent unbounded growth
      setMessages(prev => {
        return capMessages([
          ...prev,
          {
            isUser: true,
            text: query,
            ...(images && images.length > 0 && { images: [] }), // Will be updated by reader above
          },
        ]);
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

      // Add AI response to history, capped to prevent unbounded growth
      setMessages(prev => {
        return capMessages([...prev, { isUser: false, text: response }]);
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
                    speed={message.instant ? 1000 : (loadSettings().textSpeed || 40)}
                    showCursor={!message.instant}
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
            src={`${process.env.PUBLIC_URL}/assets/avatar/ALTER EGO/${currentEmotion}.png`}
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
          <AvatarPlaceholder>
            <UserIcon size={48} aria-hidden="true" />
          </AvatarPlaceholder>
        )}
      </AvatarArea>
    </MainContentContainer>
  );
};

export default MainContent;
