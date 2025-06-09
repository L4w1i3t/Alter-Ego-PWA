// Enhanced Emotion Classification Service for ALTER EGO
// Analyzes text to determine emotions using 28 predefined emotion labels with robust detection

import { loadSettings } from '../utils/storageUtils';

// 28 emotion labels matching avatar sprites (excluding THINKING which is handled separately)
export const EMOTION_LABELS = [
  'admiration', 'amusement', 'anger', 'annoyance', 'approval', 'caring', 
  'confusion', 'curiosity', 'desire', 'disappointment', 'disapproval', 
  'disgust', 'embarrassment', 'excitement', 'fear', 'gratitude', 'grief', 
  'joy', 'love', 'nervousness', 'neutral', 'optimism', 'pride', 
  'realization', 'relief', 'remorse', 'sadness', 'surprise'
] as const;

export type EmotionLabel = typeof EMOTION_LABELS[number];

// Emotion categories for better classification
export const EMOTION_CATEGORIES = {
  positive: ['admiration', 'amusement', 'approval', 'caring', 'excitement', 'gratitude', 'joy', 'love', 'optimism', 'pride', 'relief'],
  negative: ['anger', 'annoyance', 'disappointment', 'disapproval', 'disgust', 'embarrassment', 'fear', 'grief', 'nervousness', 'remorse', 'sadness'],
  neutral: ['neutral', 'confusion', 'curiosity', 'realization', 'surprise'],
  mixed: ['desire']
};

