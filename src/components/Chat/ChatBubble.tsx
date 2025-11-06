import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import TypingAnimation from '../Common/TypingAnimation';
import MarkdownRenderer from '../Common/MarkdownRenderer';
import { loadSettings } from '../../utils/storageUtils';
import { openImageInNewTab } from '../../utils/imageUtils';

interface BubbleProps {
  isUser: boolean;
}

const Bubble = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'isUser',
})<BubbleProps>`
  max-width: var(--ae-bubble-max-width);
  padding: calc(${theme.spacing.md} * var(--ae-spacing-scale));
  border-radius: ${theme.borderRadius.lg};
  background-color: ${props =>
    props.isUser ? theme.colors.primary : theme.colors.surface};
  color: ${theme.colors.text};
  align-self: ${props => (props.isUser ? 'flex-end' : 'flex-start')};
  box-shadow: ${theme.shadows.sm};
  position: relative;
`;

const MessageText = styled.div`
  margin: 0;
  font-size: calc(1rem * var(--ae-response-effective-scale));
`;

const PlainMessageText = styled.div`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: calc(1rem * var(--ae-response-effective-scale));
`;

const Timestamp = styled.div`
  font-size: 0.7rem;
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.xs};
  text-align: right;
`;

const ImageContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.sm};
`;

const MessageImage = styled.img`
  max-width: 200px;
  max-height: 200px;
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.02);
  }

  @media (max-width: 768px) {
    max-width: 150px;
    max-height: 150px;
  }
`;

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  images?: string[]; // Array of image URLs to display
  showTimestamp?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isUser,
  timestamp,
  images,
  showTimestamp,
}) => {
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);

  // Get text speed from settings
  const settings = loadSettings();
  const textSpeed = settings.animationsEnabled === false ? 1000 : settings.textSpeed || 40;

  const handleImageClick = (imageUrl: string) => {
    // Open image in new tab for full size viewing
    openImageInNewTab(imageUrl);
  };

  return (
    <Bubble isUser={isUser}>
      {/* Display images if present */}
      {images && images.length > 0 && (
        <ImageContainer>
          {images.map((imageUrl, index) => (
            <MessageImage
              key={index}
              src={imageUrl}
              alt={`Attachment ${index + 1}`}
              onClick={() => handleImageClick(imageUrl)}
              title="Click to view full size"
            />
          ))}
        </ImageContainer>
      )}

      {/* Display message text */}
      {message &&
        (isUser ? (
          <MessageText>
            <MarkdownRenderer content={message} />
          </MessageText>
        ) : (
          <TypingAnimation
            text={message}
            speed={textSpeed} // Use text speed from settings
            showCursor={true}
          >
            {(displayText: string, isComplete: boolean) => (
              <MessageText>
                <MarkdownRenderer content={displayText} />
              </MessageText>
            )}
          </TypingAnimation>
        ))}

      {showTimestamp !== false && <Timestamp>{formattedTime}</Timestamp>}
    </Bubble>
  );
};

export default ChatBubble;
