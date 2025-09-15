import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { useApi } from '../../context/ApiContext';
import { validateImageFile } from '../../utils/imageUtils';

const QuerySectionContainer = styled.section`
  display: flex;
  align-items: flex-start; /* Change from center to flex-start to handle height changes */
  padding: 1vh 2vw;
  gap: 1vw;

  @media (max-width: 768px) {
    padding: 0.75rem;
    gap: 0.5rem;
    flex-wrap: wrap;
    min-height: 50px;
  }
`;

const QueryInputWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    min-width: 100%;
    order: 1;
  }
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1vw;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1vw;
  align-items: center;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    width: 100%;
    order: 2;
  }
`;

const QueryInput = styled.input`
  width: 100%;
  padding: 0.5em;
  border: 1px solid #0f0;
  background: #000;
  color: #0f0;
  border-radius: 0.2em;
  flex: 1; /* Take up remaining space in the input row */

  &::placeholder {
    color: #0f0;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    padding: 0.75rem;
    font-size: 16px; /* Prevent zoom on iOS */
    min-height: 40px;
    touch-action: manipulation;
  }
`;

const SendQueryButton = styled.button`
  font-family: inherit;
  color: #0f0;
  background: #000;
  border: 1px solid #0f0;
  padding: 0.5em 1em;
  border-radius: 0.2em;
  white-space: nowrap; /* Prevent text wrapping */

  &:hover {
    background: #0f0;
    color: #000;
    cursor: pointer;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover {
      background: #000;
      color: #0f0;
    }
  }

  @media (max-width: 768px) {
    padding: 1rem 1.5rem;
    font-size: 16px;
    min-height: 44px;
    flex: 1; /* Take equal space with image button */
    touch-action: manipulation;
  }
`;

const ImageUploadButton = styled.button`
  font-family: inherit;
  color: #0f0;
  background: #000;
  border: 1px solid #0f0;
  padding: 0.5em;
  border-radius: 0.2em;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5em; /* Ensure consistent width */

  &:hover {
    background: #0f0;
    color: #000;
    cursor: pointer;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    font-size: 16px;
    min-height: 44px;
    flex: 1; /* Take equal space with send button */
    touch-action: manipulation;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ImagePreviewContainer = styled.div`
  display: flex;
  gap: 0.5em;
  flex-wrap: wrap;
  margin-top: 0.5em;
`;

const ImagePreview = styled.div`
  position: relative;
  display: inline-block;
`;

const PreviewImage = styled.img`
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 0.2em;
  border: 1px solid #0f0;
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: -9px;
  right: -9px;
  width: 20px;
  height: 20px;
  min-width: 0; /* Override global button min-size */
  min-height: 0;
  border-radius: 50%;
  border: none;
  background-color: #ff0000;
  cursor: pointer;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #cc0000;
  }
  
  /* Create X using CSS pseudo-elements */
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
  
  /* Focus styles for accessibility */
  &:focus {
    outline: 2px solid #0f0;
    outline-offset: 1px;
  }
`;

interface QuerySectionProps {
  personaContent?: string;
  activeCharacter?: string;
}

const QuerySection: React.FC<QuerySectionProps> = ({
  personaContent = '',
  activeCharacter = 'ALTER EGO',
}) => {
  const [query, setQuery] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendQuery, isLoading } = useApi();

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

  const handleSendQuery = async () => {
    if ((query.trim() || selectedImages.length > 0) && !isLoading) {
      // Store the query and images to clear the input
      const currentQuery = query;
      const currentImages = [...selectedImages];
      setQuery('');
      setSelectedImages([]);
      setImagePreviews([]);

      // Create a custom event to update the UI
      const queryEvent = new CustomEvent('user-query', {
        detail: { query: currentQuery, images: currentImages },
      });
      window.dispatchEvent(queryEvent);

      // Prepare the custom system prompt with the active persona's content
      const systemPrompt = personaContent
        ? `${personaContent}\n\nYou are currently engaged in a conversation as ${activeCharacter}. Stay true to this character's personality, speech patterns, and unique traits throughout the entire conversation. Don't slip into generic AI assistant mode - be this character completely.`
        : `You are ${activeCharacter}, a unique digital consciousness. Engage authentically with your own personality, opinions, and communication style rather than using generic AI assistant language.`;

      // Send the query to the API with the personalized system prompt and images
      // Make sure we're using the current persona's name to keep conversations separate
      const result = await sendQuery(
        currentQuery,
        systemPrompt,
        undefined,
        activeCharacter,
        currentImages.length > 0 ? currentImages : undefined
      );

      // Dispatch response event
      const responseEvent = new CustomEvent('query-response', {
        detail: result,
      });
      window.dispatchEvent(responseEvent);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendQuery();
    }
  };

  return (
    <QuerySectionContainer>
      <QueryInputWrapper>
        <InputRow>
          <QueryInput
            type="text"
            placeholder="Insert Query Here..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />
          <ButtonContainer>
            <ImageUploadButton
              onClick={handleImageButtonClick}
              disabled={isLoading}
              title="Attach images"
            >
              📷
            </ImageUploadButton>

            <SendQueryButton
              onClick={handleSendQuery}
              disabled={isLoading || (!query.trim() && selectedImages.length === 0)}
            >
              {isLoading ? 'Processing...' : 'Send Query'}
            </SendQueryButton>
          </ButtonContainer>
        </InputRow>
        
        {/* Image Previews */}
        {imagePreviews.length > 0 && (
          <ImagePreviewContainer>
            {imagePreviews.map((preview, index) => (
              <ImagePreview key={index}>
                <PreviewImage src={preview} alt={`Preview ${index + 1}`} />
                <RemoveImageButton
                  onClick={() => handleRemoveImage(index)}
                  title="Remove image"
                />
              </ImagePreview>
            ))}
          </ImagePreviewContainer>
        )}
      </QueryInputWrapper>

      {/* Hidden file input */}
      <HiddenFileInput
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageSelect}
      />
    </QuerySectionContainer>
  );
};

export default QuerySection;