// Enhanced weighted keyword patterns for emotion detection
export const EMOTION_KEYWORDS = {
  admiration: {
    strong: ['deeply admire', 'in awe of', 'incredible work', 'masterpiece', 'genius', 'phenomenal'],
    medium: ['admire', 'respect', 'impressive', 'amazing', 'wonderful', 'brilliant', 'excellent', 'outstanding', 'remarkable'],
    weak: ['good job', 'nice work', 'well done', 'pretty good', 'not bad'],
    negative_context: ['not amazing', 'not impressive', 'used to be amazing', 'fake admiration']
  },
  amusement: {
    strong: ['hilarious', 'cracking up', 'burst out laughing', 'cant stop laughing', 'rolling on floor', 'dying of laughter'],
    medium: ['funny', 'amusing', 'lol', 'haha', 'laugh', 'humorous', 'witty', 'comedy', 'joke'],
    weak: ['smile', 'chuckle', 'giggle', 'smirk', 'grin'],
    negative_context: ['not funny', 'unfunny', 'boring joke', 'fake laugh']
  },
  anger: {
    strong: ['furious', 'enraged', 'livid', 'see red', 'boiling mad', 'absolutely furious', 'rage'],
    medium: ['angry', 'mad', 'pissed off', 'irritated', 'annoyed', 'frustrated', 'upset'],
    weak: ['bothered', 'mildly annoyed', 'slightly upset', 'not pleased'],
    negative_context: ['not angry', 'calming down', 'less angry', 'used to be angry']
  },
  annoyance: {
    strong: ['extremely annoying', 'cant stand', 'driving me crazy', 'really bothering', 'fed up'],
    medium: ['annoying', 'irritating', 'frustrating', 'bothered', 'ugh', 'bothersome'],
    weak: ['slightly annoying', 'bit bothersome', 'minor irritation'],
    negative_context: ['not annoying', 'actually fine', 'getting better']
  },
  approval: {
    strong: ['absolutely', 'definitely', 'completely agree', 'totally right', 'exactly right', 'perfect'],
    medium: ['yes', 'agree', 'correct', 'right', 'approve', 'sure', 'okay', 'exactly'],
    weak: ['i guess', 'maybe', 'perhaps', 'could be', 'suppose so'],
    negative_context: ['disagree', 'wrong', 'not right', 'dont approve']
  },
  caring: {
    strong: ['deeply care', 'love you', 'here for you', 'really worried about', 'want to help', 'concern for'],
    medium: ['care about', 'concern', 'support', 'help', 'comfort', 'gentle', 'understand', 'empathy'],
    weak: ['hope youre okay', 'thinking of you', 'wish you well'],
    negative_context: ['dont care', 'not my problem', 'couldnt care less']
  },
  confusion: {
    strong: ['completely confused', 'totally lost', 'have no idea', 'dont understand at all', 'baffled'],
    medium: ['confused', 'unclear', 'dont understand', 'dont get', 'puzzled', 'perplexed', 'what'],
    weak: ['bit confused', 'not sure', 'question about', 'wondering'],
    negative_context: ['understand now', 'makes sense', 'clear now', 'figured it out']
  },
  curiosity: {
    strong: ['really curious', 'dying to know', 'fascinated by', 'must know more', 'intrigued'],
    medium: ['curious', 'wonder', 'interesting', 'tell me more', 'how does', 'what if', 'explore', 'fascinating'],
    weak: ['wondering', 'maybe curious', 'sort of interested'],
    negative_context: ['not interested', 'dont care to know', 'boring']
  },
  desire: {
    strong: ['desperately want', 'crave', 'long for', 'dream about', 'yearning for', 'burning desire'],
    medium: ['want', 'wish', 'hope', 'desire', 'would like', 'aspire'],
    weak: ['maybe want', 'might like', 'wouldnt mind'],
    negative_context: ['dont want', 'not interested', 'dont need']
  },
  disappointment: {
    strong: ['deeply disappointed', 'devastated', 'crushed', 'heartbroken', 'let down badly'],
    medium: ['disappointed', 'let down', 'expected more', 'bummed', 'underwhelmed', 'disheartened'],
    weak: ['bit disappointed', 'slightly let down', 'not quite what expected'],
    negative_context: ['not disappointed', 'actually pleased', 'better than expected']
  },
  disapproval: {
    strong: ['strongly disagree', 'absolutely wrong', 'terrible idea', 'completely reject', 'unacceptable'],
    medium: ['disagree', 'wrong', 'bad', 'disapprove', 'reject', 'awful', 'no'],
    weak: ['not sure about', 'questionable', 'doubt'],
    negative_context: ['actually approve', 'changed my mind', 'agree now']
  },
  disgust: {
    strong: ['absolutely disgusting', 'revolting', 'makes me sick', 'nauseating', 'repulsive'],
    medium: ['disgusting', 'gross', 'eww', 'yuck', 'nasty', 'repulsive'],
    weak: ['bit gross', 'not pleasant', 'icky'],
    negative_context: ['actually fine', 'not that bad', 'getting used to it']
  },
  embarrassment: {
    strong: ['mortified', 'humiliated', 'want to hide', 'so embarrassed', 'ashamed'],
    medium: ['embarrassed', 'awkward', 'cringe', 'uncomfortable'],
    weak: ['bit embarrassed', 'slightly awkward', 'little uncomfortable'],
    negative_context: ['not embarrassed', 'proud of', 'confident about']
  },
  excitement: {
    strong: ['thrilled', 'ecstatic', 'over the moon', 'cant contain excitement', 'pumped up'],
    medium: ['excited', 'pumped', 'enthusiastic', 'fantastic', 'awesome', 'amazing', 'incredible'],
    weak: ['looking forward', 'interested', 'keen'],
    negative_context: ['not excited', 'boring', 'underwhelming', 'meh']
  },
  fear: {
    strong: ['terrified', 'petrified', 'scared to death', 'absolutely terrified', 'panic'],
    medium: ['scared', 'afraid', 'frightened', 'worried', 'anxious', 'concerned'],
    weak: ['bit scared', 'slightly worried', 'little nervous'],
    negative_context: ['not scared', 'feeling brave', 'confident now']
  },
  gratitude: {
    strong: ['deeply grateful', 'so thankful', 'cant thank enough', 'eternally grateful', 'blessed'],
    medium: ['thank you', 'grateful', 'appreciate', 'thanks', 'thankful', 'much appreciated'],
    weak: ['thanks', 'cheers', 'ta'],
    negative_context: ['not thankful', 'ungrateful', 'dont appreciate']
  },
  grief: {
    strong: ['devastated', 'heartbroken', 'consumed by grief', 'inconsolable', 'mourning deeply'],
    medium: ['grieving', 'mourning', 'loss', 'died', 'death', 'bereaved', 'bereft'],
    weak: ['sad about loss', 'missing', 'remembering'],
    negative_context: ['healing', 'moving on', 'better now', 'acceptance']
  },
  joy: {
    strong: ['overjoyed', 'elated', 'blissful', 'pure happiness', 'radiating joy', 'euphoric'],
    medium: ['happy', 'joyful', 'delighted', 'cheerful', 'pleased', 'glad', 'wonderful'],
    weak: ['content', 'satisfied', 'okay', 'fine'],
    negative_context: ['not happy', 'sad', 'unhappy', 'fake happiness']
  },
  love: {
    strong: ['deeply in love', 'adore', 'head over heels', 'love with all my heart', 'soulmate'],
    medium: ['love', 'cherish', 'affection', 'romantic', 'beloved', 'treasure'],
    weak: ['like a lot', 'fond of', 'care for'],
    negative_context: ['dont love', 'falling out of love', 'hate']
  },
  nervousness: {
    strong: ['extremely nervous', 'anxiety attack', 'panic', 'terrified', 'shaking'],
    medium: ['nervous', 'anxious', 'worried', 'stressed', 'tense', 'uneasy', 'jittery'],
    weak: ['bit nervous', 'slightly anxious', 'little worried'],
    negative_context: ['calm', 'relaxed', 'not nervous', 'confident']
  },
  neutral: {
    strong: ['completely neutral', 'no opinion', 'indifferent', 'doesnt matter', 'whatever'],
    medium: ['okay', 'fine', 'alright', 'normal', 'regular', 'standard', 'average'],
    weak: ['meh', 'so-so', 'nothing special'],
    negative_context: ['strong feelings', 'care deeply', 'passionate about']
  },
  optimism: {
    strong: ['incredibly hopeful', 'bright future ahead', 'everything will be amazing', 'confident'],
    medium: ['hopeful', 'positive', 'optimistic', 'look forward', 'things will improve', 'bright side'],
    weak: ['maybe better', 'could improve', 'hopefully'],
    negative_context: ['pessimistic', 'hopeless', 'no hope', 'doubt it']
  },
  pride: {
    strong: ['extremely proud', 'bursting with pride', 'so proud', 'incredible achievement', 'triumph'],
    medium: ['proud', 'accomplished', 'achieved', 'success', 'victory', 'satisfied'],
    weak: ['did okay', 'not bad', 'decent job'],
    negative_context: ['ashamed', 'not proud', 'disappointed in', 'failed']
  },
  realization: {
    strong: ['sudden realization', 'epiphany', 'everything makes sense', 'lightbulb moment', 'breakthrough'],
    medium: ['realize', 'understand', 'aha', 'i see', 'makes sense', 'clarity', 'now i get it'],
    weak: ['starting to understand', 'beginning to see', 'think i get it'],
    negative_context: ['still confused', 'dont get it', 'makes no sense']
  },
  relief: {
    strong: ['huge relief', 'so relieved', 'weight off shoulders', 'finally over', 'massive relief'],
    medium: ['relief', 'relieved', 'better', 'finally', 'whew', 'phew'],
    weak: ['bit better', 'somewhat relieved', 'little easier'],
    negative_context: ['still worried', 'not relieved', 'still stressed']
  },
  remorse: {
    strong: ['deeply sorry', 'terrible guilt', 'so ashamed', 'regret everything', 'feel awful'],
    medium: ['sorry', 'regret', 'apologize', 'my fault', 'feel bad', 'guilty', 'remorseful'],
    weak: ['bit sorry', 'maybe shouldnt have', 'slight regret'],
    negative_context: ['not sorry', 'no regrets', 'glad i did', 'proud of it']
  },
  sadness: {
    strong: ['devastated', 'heartbroken', 'deeply depressed', 'inconsolable', 'miserable'],
    medium: ['sad', 'depressed', 'down', 'blue', 'melancholy', 'unhappy', 'sorrowful'],
    weak: ['bit sad', 'slightly down', 'little blue'],
    negative_context: ['happy', 'not sad', 'cheering up', 'better now']
  },
  surprise: {
    strong: ['absolutely shocked', 'completely unexpected', 'blown away', 'mind blown', 'astonished'],
    medium: ['surprised', 'shocked', 'unexpected', 'didnt expect', 'sudden', 'wow'],
    weak: ['bit surprised', 'somewhat unexpected', 'little shock'],
    negative_context: ['expected', 'saw it coming', 'not surprised', 'predictable']
  }
};

