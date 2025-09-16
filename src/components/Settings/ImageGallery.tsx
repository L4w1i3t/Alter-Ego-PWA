import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';
import {
  getImageCache,
  searchCachedImages,
  deleteCachedImage,
  clearImageCache,
  formatCacheSize,
  getImageCacheSize,
  openImageInNewTab,
  CachedImage,
} from '../../utils/imageUtils';
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
} from '../Common/NotificationManager';
import { findRelevantImages } from '../../services/imageAnalysisService';
import { useImageAnalysis } from '../../hooks/useImageAnalysis';
import ConfirmationDialog from '../Common/ConfirmationDialog';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #0f0;
  width: 100%;
  min-height: 60vh;
  padding: 1em;

  @media (max-width: 768px) {
    padding: 1em;
    min-height: 70vh;
    align-items: stretch;
  }
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.4em;
    margin-bottom: 1.5em;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 1em;
  margin-bottom: 1em;
  flex-wrap: wrap;
  width: 100%;
  justify-content: center;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5em;
  }
`;

const SearchInput = styled.input`
  padding: 0.5em;
  border: 1px solid #0f0;
  background: #000;
  color: #0f0;
  border-radius: 0.2em;
  min-width: 200px;

  &::placeholder {
    color: #0f0;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    min-width: 100%;
    padding: 1rem;
    font-size: 16px;
  }
`;

const Button = styled.button`
  padding: 0.5em 1em;
  border: 1px solid #0f0;
  background: #000;
  color: #0f0;
  border-radius: 0.2em;
  cursor: pointer;

  &:hover {
    background: #0f0;
    color: #000;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    font-size: 16px;
  }
`;

const ClearButton = styled(Button)`
  background: #800000;
  border-color: #ff0000;
  color: #ff0000;

  &:hover {
    background: #ff0000;
    color: #000;
  }
`;

const Stats = styled.div`
  margin-bottom: 1em;
  text-align: center;
  opacity: 0.8;
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1em;
  width: 100%;
  max-width: 1200px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.5em;
  }
`;

const ImageCard = styled.div`
  border: 1px solid #0f0;
  border-radius: 0.2em;
  padding: 0.5em;
  background: #002000;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
`;

const ImagePreview = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 0.2em;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`;

const ImageInfo = styled.div`
  font-size: 0.8em;
  display: flex;
  flex-direction: column;
  gap: 0.25em;
`;

const ScrollableDescription = styled.div`
  max-height: 8em; /* Increased from 4em to 8em - about 8 lines of text */
  overflow-y: auto;
  word-wrap: break-word;
  word-break: break-word;
  line-height: 1.3;
  padding-right: 0.5em; /* Space for scrollbar */
  margin-top: 0.25em;

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px; /* Slightly wider scrollbar for easier use */
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 255, 0, 0.1);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 0, 0.5);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 0, 0.7);
  }
`;

const ImageActions = styled.div`
  display: flex;
  gap: 0.5em;
  justify-content: space-between;
`;

const ActionButton = styled.button`
  padding: 0.25em 0.5em;
  border: 1px solid #0f0;
  background: transparent;
  color: #0f0;
  border-radius: 0.2em;
  cursor: pointer;
  font-size: 0.8em;

  &:hover {
    background: #0f0;
    color: #000;
  }
`;

const DeleteButton = styled(ActionButton)`
  border-color: #ff0000;
  color: #ff0000;

  &:hover {
    background: #ff0000;
    color: #000;
  }
`;

const BackButton = styled(Button)`
  align-self: flex-start;
  margin-bottom: 1em;
`;

const EmptyState = styled.div`
  text-align: center;
  color: #0f0;
  opacity: 0.7;
  font-style: italic;
  margin-top: 2em;
`;

const UseButton = styled(ActionButton)`
  border-color: #0080ff;
  color: #0080ff;

  &:hover {
    background: #0080ff;
    color: #000;
  }
`;

const SmartSearchButton = styled(Button)`
  background: #004000;
  border-color: #00ff00;
  color: #00ff00;

  &:hover {
    background: #00ff00;
    color: #000;
  }
`;

const AIBadge = styled.span`
  background: #1a0066;
  border: 1px solid #6600ff;
  border-radius: 0.2em;
  padding: 0.2em 0.4em;
  font-size: 0.7em;
  color: #9966ff;
  margin-left: 0.5em;
`;

