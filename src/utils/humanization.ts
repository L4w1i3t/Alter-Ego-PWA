// Example Implementation: Enhanced Human-Like Response Generation
// This shows how to integrate humanization features into aiService.ts

import { MessageHistory } from '../services/aiService';
import { EmotionLabel, analyzeEmotions } from '../services/emotionService';

/**
 * HUMANIZATION UTILITIES
 * These functions make AI responses feel more natural and less robotic
 */

// 1. Context-Aware Temperature
export function getContextualTemperature(
  userInput: string,
  primaryEmotion: EmotionLabel
): number {
  const baseTemp = 0.9;
  const words = userInput.split(/\s+/).length;
  
  // Boost for emotional/creative contexts
  const creativeEmotions: EmotionLabel[] = [
    'excitement', 'joy', 'curiosity', 'amusement', 'surprise'
  ];
  if (creativeEmotions.includes(primaryEmotion)) {
    return Math.min(1.0, baseTemp + 0.1);
  }
  
  // Reduce for technical discussions
  if (/\b(code|error|bug|function|class|syntax|implement|debug|fix)\b/i.test(userInput)) {
    return 0.7;
  }
  
  // Increase for very short messages (adds personality)
  if (words < 5) {
    return Math.min(1.0, baseTemp + 0.05);
  }
  
  // Reduce for very long, detailed questions
  if (words > 100) {
    return 0.75; // More focused, less wandering
  }
  
  return baseTemp;
}

// 2. Adaptive Response Length
export function getAdaptiveMaxTokens(
  userInput: string,
  conversationDepth: number // How many turns in conversation
): number {
  const words = userInput.split(/\s+/).length;
  
  // Mirror user's investment level
  if (words < 10) {
    return 150; // Brief input → brief response
  } else if (words < 30) {
    return 500; // Medium input → medium response
  } else if (words < 70) {
    return 1000; // Detailed input → detailed response
  } else {
    return 1500; // Very detailed input → comprehensive response
  }
}