// Intensity modifiers for emotion strength
export const INTENSITY_MODIFIERS = {
  high: ['very', 'extremely', 'incredibly', 'really', 'so', 'absolutely', 'completely', 'totally', 'utterly', 'deeply'],
  medium: ['quite', 'pretty', 'fairly', 'somewhat', 'rather', 'moderately'],
  low: ['a bit', 'slightly', 'kind of', 'sort of', 'a little', 'somewhat', 'mildly']
};

// Context clues for better emotion detection
export const CONTEXT_PATTERNS = {
  question: ['?', 'what', 'how', 'why', 'when', 'where', 'who', 'which'],
  exclamation: ['!', 'wow', 'amazing', 'incredible', 'fantastic'],
  negation: ['not', 'no', 'never', 'dont', "don't", 'wont', "won't", 'cant', "can't", 'shouldnt', "shouldn't"]
};

// Advanced pattern matching for better emotion detection
export const EMOTION_PHRASE_PATTERNS = {
  // Multi-word phrases that indicate strong emotions
  strong_positive: [
    'over the moon', 'on cloud nine', 'walking on air', 'bursting with joy',
    'heart is full', 'couldn\'t be happier', 'dream come true', 'best day ever'
  ],
  strong_negative: [
    'worst nightmare', 'heart is broken', 'can\'t take it anymore', 'at rock bottom',
    'want to disappear', 'feel like dying', 'end of the world', 'lost all hope'
  ],
  confusion_indicators: [
    'i don\'t get it', 'makes no sense', 'confused about', 'don\'t understand',
    'what do you mean', 'can you explain', 'i\'m lost', 'not following'
  ],
  excitement_indicators: [
    'can\'t wait', 'so excited', 'this is amazing', 'absolutely love',
    'best thing ever', 'incredible news', 'fantastic idea', 'blow my mind'
  ]
};