const AnalysisStatus = styled.div<{
  status: 'analyzing' | 'completed' | 'failed';
}>`
  position: absolute;
  top: 2px;
  left: 2px;
  padding: 0.1em 0.3em;
  border-radius: 0.2em;
  font-size: 0.6em;
  font-weight: bold;
  z-index: 2;

  ${props => {
    switch (props.status) {
      case 'analyzing':
        return `
          background: rgba(255, 165, 0, 0.9);
          color: #000;
          animation: pulse 1.5s ease-in-out infinite alternate;
        `;
      case 'completed':
        return `
          background: rgba(0, 255, 0, 0.9);
          color: #000;
        `;
      case 'failed':
        return `
          background: rgba(255, 0, 0, 0.9);
          color: #fff;
        `;
      default:
        return '';
    }
  }}

  @keyframes pulse {
    from {
      opacity: 0.6;
    }
    to {
      opacity: 1;
    }
  }
`;

const QueueStatus = styled.div`
  background: rgba(255, 165, 0, 0.1);
  border: 1px solid #ffa500;
  border-radius: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 1rem;
  color: #ffa500;
  text-align: center;
  font-size: 0.9rem;
`;

const SelectedOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 255, 0, 0.3);
  border: 2px solid #0f0;
  border-radius: 0.2em;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #0f0;
`;

const SelectionInfo = styled.div`
  background: #002000;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  padding: 1em;
  margin-bottom: 1em;
  text-align: center;
