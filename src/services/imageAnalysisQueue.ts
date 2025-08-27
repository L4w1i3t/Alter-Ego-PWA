/**
 * Background image analysis queue to prevent overwhelming the API
 */

import { analyzeAndUpdateCachedImage } from './imageAnalysisService';

interface AnalysisTask {
  imageId: string;
  imageUrl: string;
  persona: string;
  priority: number; // Higher number = higher priority
}

class ImageAnalysisQueue {
  private queue: AnalysisTask[] = [];
  private isProcessing = false;
  private maxConcurrentTasks = 2; // Limit concurrent API calls
  private activeTasks = 0;

  /**
   * Add an image to the analysis queue
   */
  public enqueue(
    imageId: string,
    imageUrl: string,
    persona: string,
    priority: number = 1
  ): void {
    const task: AnalysisTask = {
      imageId,
      imageUrl,
      persona,
      priority,
    };

    // Add to queue and sort by priority
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);

    console.log(
      `Added image ${imageId} to analysis queue (priority: ${priority})`
    );

    // Start processing if not already running
    this.processQueue();
  }

  /**
   * Process the queue with concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeTasks >= this.maxConcurrentTasks) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (
      this.queue.length > 0 &&
      this.activeTasks < this.maxConcurrentTasks
    ) {
      const task = this.queue.shift();
      if (task) {
        this.processTask(task);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single analysis task
   */
  private async processTask(task: AnalysisTask): Promise<void> {
    this.activeTasks++;

    try {
      console.log(`Starting analysis for image ${task.imageId}...`);

      await analyzeAndUpdateCachedImage(
        task.imageId,
        task.imageUrl,
        task.persona
      );

      console.log(`✅ Completed analysis for image ${task.imageId}`);

      // Dispatch a custom event that components can listen to
      window.dispatchEvent(
        new CustomEvent('image-analysis-complete', {
          detail: {
            imageId: task.imageId,
            persona: task.persona,
          },
        })
      );

      // Also dispatch an event to refresh the image gallery
      window.dispatchEvent(new CustomEvent('image-cache-updated'));
    } catch (error) {
      console.warn(`❌ Analysis failed for image ${task.imageId}:`, error);

      // Dispatch failure event
      window.dispatchEvent(
        new CustomEvent('image-analysis-failed', {
          detail: {
            imageId: task.imageId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      );
    } finally {
      this.activeTasks--;

      // Continue processing queue
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Get queue status
   */
  public getStatus(): { queueLength: number; activeTasks: number } {
    return {
      queueLength: this.queue.length,
      activeTasks: this.activeTasks,
    };
  }

  /**
   * Clear the queue (useful for cleanup or persona changes)
   */
  public clear(): void {
    this.queue = [];
    console.log('Analysis queue cleared');
  }
}

// Export a singleton instance
export const imageAnalysisQueue = new ImageAnalysisQueue();

/**
 * Convenience function to queue an image for background analysis
 */
export const queueImageForAnalysis = (
  imageId: string,
  imageUrl: string,
  persona: string,
  priority: number = 1
): void => {
  imageAnalysisQueue.enqueue(imageId, imageUrl, persona, priority);
};

/**
 * Get analysis queue status
 */
export const getAnalysisQueueStatus = () => imageAnalysisQueue.getStatus();