// Emotional cues that help identify context
export const EMOTIONAL_CUES = {
  sarcasm: ['yeah right', 'sure thing', 'oh great', 'just wonderful', 'how lovely'],
  genuine_praise: ['truly amazing', 'really impressed', 'genuinely happy', 'honestly love'],
  uncertainty: ['not sure', 'maybe', 'possibly', 'might be', 'could be', 'perhaps'],
  emphasis: ['absolutely', 'definitely', 'completely', 'totally', 'entirely', 'really really']
};

// Punctuation-based emotion indicators
export const PUNCTUATION_EMOTIONS = {
  multiple_exclamation: /!{2,}/g,  // !! or more
  multiple_question: /\?{2,}/g,    // ?? or more
  caps_words: /\b[A-Z]{2,}\b/g,    // CAPS words
  ellipsis: /\.{3,}/g,             // ... or more
  repeated_letters: /(.)\1{2,}/g   // repeated letters like "nooooo"
};

/**
 * Normalizes emotion scores to percentages that sum to 100%
 */
function normalizeEmotionScores(emotions: Array<{ emotion: EmotionLabel; confidence: number }>): Array<{ emotion: EmotionLabel; confidence: number }> {
  if (emotions.length === 0) {
    return [{ emotion: 'neutral', confidence: 1.0 }];
  }

  // Calculate total confidence
  const totalConfidence = emotions.reduce((sum, e) => sum + e.confidence, 0);
  
  if (totalConfidence === 0) {
    return [{ emotion: 'neutral', confidence: 1.0 }];
  }

  // Normalize to percentages (0-1 range)
  return emotions.map(e => ({
    emotion: e.emotion,
    confidence: e.confidence / totalConfidence
  }));
}

/**
 * Formats emotions with proper percentage display
 */
function formatEmotionsWithPercentages(emotions: Array<{ emotion: EmotionLabel; confidence: number }>): string[] {
  const normalized = normalizeEmotionScores(emotions);
  
  return normalized.map(e => {
    const percentage = (e.confidence * 100);
    // Use 1 decimal place for percentages less than 10%, otherwise whole numbers
    const formattedPercentage = percentage < 10 
      ? percentage.toFixed(1) 
      : Math.round(percentage).toString();
    
    return `${e.emotion.toUpperCase()} (${formattedPercentage}%)`;
  });
}

/**
 * Advanced pattern analysis for emotion detection
 */
