/**
 * Centralized token tracking system for clear cost visibility
 */

import { getTokenSummaries, saveTokenSummaries } from './storageUtils';

interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

interface QueryTokens {
  sessionId: string;
  startTime: number;
  conversation?: TokenUsage;
  imageAnalysis?: TokenUsage;
  textGeneration?: TokenUsage;
}

class TokenTracker {
  private activeQueries = new Map<string, QueryTokens>();

  /**
   * Start tracking tokens for a new query
   */
  startQuery(sessionId: string): void {
    this.activeQueries.set(sessionId, {
      sessionId,
      startTime: Date.now(),
    });
  }

  /**
   * Reset all in-memory tracking state
   */
  reset(): void {
    this.activeQueries.clear();
  }

  /**
   * Add token usage for a specific type
   */
  addTokens(
    sessionId: string,
    type: 'conversation' | 'imageAnalysis' | 'textGeneration',
    prompt: number,
    completion: number
  ): void {
    const query = this.activeQueries.get(sessionId);
    if (!query) return;

    query[type] = {
      prompt,
      completion,
      total: prompt + completion,
    };
  }

  /**
   * Complete tracking and log comprehensive summary
   */
  completeQuery(sessionId: string): void {
    const query = this.activeQueries.get(sessionId);
    if (!query) return;

    const totalTime = Date.now() - query.startTime;
    let totalTokens = 0;
    let totalPrompt = 0;
    let totalCompletion = 0;

    // Calculate totals
    if (query.conversation) {
      totalTokens += query.conversation.total;
      totalPrompt += query.conversation.prompt;
      totalCompletion += query.conversation.completion;
    }
    if (query.imageAnalysis) {
      totalTokens += query.imageAnalysis.total;
      totalPrompt += query.imageAnalysis.prompt;
      totalCompletion += query.imageAnalysis.completion;
    }
    if (query.textGeneration) {
      totalTokens += query.textGeneration.total;
      totalPrompt += query.textGeneration.prompt;
      totalCompletion += query.textGeneration.completion;
    }

    // Log clean summary
    console.log(' ===== QUERY TOKEN SUMMARY =====');
    console.log(` Total Time: ${totalTime}ms`);
    console.log(` TOTAL TOKENS: ${totalTokens}`);
    console.log(`    Prompt: ${totalPrompt} |  Completion: ${totalCompletion}`);
    console.log('');

    // Breakdown by component
    if (query.conversation) {
      const hasImages = query.imageAnalysis ? ' (with images)' : '';
      console.log(
        ` Conversation${hasImages}: ${query.conversation.total} tokens`
      );
      console.log(
        `   (${query.conversation.prompt} prompt + ${query.conversation.completion} completion)`
      );
    }

    if (query.imageAnalysis) {
      console.log(` Image Analysis: ${query.imageAnalysis.total} tokens`);
      console.log(
        `   (${query.imageAnalysis.prompt} prompt + ${query.imageAnalysis.completion} completion)`
      );
    }

    if (query.textGeneration) {
      console.log(` Text Generation: ${query.textGeneration.total} tokens`);
      console.log(
        `   (${query.textGeneration.prompt} prompt + ${query.textGeneration.completion} completion)`
      );
    }

    console.log(' ================================');

    // Store for analytics
    this.logToStorage(query, totalTokens, totalPrompt, totalCompletion);

    // Clean up
    this.activeQueries.delete(sessionId);
  }

  /**
   * Store token usage for long-term analytics
   */
  private logToStorage(
    query: QueryTokens,
    totalTokens: number,
    totalPrompt: number,
    totalCompletion: number
  ): void {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        sessionId: query.sessionId,
        totalTokens,
        totalPrompt,
        totalCompletion,
        breakdown: {
          conversation: query.conversation?.total || 0,
          imageAnalysis: query.imageAnalysis?.total || 0,
          textGeneration: query.textGeneration?.total || 0,
        },
      };

      const existing = JSON.parse(getTokenSummaries() || '[]');
      existing.push(entry);

      // Keep only last 100 entries
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
      }

      saveTokenSummaries(JSON.stringify(existing));
    } catch (error) {
      console.error('Error storing token summary:', error);
    }
  }

  /**
   * Get token usage statistics
   */
  getStats(): {
    totalTokensToday: number;
    averagePerQuery: number;
    queriesCount: number;
  } {
    try {
      const entries = JSON.parse(getTokenSummaries() || '[]');
      const today = new Date().toDateString();
      const todayEntries = entries.filter(
        (entry: any) => new Date(entry.timestamp).toDateString() === today
      );

      const totalTokensToday = todayEntries.reduce(
        (sum: number, entry: any) => sum + entry.totalTokens,
        0
      );
      const queriesCount = todayEntries.length;
      const averagePerQuery =
        queriesCount > 0 ? Math.round(totalTokensToday / queriesCount) : 0;

      return {
        totalTokensToday,
        averagePerQuery,
        queriesCount,
      };
    } catch {
      return { totalTokensToday: 0, averagePerQuery: 0, queriesCount: 0 };
    }
  }
}

// Export singleton instance
export const tokenTracker = new TokenTracker();
