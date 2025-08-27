/**
 * Image Selector Component - Allows users to select from cached images
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import {
  getImageCache,
  searchCachedImages,
  CachedImage,
} from '../../utils/imageUtils';
import { findRelevantImages } from '../../services/imageAnalysisService';

const SelectorContainer = styled.div`
  background: rgba(0, 0, 0, 0.9);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  overflow-y: auto;
`;

const SelectorContent = styled.div`
  background: #002000;
  border: 2px solid #0f0;
  border-radius: 0.5rem;
  padding: 2rem;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
`;

const Title = styled.h2`
  color: #0f0;
  margin-bottom: 1rem;
  text-align: center;
`;

const SearchArea = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 0.5rem;
  background: #000;
  border: 1px solid #0f0;
  color: #0f0;
  border-radius: 0.2rem;

  &::placeholder {
    color: #0f0;
    opacity: 0.7;
  }
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background: #000;
  border: 1px solid #0f0;
  color: #0f0;
  border-radius: 0.2rem;
  cursor: pointer;

  &:hover {
    background: #0f0;
    color: #000;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CloseButton = styled(Button)`
  border-color: #ff0000;
  color: #ff0000;

  &:hover {
    background: #ff0000;
    color: #000;
  }
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const SelectableImage = styled.div<{ selected: boolean }>`
  position: relative;
  border: 2px solid ${props => (props.selected ? '#0f0' : '#333')};
  border-radius: 0.2rem;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #0f0;
  }
`;

const ImageThumbnail = styled.img`
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 0.2rem;
`;

const ImageLabel = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  color: #0f0;
  padding: 0.2rem;
  font-size: 0.7rem;
  text-align: center;
  border-radius: 0 0 0.2rem 0.2rem;
`;

const SelectedIndicator = styled.div`
  position: absolute;
  top: 2px;
  right: 2px;
  background: #0f0;
  color: #000;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
`;

const ActionArea = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #0f0;
`;

const SelectionInfo = styled.div`
  color: #0f0;
  font-size: 0.9rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

interface ImageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (images: CachedImage[]) => void;
  allowMultiple?: boolean;
  currentPersona?: string;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  allowMultiple = true,
  currentPersona = 'ALTER EGO',
}) => {
  const [images, setImages] = useState<CachedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadImages();
      setSelectedImages(new Set());
    }
  }, [isOpen]);

  const loadImages = () => {
    try {
      const cached = getImageCache();
      // Sort by most recent first
      const sorted = cached.sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
      setImages(sorted);
    } catch (error) {
      console.error('Error loading cached images:', error);
      setImages([]);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadImages();
      return;
    }

    setIsSearching(true);
    try {
      // Try smart search first
      const smartResults = await findRelevantImages(
        searchQuery.trim(),
        currentPersona,
        50
      );
      setImages(smartResults);
    } catch (error) {
      console.warn('Smart search failed, falling back to basic search:', error);
      // Fallback to basic search
      const basicResults = searchCachedImages(searchQuery.trim());
      setImages(basicResults);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageClick = (imageId: string) => {
    const newSelected = new Set(selectedImages);

    if (allowMultiple) {
      if (newSelected.has(imageId)) {
        newSelected.delete(imageId);
      } else {
        newSelected.add(imageId);
      }
    } else {
      // Single selection mode
      newSelected.clear();
      newSelected.add(imageId);
    }

    setSelectedImages(newSelected);
  };

  const handleSelectImages = () => {
    const selectedImageObjects = images.filter(img =>
      selectedImages.has(img.id)
    );
    onSelect(selectedImageObjects);
    onClose();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    loadImages();
  };

  if (!isOpen) return null;

  return (
    <SelectorContainer onClick={e => e.target === e.currentTarget && onClose()}>
      <SelectorContent>
        <Title>Select Images from Cache</Title>

        <SearchArea>
          <SearchInput
            type="text"
            placeholder="Search images by description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
          <Button onClick={handleClearSearch}>Clear</Button>
        </SearchArea>

        {images.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#0f0', padding: '2rem' }}>
            {searchQuery
              ? 'No images found matching your search.'
              : 'No cached images available.'}
          </div>
        ) : (
          <ImageGrid>
            {images.map(image => (
              <SelectableImage
                key={image.id}
                selected={selectedImages.has(image.id)}
                onClick={() => handleImageClick(image.id)}
              >
                <ImageThumbnail
                  src={image.thumbnail || image.dataUrl}
                  alt={image.description || 'Cached image'}
                />
                <ImageLabel>
                  {image.description
                    ? image.description.substring(0, 20) +
                      (image.description.length > 20 ? '...' : '')
                    : 'No description'}
                </ImageLabel>
                {selectedImages.has(image.id) && (
                  <SelectedIndicator>✓</SelectedIndicator>
                )}
              </SelectableImage>
            ))}
          </ImageGrid>
        )}

        <ActionArea>
          <SelectionInfo>
            {selectedImages.size > 0
              ? `${selectedImages.size} image${selectedImages.size > 1 ? 's' : ''} selected`
              : 'Click images to select them'}
          </SelectionInfo>

          <ButtonGroup>
            <Button
              onClick={handleSelectImages}
              disabled={selectedImages.size === 0}
            >
              Use Selected Images
            </Button>
            <CloseButton onClick={onClose}>Cancel</CloseButton>
          </ButtonGroup>
        </ActionArea>
      </SelectorContent>
    </SelectorContainer>
  );
};

export default ImageSelector;