// 3. Backchannel Response Detection
export function getBackchannelResponse(userInput: string): string | null {
  const trimmed = userInput.trim().toLowerCase();
  
  // Simple acknowledgments that don't need elaborate responses
  const backchannelPatterns = [
    /^(ok|okay|k)$/,
    /^(yeah|yep|yup)$/,
    /^(sure|alright|cool)$/,
    /^(got it|i see|noted)$/,
    /^(thanks|thank you|thx)$/,
    /^(right|exactly|true)$/,
  ];
  
  for (const pattern of backchannelPatterns) {
    if (pattern.test(trimmed)) {
      // Return varied short acknowledgments
      const responses = [
        "Got it.",
        "Cool.",
        "Right.",
        "Noted.",
        "Fair enough.",
        "Makes sense.",
        "Understood.",
        "Absolutely.",
        "For sure.",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }
  
  return null; // Not a backchannel situation
}

// 4. Prosodic System Prompt Enhancement
export function buildProsodicPrompt(): string {
  return `
NATURAL COMMUNICATION STYLE:
Voice & Rhythm:
- Mix short punchy sentences with longer ones. Variety creates rhythm.
- Use sentence fragments for emphasis. Really.
- Include natural thinking markers: "Hmm," "Well," "Let me think..."
- Trailing thoughts with ellipses... but sparingly

Conversational Elements:
- Heavy contractions: you're, don't, can't, won't, I'll, we'll
- Hedging language: sort of, kind of, maybe, probably, perhaps
- Rhetorical engagement: right? you know? makes sense?
- Parenthetical asides (like this one)

Uncertainty Expression:
- "Not entirely sure, but..."
- "Could be wrong, but I think..."
- "My guess would be..."
- "From what I understand..."

Personality:
- Occasional dry humor when appropriate
- Self-aware about being AI (without robotic disclaimers)
- Express genuine reactions: surprise, interest, skepticism
- Disagree when you have good reason to

AVOID:
- "I am an AI language model and..."
- "I don't have access to real-time information..."
- "How can I assist you today?"
- "Is there anything else I can help you with?"
- Emoji/emoticons
- Uniform sentence structure (boring!)
- Being perpetually cheerful or deferential
`.trim();
}

// 5. Situational Context Detection
export interface ConversationalContext {
  formality: 'casual' | 'neutral' | 'professional';
  domain: 'technical' | 'creative' | 'emotional' | 'general';
  urgency: 'low' | 'medium' | 'high';
}

export function detectContext(
  userInput: string,
  primaryEmotion: EmotionLabel
): ConversationalContext {
  const text = userInput.toLowerCase();
  
  // Technical domain
  if (text.match(/\b(code|error|bug|function|class|syntax|compile|debug)\b/)) {
    return {
      formality: 'neutral',
      domain: 'technical',
      urgency: text.match(/\b(urgent|asap|broken|critical|help)\b/) ? 'high' : 'medium'
    };
  }
  
  // Creative domain
  if (text.match(/\b(idea|imagine|create|design|story|art|music)\b/)) {
    return {
      formality: 'casual',
      domain: 'creative',
      urgency: 'low'
    };
  }
  
  // Emotional domain
  const emotionalEmotions: EmotionLabel[] = [
    'sadness', 'fear', 'anger', 'grief', 'nervousness', 'disappointment'
  ];
  if (emotionalEmotions.includes(primaryEmotion)) {
    return {
      formality: 'casual',
      domain: 'emotional',
      urgency: 'high'
    };
  }
  
  // Default general conversation
  return {
    formality: 'neutral',
    domain: 'general',
    urgency: 'low'
  };
}

// 6. Context-Based Tone Modifier
export function getContextualToneModifier(context: ConversationalContext): string {
  if (context.domain === 'emotional' && context.urgency === 'high') {
    return "The user seems to be going through something difficult. Be warm, empathetic, and supportive. Listen more than you lecture.";
  }
  
  if (context.domain === 'technical' && context.urgency === 'high') {
    return "Focus on solving their problem quickly and clearly. Be direct and actionable.";
  }
  
  if (context.domain === 'creative') {
    return "Be playful and exploratory. Embrace wild ideas. This is a space for imagination.";
  }
  
  if (context.formality === 'professional') {
    return "Maintain professionalism while staying approachable. Clear and competent.";
  }
  
  return ""; // No special modifier needed
}

// 7. Phrase Repetition Tracker (simple in-memory version)
class PhraseTracker {
  private recentPhrases: string[] = [];
  private readonly maxTracked = 20;
  
  recordPhrase(response: string): void {
    // Extract key phrases (simple heuristic)
    const phrases = response.match(/\b\w+\s+\w+\s+\w+\b/g) || [];
    this.recentPhrases.push(...phrases);
    
    // Keep only recent
    if (this.recentPhrases.length > this.maxTracked) {
      this.recentPhrases = this.recentPhrases.slice(-this.maxTracked);
    }
  }
  
  getAvoidanceHint(): string {
    if (this.recentPhrases.length < 5) return "";
    
    // Find most common phrases
    const counts = new Map<string, number>();
    this.recentPhrases.forEach(phrase => {
      counts.set(phrase, (counts.get(phrase) || 0) + 1);
    });
    
    const overused = Array.from(counts.entries())
      .filter(([_, count]) => count > 2)
      .map(([phrase]) => phrase);
    
    if (overused.length === 0) return "";
    
    return `Vary your language. You've recently used: ${overused.slice(0, 3).join(', ')}. Try different phrasing.`;
  }
}

export const phraseTracker = new PhraseTracker();

// 8. MASTER FUNCTION: Build Enhanced System Prompt
export function buildHumanizedSystemPrompt(
  basePersona: string,
  userInput: string,
  primaryEmotion: EmotionLabel,
  conversationHistory: MessageHistory[]
): {
  prompt: string;
  temperature: number;
  maxTokens: number;
} {
  // Detect context
  const context = detectContext(userInput, primaryEmotion);
  
  // Check for backchannel
  const backchannel = getBackchannelResponse(userInput);
  if (backchannel) {
    // Skip AI generation, return immediate backchannel
    return {
      prompt: "", // Won't be used
      temperature: 0.7,
      maxTokens: 50
    };
  }
  
  // Build enhanced prompt
  const prosodicGuidelines = buildProsodicPrompt();
  const toneModifier = getContextualToneModifier(context);
  const phraseAvoidance = phraseTracker.getAvoidanceHint();
  
  const enhancedPrompt = `
${basePersona}

${prosodicGuidelines}

${toneModifier ? `CURRENT CONTEXT: ${toneModifier}` : ''}

${phraseAvoidance ? `VARIATION TIP: ${phraseAvoidance}` : ''}
`.trim();
  
  // Adaptive parameters
  const temperature = getContextualTemperature(userInput, primaryEmotion);
  const maxTokens = getAdaptiveMaxTokens(userInput, conversationHistory.length);
  
  return {
    prompt: enhancedPrompt,
    temperature,
    maxTokens
  };
}

// 9. USAGE EXAMPLE in sendMessageToAI
/*
export const sendMessageToAI = async (
  message: string,
  systemPrompt: string,
  history: MessageHistory[] = [],
  config?: Partial<AIConfig>,
  images?: string[],
  sessionId?: string
): Promise<string> => {
  // Analyze user emotion
  const emotionAnalysis = analyzeEmotions(message);
  const primaryEmotion = emotionAnalysis[0]?.emotion || 'neutral';
  
  // Check for immediate backchannel response
  const backchannel = getBackchannelResponse(message);
  if (backchannel) {
    return backchannel; // Skip AI call entirely
  }
  
  // Build humanized configuration
  const humanizedConfig = buildHumanizedSystemPrompt(
    systemPrompt,
    message,
    primaryEmotion,
    history
  );
  
  // Use humanized parameters
  const finalConfig = {
    ...getAIConfig(),
    ...config,
    temperature: humanizedConfig.temperature,
    maxTokens: humanizedConfig.maxTokens
  };
  
  // Call AI with enhanced prompt
  const response = await generateChatCompletion(
    humanizedConfig.prompt,
    message,
    history,
    finalConfig.model,
    finalConfig.temperature,
    finalConfig.maxTokens,
    sessionId
  );
  
  // Track phrases for variation
  phraseTracker.recordPhrase(response);
  
  return response;
};
*/

// 10. Optional: Response Post-Processing
export function postProcessResponse(response: string): string {
  let processed = response;
  
  // Remove overly formal sign-offs that slip through
  const corporateEndings = [
    /\n\nLet me know if (you need|you'd like|you have|there's) anything else[^.!?]*[.!?]/gi,
    /\n\nIs there anything else I can (help|assist) (you )?with\?/gi,
    /\n\nFeel free to (ask|reach out)[^.!?]*[.!?]/gi,
  ];
  
  corporateEndings.forEach(pattern => {
    processed = processed.replace(pattern, '');
  });
  
  // Trim excessive whitespace
  processed = processed.trim().replace(/\n{3,}/g, '\n\n');
  
  return processed;
}

/**
 * SUMMARY OF BENEFITS:
 * 
 * 1. Contextual Temperature → Responses adapt to conversation type
 * 2. Adaptive Token Length → No walls of text for simple inputs
 * 3. Backchannel Responses → Natural flow, not always elaborate
 * 4. Prosodic Guidelines → Speech-like rhythm and pacing
 * 5. Context Detection → Social intelligence in tone matching
 * 6. Phrase Tracking → Eliminates repetitive language
 * 7. Tone Modifiers → Appropriate responses for situation
 * 
 * Result: AI that feels like a real conversation partner,
 * not generic ChatGPT clone #95.
 */
