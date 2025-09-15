import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import {
  markEvent,
  startTimer,
  endTimer,
} from '../../utils/performanceMetrics';
import { useVirtualKeyboard } from '../../hooks/useVirtualKeyboard';
import { validateImageFile } from '../../utils/imageUtils';

const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.75rem;
    position: sticky;
    bottom: 0;
    z-index: 10;
  }
`;

const InputRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: center;
`;

const ImagePreviewContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  max-height: 120px;
  overflow-y: auto;
`;

const ImagePreview = styled.div`
  position: relative;
  display: inline-block;
`;

const PreviewImage = styled.img`
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: ${theme.borderRadius.sm};
  border: 2px solid ${theme.colors.primary};
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  min-width: 0;
  min-height: 0;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  border-radius: 50%;
  border: none;
  background: ${theme.colors.error};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;

  &:hover {
    background-color: #cc3333;
  }

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 2px;
    height: 10px;
    background-color: white;
    border-radius: 1px;
  }

  &::before {
    transform: rotate(45deg);
  }

  &::after {
    transform: rotate(-45deg);
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const TextInput = styled.input`
  flex: 1;
  padding: ${theme.spacing.md};
  border: none;
  border-radius: ${theme.borderRadius.md};
  background-color: rgba(255, 255, 255, 0.1);
  color: ${theme.colors.text};
  font-size: 1rem;

  /* Ensure virtual keyboard works on mobile */
  -webkit-user-select: text !important;
  user-select: text !important;
  -webkit-appearance: none;
  appearance: none;
  cursor: text;
  pointer-events: auto;

  &:focus {
    outline: 1px solid ${theme.colors.primary};
  }

  @media (max-width: 768px) {
    padding: 1rem;
    font-size: 16px !important; /* Prevent zoom on iOS */
    min-height: 44px;
    touch-action: manipulation;
    /* iOS specific fixes */
    -webkit-border-radius: ${theme.borderRadius.md};
    /* Ensure keyboard appears */
    -webkit-user-select: text !important;
    user-select: text !important;
  }

  /* iPad specific styles */
  @media screen and (min-device-width: 768px) and (max-device-width: 1024px) {
    font-size: 16px !important;
    -webkit-appearance: none !important;
    appearance: none !important;
    -webkit-user-select: text !important;
    user-select: text !important;
    pointer-events: auto !important;
    touch-action: manipulation !important;
    cursor: text !important;
  }
`;

const SendButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: ${theme.borderRadius.circle};
  background-color: ${theme.colors.primary};
  color: white;
  font-size: 1.2rem;
  transition: background-color ${theme.transitions.fast};

  &:hover {
    background-color: ${theme.colors.secondary};
  }

  &:disabled {
    background-color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    width: 56px;
    height: 56px;
    font-size: 1.4rem;
    min-width: 44px;
    min-height: 44px;
    touch-action: manipulation;
  }
`;

const MicButton = styled(SendButton)`
  background-color: ${props =>
    props.disabled ? 'rgba(255, 255, 255, 0.3)' : theme.colors.success};
`;

const ImageButton = styled(SendButton)`
  background-color: rgba(255, 255, 255, 0.1);

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

// Cached image picker removed

interface ChatInputProps {
  onSendMessage: (message: string, images?: File[]) => void;
  isListening: boolean;
  onToggleListen: () => void;
  currentPersona?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isListening,
  onToggleListen,
  currentPersona = 'ALTER EGO',
}) => {
  const [message, setMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  // Cached image selector removed
  const { isKeyboardVisible } = useVirtualKeyboard();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // iPad-specific keyboard fix
  useEffect(() => {
    const isIPad =
      /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;

    if (isIPad && inputRef.current) {
      const input = inputRef.current;

      // Remove readonly attribute that might prevent keyboard
      input.removeAttribute('readonly');

      // Add event listeners to force keyboard on iPad
      const forceKeyboard = () => {
        input.focus();
        input.click();
      };

      input.addEventListener('touchstart', forceKeyboard);
      input.addEventListener('touchend', forceKeyboard);

      return () => {
        input.removeEventListener('touchstart', forceKeyboard);
        input.removeEventListener('touchend', forceKeyboard);
      };
    }
  }, []);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach(file => {
      const validation = validateImageFile(file);
      if (validation.valid) {
        newFiles.push(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = e => {
          if (e.target?.result) {
            setImagePreviews(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        alert(`Error with file ${file.name}: ${validation.error}`);
      }
    });

    setSelectedImages(prev => [...prev, ...newFiles]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  /* Cached image selection removed
  const handleCachedImageSelect = (cachedImages: CachedImage[]) => {
    // Convert cached images to File objects
    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    cachedImages.forEach(cachedImage => {
      // If we have the original file, use it directly
      if (cachedImage.originalFile) {
        newFiles.push(cachedImage.originalFile);
        newPreviews.push(cachedImage.thumbnail || cachedImage.dataUrl);
      } else {
        // Convert base64 to File object
        try {
          const byteCharacters = atob(cachedImage.dataUrl.split(',')[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);

          // Extract MIME type from data URL
          const mimeMatch = cachedImage.dataUrl.match(/data:([^;]+)/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

          const file = new File(
            [byteArray],
            `cached-image-${cachedImage.id}.jpg`,
            {
              type: mimeType,
            }
          );

          newFiles.push(file);
          newPreviews.push(cachedImage.thumbnail || cachedImage.dataUrl);
        } catch (error) {
          console.error('Error converting cached image to File:', error);
        }
      }
    });

    setSelectedImages(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };
  */

  const handleSend = () => {
    if (message.trim() || selectedImages.length > 0) {
      // Mark event for metrics tracking
      markEvent('user_message_sent', {
        length: message.length,
        imageCount: selectedImages.length,
      });

      // Start timer for message processing
      startTimer('message_processing');

      onSendMessage(
        message,
        selectedImages.length > 0 ? selectedImages : undefined
      );
      setMessage('');
      setSelectedImages([]);
      setImagePreviews([]);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Force focus and keyboard on iPad
    const input = e.target;

    // iPad specific: ensure readonly is not set
    input.removeAttribute('readonly');

    // Ensure the input is visible when focused on mobile
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300); // Delay to allow virtual keyboard to appear
    }
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    // iPad specific: force focus on click
    const input = e.target as HTMLInputElement;
    input.focus();

    // Trigger input event to ensure keyboard appears
    setTimeout(() => {
      input.click();
      input.focus();
    }, 100);
  };
  return (
    <>
      <InputContainer className="chat-input-container">
        {/* Image Previews */}
        {imagePreviews.length > 0 && (
          <ImagePreviewContainer>
            {imagePreviews.map((preview, index) => (
              <ImagePreview key={index}>
                <PreviewImage src={preview} alt={`Preview ${index + 1}`} />
                <RemoveImageButton
                  onClick={() => handleRemoveImage(index)}
                  title="Remove image"
                  aria-label="Remove image"
                />
              </ImagePreview>
            ))}
          </ImagePreviewContainer>
        )}

        {/* Input Row */}
        <InputRow>
          <TextInput
            ref={inputRef}
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            onClick={handleInputClick}
            placeholder="Type your message or attach an image..."
            autoComplete="off"
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck={true}
            inputMode="text"
            tabIndex={0}
          />

          {/* Hidden file input */}
          <HiddenFileInput
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
          />

          <MicButton
            onClick={onToggleListen}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            <span role="img" aria-label="microphone">
              {isListening ? '🛑' : '🎤'}
            </span>
          </MicButton>

          <ImageButton
            onClick={handleImageButtonClick}
            title="Attach new images"
          >
            <span role="img" aria-label="camera">
              📷
            </span>
          </ImageButton>

          {/** Cached image selection removed **/}

          <SendButton
            onClick={handleSend}
            disabled={!message.trim() && selectedImages.length === 0}
            title="Send message"
          >
            <span role="img" aria-label="send">
              📤
            </span>
          </SendButton>
        </InputRow>
      </InputContainer>

      {/* Cached Image Selector removed */}
    </>
  );
};

export default ChatInput;
