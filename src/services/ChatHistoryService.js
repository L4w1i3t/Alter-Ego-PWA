class ChatHistoryService {
  /**
   * Fetches chat history with error handling
   * @param {string} conversationId - The ID of the conversation to fetch
   * @returns {Promise<Array|null>} - The chat history or null if there was an error
   */
  static async fetchChatHistory(conversationId) {
    try {
      // Implement your fetch logic here
      const response = await fetch(`/api/conversations/${conversationId}/history`);
      
      if (!response.ok) {
        console.error(`Failed to fetch chat history: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch chat history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching chat history:', error);
      // Return null to indicate failure rather than throwing again
      return null;
    }
  }

  /**
   * Clears memory/conversation history
   * @returns {Promise<boolean>} - Success or failure of the operation
   */
  static async clearMemory() {
    try {
      // First verify current memory state
      const memoryState = await this.getMemoryState();
      
      // Implement memory clearing with verification
      const response = await fetch('/api/memory/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear memory');
      }
      
      // Verify memory was actually cleared
      const newMemoryState = await this.getMemoryState();
      
      if (newMemoryState.size > 0) {
        console.warn('Memory may not have been fully cleared');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing memory:', error);
      return false;
    }
  }
  
  /**
   * Gets the current state of memory
   * @returns {Promise<Object>} - The current memory state
   */
  static async getMemoryState() {
    try {
      const response = await fetch('/api/memory/state');
      
      if (!response.ok) {
        throw new Error('Failed to get memory state');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting memory state:', error);
      return {};
    }
  }
}

export default ChatHistoryService;
