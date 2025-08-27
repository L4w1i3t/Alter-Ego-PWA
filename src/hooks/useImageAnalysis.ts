/**
 * Hook to track image analysis status
 */

import { useState, useEffect } from 'react';
import { getAnalysisQueueStatus } from '../services/imageAnalysisQueue';

interface AnalysisStatus {
  queueLength: number;
  activeTasks: number;
  completedImages: Set<string>;
  failedImages: Set<string>;
}

export const useImageAnalysis = () => {
  const [status, setStatus] = useState<AnalysisStatus>({
    queueLength: 0,
    activeTasks: 0,
    completedImages: new Set(),
    failedImages: new Set(),
  });

  useEffect(() => {
    // Update queue status periodically
    const updateStatus = () => {
      const queueStatus = getAnalysisQueueStatus();
      setStatus(prev => ({
        ...prev,
        queueLength: queueStatus.queueLength,
        activeTasks: queueStatus.activeTasks,
      }));
    };

    // Handle analysis completion
    const handleAnalysisComplete = (event: CustomEvent) => {
      const { imageId } = event.detail;
      setStatus(prev => {
        const newCompleted = new Set(prev.completedImages);
        newCompleted.add(imageId);
        return {
          ...prev,
          completedImages: newCompleted,
        };
      });
      updateStatus();
    };

    // Handle analysis failure
    const handleAnalysisFailure = (event: CustomEvent) => {
      const { imageId } = event.detail;
      setStatus(prev => {
        const newFailed = new Set(prev.failedImages);
        newFailed.add(imageId);
        return {
          ...prev,
          failedImages: newFailed,
        };
      });
      updateStatus();
    };

    // Set up event listeners
    window.addEventListener(
      'image-analysis-complete',
      handleAnalysisComplete as EventListener
    );
    window.addEventListener(
      'image-analysis-failed',
      handleAnalysisFailure as EventListener
    );

    // Update status initially and periodically
    updateStatus();
    const interval = setInterval(updateStatus, 2000);

    return () => {
      window.removeEventListener(
        'image-analysis-complete',
        handleAnalysisComplete as EventListener
      );
      window.removeEventListener(
        'image-analysis-failed',
        handleAnalysisFailure as EventListener
      );
      clearInterval(interval);
    };
  }, []);

  const isImageAnalyzing = (imageId: string): boolean => {
    // Only show as analyzing if we have active tasks and this image hasn't completed/failed
    return (
      (status.activeTasks > 0 || status.queueLength > 0) &&
      !status.completedImages.has(imageId) &&
      !status.failedImages.has(imageId)
    );
  };

  const isImagePendingAnalysis = (imageId: string): boolean => {
    // Image is pending if it hasn't completed, failed, and isn't currently being analyzed
    return (
      !status.completedImages.has(imageId) &&
      !status.failedImages.has(imageId) &&
      status.activeTasks === 0 &&
      status.queueLength === 0
    );
  };

  const hasImageCompleted = (imageId: string): boolean => {
    return status.completedImages.has(imageId);
  };

  const hasImageFailed = (imageId: string): boolean => {
    return status.failedImages.has(imageId);
  };

  return {
    status,
    isImageAnalyzing,
    isImagePendingAnalysis,
    hasImageCompleted,
    hasImageFailed,
    isAnyAnalysisActive: status.activeTasks > 0 || status.queueLength > 0,
  };
};
