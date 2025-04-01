/**
 * Utility functions for memory management
 */
export default class MemoryUtils {
  /**
   * Verifies if memory has been properly cleared
   * @returns {Promise<boolean>} True if memory is empty, false otherwise
   */
  static async verifyMemoryCleared() {
    try {
      const response = await fetch('/api/memory/state');
      if (!response.ok) {
        console.error('Failed to verify memory state');
        return false;
      }
      
      const memoryState = await response.json();
      // Check if memory is empty based on your application's memory structure
      return Object.keys(memoryState).length === 0 || 
             (memoryState.conversations && memoryState.conversations.length === 0);
    } catch (error) {
      console.error('Error verifying memory state:', error);
      return false;
    }
  }
  
  /**
   * Force clears memory with multiple approaches to ensure it works
   * @returns {Promise<boolean>} Success status of the operation
   */
  static async forceClearMemory() {
    try {
      // Try multiple approaches to clear memory
      
      // Approach 1: Standard API call
      const standardClear = await fetch('/api/memory/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Approach 2: Reset specific memory sections if the first approach fails
      if (!standardClear.ok) {
        console.warn('Standard memory clear failed, trying alternative approach');
        
        // Clear conversations specifically
        await fetch('/api/conversations/clear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Clear other memory sections as needed
        await fetch('/api/memory/reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Verify memory is actually cleared
      return await this.verifyMemoryCleared();
    } catch (error) {
      console.error('Failed to force clear memory:', error);
      return false;
    }
  }
}