function analyzeAdvancedPatterns(text: string, emotionScores: Record<EmotionLabel, number>): void {
  const normalizedText = text.toLowerCase();
  
  // Complex emotional phrases
  const advancedPatterns: Record<string, { emotion: EmotionLabel; score: number }> = {
    'overwhelming joy': { emotion: 'joy', score: 0.9 },
    'deeply moved': { emotion: 'gratitude', score: 0.8 },
    'heart breaking': { emotion: 'grief', score: 0.9 },
    'cant believe': { emotion: 'surprise', score: 0.7 },
    'blown away': { emotion: 'admiration', score: 0.8 },
    'mind blown': { emotion: 'surprise', score: 0.8 },
    'fall in love': { emotion: 'love', score: 0.9 },
    'scared to death': { emotion: 'fear', score: 0.9 },
    'butterflies in stomach': { emotion: 'nervousness', score: 0.7 },
    'over the moon': { emotion: 'joy', score: 0.8 },
    'through the roof': { emotion: 'excitement', score: 0.8 }
  };
  
  Object.entries(advancedPatterns).forEach(([pattern, config]) => {
    if (normalizedText.includes(pattern)) {
      emotionScores[config.emotion] += config.score;
    }
  });
  
  // Sarcasm detection patterns
  const sarcasmPatterns = [
    'oh great',
    'just perfect',
    'how wonderful',
    'oh joy',
    'fantastic job'
  ];
  
  sarcasmPatterns.forEach(pattern => {
    if (normalizedText.includes(pattern)) {
      // Reduce positive emotions and boost negative ones
      emotionScores['joy'] *= 0.3;
      emotionScores['excitement'] *= 0.3;
      emotionScores['annoyance'] += 0.6;
      emotionScores['disapproval'] += 0.4;
    }
  });
  
  // Confusion indicators
  const confusionPatterns = [
    'i dont understand',
    'what do you mean',
    'im lost',
    'makes no sense',
    'confused about'
  ];
  
  confusionPatterns.forEach(pattern => {
    if (normalizedText.includes(pattern)) {
      emotionScores['confusion'] += 0.7;
    }
  });
}

/**
 * Punctuation-based emotion analysis
 */
function analyzePunctuationEmotions(text: string, emotionScores: Record<EmotionLabel, number>): void {
  // Multiple exclamation marks suggest high excitement
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    emotionScores['excitement'] += exclamationCount * 0.2;
    emotionScores['joy'] += exclamationCount * 0.15;
  }
  
  // Multiple question marks suggest confusion or surprise
  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount > 1) {
    emotionScores['confusion'] += questionCount * 0.25;
    emotionScores['curiosity'] += questionCount * 0.2;
  }
  
  // Ellipses suggest hesitation or sadness
  const ellipsesCount = (text.match(/\.\.\./g) || []).length;
  if (ellipsesCount > 0) {
    emotionScores['nervousness'] += ellipsesCount * 0.3;
    emotionScores['sadness'] += ellipsesCount * 0.2;
  }
  
  // ALL CAPS suggests anger or excitement
  const capsWords = text.match(/\b[A-Z]{2,}\b/g);
  if (capsWords && capsWords.length > 0) {
    const capsRatio = capsWords.length / text.split(/\s+/).length;
    if (capsRatio > 0.3) {
      emotionScores['anger'] += 0.4;
      emotionScores['excitement'] += 0.3;
    }
  }
}

/**
 * Enhanced emotion analysis with weighted keyword detection and context awareness
 */