`;

interface ImageGalleryProps {
  onBack: () => void;
  onImageSelect?: (images: CachedImage[]) => void; // Callback for selecting images to reuse
  allowSelection?: boolean; // Whether to allow image selection
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  onBack,
  onImageSelect,
  allowSelection = false,
}) => {
  const [images, setImages] = useState<CachedImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [cacheSize, setCacheSize] = useState(0);
  const analysisStatus = useImageAnalysis();

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'deleteImage' | 'clearAll';
    imageToDelete?: CachedImage;
  }>({
    isOpen: false,
    type: 'deleteImage',
  });

  // Load images on component mount
  useEffect(() => {
    loadImages();
    updateCacheSize();

    // Listen for cache updates (when analysis completes)
    const handleCacheUpdate = () => {
      console.log('Image cache updated, refreshing gallery...');
      loadImages();
      updateCacheSize();
    };

    window.addEventListener('image-cache-updated', handleCacheUpdate);

    return () => {
      window.removeEventListener('image-cache-updated', handleCacheUpdate);
    };
  }, []);

  const loadImages = () => {
    try {
      const cached = getImageCache();
      setImages(cached);
    } catch (error) {
      console.error('Error loading cached images:', error);
      showError('Failed to load cached images');
    }
  };

  const updateCacheSize = () => {
    setCacheSize(getImageCacheSize());
  };

  const handleSearch = () => {
    try {
      if (searchQuery.trim()) {
        const results = searchCachedImages(searchQuery.trim());
        setImages(results);
      } else {
        loadImages();
      }
    } catch (error) {
      console.error('Error searching images:', error);
      showError('Failed to search images');
    }
  };

  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) {
      showWarning('Please enter a search query');
      return;
    }

    setIsLoading(true);
    try {
      const results = await findRelevantImages(
        searchQuery.trim(),
        undefined,
        20
      );
      setImages(results);
      showInfo(`Found ${results.length} relevant images using AI search`);
    } catch (error) {
      console.error('Error with smart search:', error);
      showError('Smart search failed, falling back to basic search');
      handleSearch(); // Fallback to basic search
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageToggle = (imageId: string) => {
    if (!allowSelection) return;

    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleUseSelectedImages = () => {
    if (!onImageSelect || selectedImages.size === 0) return;

    const selectedImageObjects = images.filter(img =>
      selectedImages.has(img.id)
    );
    onImageSelect(selectedImageObjects);
    showSuccess(`Selected ${selectedImages.size} images for use`);
  };

  const handleClearSelection = () => {
    setSelectedImages(new Set());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    loadImages();
  };

  const handleViewImage = (image: CachedImage) => {
    if (image.dataUrl) {
      openImageInNewTab(image.dataUrl);
    }
  };

  const handleDeleteImage = (image: CachedImage) => {
    setConfirmDialog({
      isOpen: true,
      type: 'deleteImage',
      imageToDelete: image,
    });
  };

  const handleClearAll = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'clearAll',
    });
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmDialog.type === 'deleteImage' && confirmDialog.imageToDelete) {
        deleteCachedImage(confirmDialog.imageToDelete.id);
        showSuccess('Image deleted successfully');
      } else if (confirmDialog.type === 'clearAll') {
        clearImageCache();
        showSuccess('All cached images deleted');
      }

      loadImages();
      updateCacheSize();
      setConfirmDialog({ isOpen: false, type: 'deleteImage' });
    } catch (error) {
      console.error('Error performing action:', error);
      if (confirmDialog.type === 'deleteImage') {
        showError('Failed to delete image');
      } else {
        showError('Failed to clear image cache');
      }
      setConfirmDialog({ isOpen: false, type: 'deleteImage' });
    }
  };

  const handleCancelAction = () => {
    setConfirmDialog({ isOpen: false, type: 'deleteImage' });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <Container>
      <BackButton onClick={onBack}> Back to Settings</BackButton>

      <Title>Image Gallery & Cache Management</Title>

      <Stats>
        {images.length} images • Cache size: {formatCacheSize(cacheSize)}
      </Stats>

      {analysisStatus.isAnyAnalysisActive && (
        <QueueStatus>
          Analyzing images in background...
          {analysisStatus.status.activeTasks > 0 &&
            ` (${analysisStatus.status.activeTasks} active)`}
          {analysisStatus.status.queueLength > 0 &&
            ` (${analysisStatus.status.queueLength} queued)`}
        </QueueStatus>
      )}

      <Controls>
        <SearchInput
          type="text"
          placeholder="Search images by description..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch}>Search</Button>
        <SmartSearchButton
          onClick={handleSmartSearch}
          disabled={isLoading || !searchQuery.trim()}
        >
          {isLoading ? 'Searching...' : 'AI Search'}
        </SmartSearchButton>
        <Button onClick={handleClearSearch}>Clear Search</Button>
        <ClearButton onClick={handleClearAll} disabled={images.length === 0}>
          Clear All Images
        </ClearButton>
      </Controls>

      {allowSelection && selectedImages.size > 0 && (
        <SelectionInfo>
          <div>{selectedImages.size} images selected</div>
          <div style={{ marginTop: '0.5em' }}>
            <UseButton onClick={handleUseSelectedImages}>
              Use Selected Images
            </UseButton>
            <Button
              onClick={handleClearSelection}
              style={{ marginLeft: '0.5em' }}
            >
              Clear Selection
            </Button>
          </div>
        </SelectionInfo>
      )}

      {images.length === 0 ? (
        <EmptyState>
          {searchQuery
            ? 'No images found matching your search.'
            : 'No images in cache yet. Upload some images in your conversations!'}
        </EmptyState>
      ) : (
        <ImageGrid>
          {images.map(image => (
            <ImageCard key={image.id}>
              <div style={{ position: 'relative' }}>
                <ImagePreview
                  src={image.thumbnail || image.dataUrl}
                  alt={image.description || 'Cached image'}
                  onClick={() =>
                    allowSelection
                      ? handleImageToggle(image.id)
                      : handleViewImage(image)
                  }
                  title={
                    allowSelection
                      ? 'Click to select/deselect'
                      : 'Click to view full size'
                  }
                  style={{ cursor: allowSelection ? 'pointer' : 'zoom-in' }}
                />

                {/* Analysis Status Indicator - Only show for images without AI descriptions */}
                {!image.aiGenerated && analysisStatus.isAnyAnalysisActive && (
                  <AnalysisStatus status="analyzing">Analyzing</AnalysisStatus>
                )}

                {allowSelection && selectedImages.has(image.id) && (
                  <SelectedOverlay> Selected</SelectedOverlay>
                )}
              </div>
              <ImageInfo>
                <div>
                  <strong>Persona:</strong> {image.persona}
                </div>
                <div>
                  <strong>Uploaded:</strong> {formatDate(image.uploadedAt)}
                </div>
                {image.description && (
                  <div>
                    <strong>Description:</strong>
                    {image.aiGenerated && <AIBadge>AI Generated</AIBadge>}
                    <ScrollableDescription>
                      {typeof image.description === 'string'
                        ? image.description
                        : image.description
                          ? JSON.stringify(image.description)
                          : ''}
                    </ScrollableDescription>
                  </div>
                )}
              </ImageInfo>
              <ImageActions>
                {allowSelection ? (
                  <UseButton onClick={() => handleImageToggle(image.id)}>
                    {selectedImages.has(image.id) ? 'Deselect' : 'Select'}
                  </UseButton>
                ) : (
                  <ActionButton onClick={() => handleViewImage(image)}>
                    View Full Size
                  </ActionButton>
                )}
                <DeleteButton onClick={() => handleDeleteImage(image)}>
                  Delete
                </DeleteButton>
              </ImageActions>
            </ImageCard>
          ))}
        </ImageGrid>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={
          confirmDialog.type === 'deleteImage'
            ? 'Delete Image'
            : 'Clear All Images'
        }
        message={
          confirmDialog.type === 'deleteImage'
            ? 'Are you sure you want to delete this image? This action cannot be undone.'
            : 'Are you sure you want to delete ALL cached images? This action cannot be undone and will clear all saved images.'
        }
        confirmText={
          confirmDialog.type === 'deleteImage' ? 'Delete' : 'Clear All'
        }
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />
    </Container>
  );
};

export default ImageGallery;
