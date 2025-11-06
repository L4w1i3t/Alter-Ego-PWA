/**
 * AI-powered image analysis service for generating descriptions and extracting information
 */

import { generateLightweightVision } from '../utils/openaiApi';
import { updateCachedImageDescription } from '../utils/imageUtils';

interface ImageAnalysisResult {
  description: string;
}

/**
 * Analyze an image with AI to generate a comprehensive description using minimal tokens
 */
export const analyzeImageWithAI = async (
  imageUrl: string,
  persona: string = 'ALTER EGO',
  sessionId?: string
): Promise<ImageAnalysisResult> => {
  try {
    // Simple, token-efficient prompt for image analysis
    const analysisPrompt = `Analyze this image and provide a detailed description. Respond only with valid JSON:

{
  "description": "Detailed description here"
}

Include: objects, people, setting, colors, mood, text visible. Keep under 150 words.`;

    const response = await generateLightweightVision(
      analysisPrompt,
      [imageUrl],
      'gpt-5-chat-latest',
      0.3,
      500, // Reduced max tokens
      sessionId
    );

    // Try to parse the JSON response
    try {
      // Clean the response - remove markdown formatting if present
      let cleanResponse = response.trim();

      // Remove markdown code blocks
      cleanResponse = cleanResponse.replace(/^```json\s*/i, '');
      cleanResponse = cleanResponse.replace(/^```\s*/i, '');
      cleanResponse = cleanResponse.replace(/\s*```$/i, '');

      // Try to extract JSON if it's embedded in text
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      const analysis = JSON.parse(cleanResponse);
      return {
        description: analysis.description || 'Image analyzed',
      };
    } catch (parseError) {
      // If JSON parsing fails, extract information from text response
      console.warn(
        'Could not parse JSON response, extracting from text:',
        parseError
      );
      console.warn('Raw response:', response);

      // Extract description (fallback) - try multiple patterns
      let description = 'Image analyzed';
      const descPatterns = [
        /description['":\s]*["']([^"']+)["']/i,
        /describe[ds]?['":\s]*["']([^"']+)["']/i,
        /"([^"]{20,150})"/,
      ];

      for (const pattern of descPatterns) {
        const match = response.match(pattern);
        if (match && match[1]) {
          description = match[1];
          break;
        }
      }

      // If no pattern matches, use first meaningful sentence
      if (description === 'Image analyzed') {
        const sentences = response.split(/[.!?]+/);
        const meaningfulSentence = sentences.find(
          (s: string) => s.trim().length > 20
        );
        if (meaningfulSentence) {
          description = meaningfulSentence.trim().substring(0, 150);
        }
      }

      return {
        description,
      };
    }
  } catch (error) {
    console.error('Error analyzing image with AI:', error);
    throw new Error(
      `Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Generate a short, descriptive title for an image using minimal tokens
 */
export const generateImageTitle = async (
  imageUrl: string,
  persona: string = 'ALTER EGO'
): Promise<string> => {
  try {
    const titlePrompt = `Look at this image and generate a short, descriptive title (3-6 words) that captures the main subject. Just return the title, nothing else.`;

    const response = await generateLightweightVision(
      titlePrompt,
      [imageUrl],
      'gpt-5-chat-latest',
      0.5,
      50
    );

    return response.trim().replace(/['"]/g, '');
  } catch (error) {
    console.error('Error generating image title:', error);
    return 'Untitled Image';
  }
};

/**
 * Analyze and update a cached image with AI-generated description
 */
export const analyzeAndUpdateCachedImage = async (
  imageId: string,
  imageUrl: string,
  persona: string = 'ALTER EGO'
): Promise<void> => {
  try {
    console.log(`Analyzing image ${imageId} with AI...`);

    const analysis = await analyzeImageWithAI(imageUrl, persona);

    // Update the cached image with just the description
    updateCachedImageDescription(imageId, analysis.description, []);

    console.log(`Successfully analyzed and updated image ${imageId}`);
  } catch (error) {
    console.error(`Failed to analyze image ${imageId}:`, error);
    // Don't throw here - we want the image to be saved even if analysis fails
  }
};

/**
 * Search for relevant cached images based on a query
 */
export const findRelevantImages = async (
  query: string,
  persona?: string,
  limit: number = 5
): Promise<import('../utils/imageUtils').CachedImage[]> => {
  const { searchCachedImages } = await import('../utils/imageUtils');

  // Search in cached images
  const results = searchCachedImages(query, persona);

  // Sort by relevance (more sophisticated scoring could be added)
  const sortedResults = results.sort((a, b) => {
    const queryLower = query.toLowerCase();

    // Score based on description match
    const aDescScore = a.description?.toLowerCase().includes(queryLower)
      ? 2
      : 0;
    const bDescScore = b.description?.toLowerCase().includes(queryLower)
      ? 2
      : 0;

    // Score based on tag match
    const aTagScore = a.tags?.some(tag =>
      tag.toLowerCase().includes(queryLower)
    )
      ? 1
      : 0;
    const bTagScore = b.tags?.some(tag =>
      tag.toLowerCase().includes(queryLower)
    )
      ? 1
      : 0;

    // Prefer more recent images as tiebreaker
    const aTimeScore = a.uploadedAt.getTime();
    const bTimeScore = b.uploadedAt.getTime();

    const aTotalScore = aDescScore + aTagScore;
    const bTotalScore = bDescScore + bTagScore;

    if (aTotalScore !== bTotalScore) {
      return bTotalScore - aTotalScore; // Higher score first
    }

    return bTimeScore - aTimeScore; // More recent first
  });

  return sortedResults.slice(0, limit);
};