export function analyzeEmotions(text: string): Array<{ emotion: EmotionLabel; confidence: number }> {
  if (!text || text.trim().length === 0) {
    return [{ emotion: 'neutral', confidence: 1.0 }];
  }

  const normalizedText = text.toLowerCase().trim();
  const words = normalizedText.split(/\s+/);
  const emotionScores: Record<EmotionLabel, number> = {} as Record<EmotionLabel, number>;

  // Initialize all emotions with 0 score
  EMOTION_LABELS.forEach(emotion => {
    emotionScores[emotion] = 0;
  });

  // Enhanced keyword matching with weighted scoring
  for (const [emotion, keywordGroups] of Object.entries(EMOTION_KEYWORDS)) {
    const emotionKey = emotion as EmotionLabel;
    let score = 0;
    
    // Check negative context first to reduce false positives
    const hasNegativeContext = keywordGroups.negative_context.some(negKeyword => 
      normalizedText.includes(negKeyword.toLowerCase())
    );
    
    if (hasNegativeContext) {
      // Significantly reduce score if negative context is found
      score -= 0.8;
      continue;
    }
    
    // Score weighted keywords
    keywordGroups.strong.forEach(keyword => {
      if (normalizedText.includes(keyword.toLowerCase())) {
        score += 1.0; // Strong keywords get full weight
        
        // Check for intensity modifiers
        const keywordIndex = normalizedText.indexOf(keyword.toLowerCase());
        const beforeKeyword = normalizedText.substring(Math.max(0, keywordIndex - 20), keywordIndex);
        
        if (INTENSITY_MODIFIERS.high.some(modifier => beforeKeyword.includes(modifier))) {
          score += 0.5;
        }
      }
    });
    
    keywordGroups.medium.forEach(keyword => {
      if (normalizedText.includes(keyword.toLowerCase())) {
        score += 0.6; // Medium keywords get reduced weight
        
        // Check for intensity modifiers
        const keywordIndex = normalizedText.indexOf(keyword.toLowerCase());
        const beforeKeyword = normalizedText.substring(Math.max(0, keywordIndex - 20), keywordIndex);
        
        if (INTENSITY_MODIFIERS.high.some(modifier => beforeKeyword.includes(modifier))) {
          score += 0.3;
        } else if (INTENSITY_MODIFIERS.medium.some(modifier => beforeKeyword.includes(modifier))) {
          score += 0.2;
        }
      }
    });
    
    keywordGroups.weak.forEach(keyword => {
      if (normalizedText.includes(keyword.toLowerCase())) {
        score += 0.3; // Weak keywords get minimal weight
      }
    });
      emotionScores[emotionKey] = Math.max(0, score); // Ensure non-negative scores
  }

  // Apply advanced pattern analysis
  analyzeAdvancedPatterns(text, emotionScores);
  
  // Apply punctuation-based emotion analysis
  analyzePunctuationEmotions(text, emotionScores);

  // Enhanced context analysis
  const hasQuestion = CONTEXT_PATTERNS.question.some(q => normalizedText.includes(q));
  const hasExclamation = CONTEXT_PATTERNS.exclamation.some(e => normalizedText.includes(e)) || normalizedText.includes('!');
  const hasNegation = CONTEXT_PATTERNS.negation.some(n => normalizedText.includes(n));

  // Context-based adjustments
  if (hasQuestion) {
    emotionScores['curiosity'] += 0.4;
    emotionScores['confusion'] += 0.2;
  }
  
  if (hasExclamation) {
    emotionScores['excitement'] += 0.3;
    emotionScores['surprise'] += 0.2;
    emotionScores['joy'] += 0.2;
  }
  
  if (hasNegation) {
    // More nuanced negation handling
    EMOTION_CATEGORIES.positive.forEach(emotion => {
      emotionScores[emotion as EmotionLabel] *= 0.5;
    });
    
    // Slightly boost neutral and some negative emotions
    emotionScores['neutral'] += 0.2;
    emotionScores['disappointment'] += 0.1;
  }

  // Apply confidence thresholds to reduce false positives
  const confidenceThreshold = 0.15;
  const detectedEmotions = Object.entries(emotionScores)
    .filter(([_, score]) => score > confidenceThreshold)
    .map(([emotion, score]) => ({
      emotion: emotion as EmotionLabel,
      confidence: Math.min(score / Math.max(1, words.length / 8), 1.0) // Better normalization
    }))
    .sort((a, b) => b.confidence - a.confidence);

  // Enhanced fallback logic
  if (detectedEmotions.length === 0) {
    // Analyze text characteristics for better neutral detection
    if (hasQuestion) {
      return [{ emotion: 'curiosity', confidence: 0.6 }];
    } else if (hasExclamation) {
      return [{ emotion: 'excitement', confidence: 0.5 }];
    } else {
      return [{ emotion: 'neutral', confidence: 0.8 }];
    }
  }

  // Return top emotions with better confidence distribution
  const topEmotions = detectedEmotions.slice(0, 3);
  
  // Ensure primary emotion has reasonable confidence
  if (topEmotions[0].confidence < 0.3) {
    topEmotions[0].confidence = 0.3;
  }

  return topEmotions;
}

/**
 * Gets the primary emotion from analysis results
 */
export function getPrimaryEmotion(emotions: Array<{ emotion: EmotionLabel; confidence: number }>): EmotionLabel {
  if (emotions.length === 0) {
    return 'neutral';
  }
  return emotions[0].emotion;
}

/**
 * Analyzes user input for emotions
 */
export function analyzeUserEmotions(userInput: string): {
  emotions: string[];
  primaryEmotion: EmotionLabel;
} {
  const analysis = analyzeEmotions(userInput);
  const filteredEmotions = analysis.filter(e => e.confidence > 0.1); // Lower threshold for user emotions
  
  const emotions = formatEmotionsWithPercentages(filteredEmotions);
  const primaryEmotion = getPrimaryEmotion(analysis);
  
  return {
    emotions: emotions.length > 0 ? emotions : ['NEUTRAL (100%)'],
    primaryEmotion
  };
}

/**
 * Analyzes AI response for emotions
 */
export function analyzeResponseEmotions(aiResponse: string): {
  emotions: string[];
  primaryEmotion: EmotionLabel;
} {
  const analysis = analyzeEmotions(aiResponse);
  const filteredEmotions = analysis.filter(e => e.confidence > 0.1); // Lower threshold for response emotions
  
  const emotions = formatEmotionsWithPercentages(filteredEmotions);
  const primaryEmotion = getPrimaryEmotion(analysis);
  
  return {
    emotions: emotions.length > 0 ? emotions : ['NEUTRAL (100%)'],
    primaryEmotion
  };
}

/**
 * Contextual emotion adjustment based on conversation flow
 */
function adjustEmotionsByContext(
  userInput: string, 
  aiResponse: string, 
  emotionScores: Record<EmotionLabel, number>
): void {
  const userText = userInput.toLowerCase();
  const responseText = aiResponse.toLowerCase();
  
  // If user asks a question and AI provides explanation, boost realization/understanding
  if (userText.includes('?') && (responseText.includes('because') || responseText.includes('explanation'))) {
    emotionScores['realization'] += 0.4;
  }
  
  // If user expresses problem and AI offers help, boost caring
  if ((userText.includes('problem') || userText.includes('issue') || userText.includes('struggling')) &&
      (responseText.includes('help') || responseText.includes('support'))) {
    emotionScores['caring'] += 0.5;
  }
  
  // If user expresses achievement and AI congratulates, boost pride/joy
  if ((userText.includes('achieved') || userText.includes('accomplished') || userText.includes('succeeded')) &&
      (responseText.includes('congratulations') || responseText.includes('well done'))) {
    emotionScores['pride'] += 0.6;
    emotionScores['joy'] += 0.4;
  }
}

/**
 * Advanced emotion classification using pattern matching and context
 * Avatar should reflect AI response emotions, not user emotions
 */
export function classifyConversationEmotion(userInput: string, aiResponse: string): EmotionLabel {
  const userAnalysis = analyzeEmotions(userInput);
  const responseAnalysis = analyzeEmotions(aiResponse);
  
  // Create emotion scores for contextual adjustment
  const contextualScores: Record<EmotionLabel, number> = {} as Record<EmotionLabel, number>;
  EMOTION_LABELS.forEach(emotion => {
    contextualScores[emotion] = 0;
  });
  
  // Add response emotion scores
  responseAnalysis.forEach(emotion => {
    contextualScores[emotion.emotion] += emotion.confidence;
  });
  
  // Apply contextual adjustments based on conversation flow
  adjustEmotionsByContext(userInput, aiResponse, contextualScores);
  
  // Prioritize AI response emotions for avatar display (since avatar represents AI)
  const responsePrimary = getPrimaryEmotion(responseAnalysis);
  const userPrimary = getPrimaryEmotion(userAnalysis);
  
  // Find the highest scoring emotion after contextual adjustments
  const contextualPrimary = Object.entries(contextualScores)
    .reduce((max, [emotion, score]) => 
      score > max.score ? { emotion: emotion as EmotionLabel, score } : max,
      { emotion: 'neutral' as EmotionLabel, score: 0 }
    ).emotion;
  
  // If contextual analysis found a strong emotion, use that
  if (contextualScores[contextualPrimary] > 0.4) {
    return contextualPrimary;
  }
  
  // If AI response has a strong emotion, use that
  if (responseAnalysis.length > 0 && responseAnalysis[0].confidence > 0.3) {
    return responsePrimary;
  }
  
  // If AI response is neutral but user has strong emotion, AI might mirror it appropriately
  if (responsePrimary === 'neutral' && userAnalysis.length > 0 && userAnalysis[0].confidence > 0.5) {
    // Enhanced emotion mapping for better AI responses
    const emotionMapping: Record<string, EmotionLabel> = {
      'anger': 'caring',
      'sadness': 'caring',
      'grief': 'caring', 
      'fear': 'caring',
      'nervousness': 'caring',
      'excitement': 'joy',
      'joy': 'joy',
      'gratitude': 'joy',
      'confusion': 'caring',
      'curiosity': 'neutral',
      'surprise': 'joy',
      'love': 'caring',
      'pride': 'admiration',
      'embarrassment': 'caring',
      'disappointment': 'caring',
      'remorse': 'caring'
    };
    
    return emotionMapping[userPrimary] || 'neutral';
  }
  
  // Default to AI response emotion, or neutral if none detected
  return responsePrimary;
}

/**
 * False positive reduction system
 */
function reduceFalsePositives(text: string, emotionScores: Record<EmotionLabel, number>): void {
  const normalizedText = text.toLowerCase();
  
  // Common misleading phrases that cause false positives
  const misleadingPhrases = {
    'love': ['love to hate', 'love how terrible'],
    'joy': ['joy of complaining'],
    'excitement': ['excited to complain'],
    'gratitude': ['thanks for nothing']
  };
  
  // Reduce confidence for misleading phrases
  Object.entries(misleadingPhrases).forEach(([emotion, phrases]) => {
    phrases.forEach(phrase => {
      if (normalizedText.includes(phrase)) {
        emotionScores[emotion as EmotionLabel] *= 0.2;
      }
    });
  });
  
  // Uncertainty indicators that reduce confidence
  const uncertaintyWords = ['i think', 'maybe', 'perhaps', 'might be', 'could be'];
  const uncertaintyCount = uncertaintyWords.filter(word => normalizedText.includes(word)).length;
  
  if (uncertaintyCount > 0) {
    const reductionFactor = Math.max(0.4, 1 - (uncertaintyCount * 0.2));
    Object.keys(emotionScores).forEach(emotion => {
      emotionScores[emotion as EmotionLabel] *= reductionFactor;
    });
  }
  
  // Past tense indicators (not current emotions)
  const pastTenseWords = ['used to', 'was', 'were', 'had been', 'would have'];
  const pastTenseCount = pastTenseWords.filter(word => normalizedText.includes(word)).length;
  
  if (pastTenseCount > 0) {
    const reductionFactor = Math.max(0.5, 1 - (pastTenseCount * 0.25));
    Object.keys(emotionScores).forEach(emotion => {
      emotionScores[emotion as EmotionLabel] *= reductionFactor;
    });
  }
}

/**
 * Emotion confidence calibration based on text characteristics
 */
function calibrateConfidence(
  text: string, 
  emotions: Array<{ emotion: EmotionLabel; confidence: number }>
): Array<{ emotion: EmotionLabel; confidence: number }> {
  const textLength = text.trim().split(/\s+/).length;
  const hasStrongEmotionalWords = emotions.some(e => e.confidence > 0.7);
  
  return emotions.map(emotion => {
    let adjustedConfidence = emotion.confidence;
    
    // Boost confidence for longer, more detailed text
    if (textLength > 20) {
      adjustedConfidence *= 1.2;
    } else if (textLength < 5) {
      adjustedConfidence *= 0.7; // Reduce confidence for very short text
    }
    
    // If no strong emotional indicators, be more conservative
    if (!hasStrongEmotionalWords && adjustedConfidence > 0.5) {
      adjustedConfidence *= 0.8;
    }
    
    // Ensure confidence stays within reasonable bounds
    adjustedConfidence = Math.min(1.0, Math.max(0.05, adjustedConfidence));
      return {
      emotion: emotion.emotion,
      confidence: adjustedConfidence
    };
  });
}