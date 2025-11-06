// Enhanced Emotion Classification Service for ALTER EGO
// Analyzes text to determine emotions using 28 predefined emotion labels with robust detection

import { loadSettings } from '../utils/storageUtils';

// 28 emotion labels matching avatar sprites (excluding THINKING which is handled separately)
export const EMOTION_LABELS = [
  'admiration',
  'amusement',
  'anger',
  'annoyance',
  'approval',
  'caring',
  'confusion',
  'curiosity',
  'desire',
  'disappointment',
  'disapproval',
  'disgust',
  'embarrassment',
  'excitement',
  'fear',
  'gratitude',
  'grief',
  'joy',
  'love',
  'nervousness',
  'neutral',
  'optimism',
  'pride',
  'realization',
  'relief',
  'remorse',
  'sadness',
  'surprise',
] as const;

export type EmotionLabel = (typeof EMOTION_LABELS)[number];

// Emotion categories for better classification
export const EMOTION_CATEGORIES = {
  positive: [
    'admiration',
    'amusement',
    'approval',
    'caring',
    'excitement',
    'gratitude',
    'joy',
    'love',
    'optimism',
    'pride',
    'relief',
  ],
  negative: [
    'anger',
    'annoyance',
    'disappointment',
    'disapproval',
    'disgust',
    'embarrassment',
    'fear',
    'grief',
    'nervousness',
    'remorse',
    'sadness',
  ],
  neutral: ['neutral', 'confusion', 'curiosity', 'realization', 'surprise'],
  mixed: ['desire'],
};

// Enhanced weighted keyword patterns for emotion detection
export const EMOTION_KEYWORDS = {
  admiration: {
    strong: [
      'deeply admire',
      'in awe of',
      'incredible work',
      'masterpiece',
      'genius',
      'phenomenal',
    ],
    medium: [
      'admire',
      'respect',
      'impressive',
      'amazing',
      'wonderful',
      'brilliant',
      'excellent',
      'outstanding',
      'remarkable',
    ],
    weak: ['good job', 'nice work', 'well done', 'pretty good', 'not bad'],
    negative_context: [
      'not amazing',
      'not impressive',
      'used to be amazing',
      'fake admiration',
    ],
  },
  amusement: {
    strong: [
      'hilarious',
      'cracking up',
      'burst out laughing',
      'cant stop laughing',
      'rolling on floor',
      'dying of laughter',
    ],
    medium: [
      'funny',
      'amusing',
      'lol',
      'haha',
      'laugh',
      'humorous',
      'witty',
      'comedy',
      'joke',
    ],
    weak: ['smile', 'chuckle', 'giggle', 'smirk', 'grin'],
    negative_context: ['not funny', 'unfunny', 'boring joke', 'fake laugh'],
  },
  anger: {
    strong: [
      'furious',
      'enraged',
      'livid',
      'see red',
      'boiling mad',
      'absolutely furious',
      'rage',
    ],
    medium: [
      'angry',
      'mad',
      'pissed off',
      'irritated',
      'annoyed',
      'frustrated',
      'upset',
    ],
    weak: ['bothered', 'mildly annoyed', 'slightly upset', 'not pleased'],
    negative_context: [
      'not angry',
      'calming down',
      'less angry',
      'used to be angry',
    ],
  },
  annoyance: {
    strong: [
      'extremely annoying',
      'cant stand',
      'driving me crazy',
      'really bothering',
      'fed up',
    ],
    medium: [
      'annoying',
      'irritating',
      'frustrating',
      'bothered',
      'ugh',
      'bothersome',
    ],
    weak: ['slightly annoying', 'bit bothersome', 'minor irritation'],
    negative_context: ['not annoying', 'actually fine', 'getting better'],
  },
  approval: {
    strong: [
      'absolutely',
      'definitely',
      'completely agree',
      'totally right',
      'exactly right',
      'perfect',
    ],
    medium: [
      'yes',
      'agree',
      'correct',
      'right',
      'approve',
      'sure',
      'okay',
      'exactly',
    ],
    weak: ['i guess', 'maybe', 'perhaps', 'could be', 'suppose so'],
    negative_context: ['disagree', 'wrong', 'not right', 'dont approve'],
  },
  caring: {
    strong: [
      'deeply care',
      'love you',
      'here for you',
      'really worried about',
      'want to help',
      'concern for',
    ],
    medium: [
      'care about',
      'concern',
      'support',
      'help',
      'comfort',
      'gentle',
      'understand',
      'empathy',
    ],
    weak: ['hope youre okay', 'thinking of you', 'wish you well'],
    negative_context: ['dont care', 'not my problem', 'couldnt care less'],
  },
  confusion: {
    strong: [
      'completely confused',
      'totally lost',
      'have no idea',
      'dont understand at all',
      'baffled',
    ],
    medium: [
      'confused',
      'unclear',
      'dont understand',
      'dont get',
      'puzzled',
      'perplexed',
      'what',
    ],
    weak: ['bit confused', 'not sure', 'question about', 'wondering'],
    negative_context: [
      'understand now',
      'makes sense',
      'clear now',
      'figured it out',
    ],
  },
  curiosity: {
    strong: [
      'really curious',
      'dying to know',
      'fascinated by',
      'must know more',
      'intrigued',
    ],
    medium: [
      'curious',
      'wonder',
      'interesting',
      'tell me more',
      'how does',
      'what if',
      'explore',
      'fascinating',
    ],
    weak: ['wondering', 'maybe curious', 'sort of interested'],
    negative_context: ['not interested', 'dont care to know', 'boring'],
  },
  desire: {
    strong: [
      'desperately want',
      'crave',
      'long for',
      'dream about',
      'yearning for',
      'burning desire',
    ],
    medium: ['want', 'wish', 'hope', 'desire', 'would like', 'aspire'],
    weak: ['maybe want', 'might like', 'wouldnt mind'],
    negative_context: ['dont want', 'not interested', 'dont need'],
  },
  disappointment: {
    strong: [
      'deeply disappointed',
      'devastated',
      'crushed',
      'heartbroken',
      'let down badly',
    ],
    medium: [
      'disappointed',
      'let down',
      'expected more',
      'bummed',
      'underwhelmed',
      'disheartened',
    ],
    weak: ['bit disappointed', 'slightly let down', 'not quite what expected'],
    negative_context: [
      'not disappointed',
      'actually pleased',
      'better than expected',
    ],
  },
  disapproval: {
    strong: [
      'strongly disagree',
      'absolutely wrong',
      'terrible idea',
      'completely reject',
      'unacceptable',
    ],
    medium: ['disagree', 'wrong', 'bad', 'disapprove', 'reject', 'awful', 'no'],
    weak: ['not sure about', 'questionable', 'doubt'],
    negative_context: ['actually approve', 'changed my mind', 'agree now'],
  },
  disgust: {
    strong: [
      'absolutely disgusting',
      'revolting',
      'makes me sick',
      'nauseating',
      'repulsive',
    ],
    medium: ['disgusting', 'gross', 'eww', 'yuck', 'nasty', 'repulsive'],
    weak: ['bit gross', 'not pleasant', 'icky'],
    negative_context: ['actually fine', 'not that bad', 'getting used to it'],
  },
  embarrassment: {
    strong: [
      'mortified',
      'humiliated',
      'want to hide',
      'so embarrassed',
      'ashamed',
    ],
    medium: ['embarrassed', 'awkward', 'cringe', 'uncomfortable'],
    weak: ['bit embarrassed', 'slightly awkward', 'little uncomfortable'],
    negative_context: ['not embarrassed', 'proud of', 'confident about'],
  },
  excitement: {
    strong: [
      'thrilled',
      'ecstatic',
      'over the moon',
      'cant contain excitement',
      'pumped up',
    ],
    medium: [
      'excited',
      'pumped',
      'enthusiastic',
      'fantastic',
      'awesome',
      'amazing',
      'incredible',
    ],
    weak: ['looking forward', 'interested', 'keen'],
    negative_context: ['not excited', 'boring', 'underwhelming', 'meh'],
  },
  fear: {
    strong: [
      'terrified',
      'petrified',
      'scared to death',
      'absolutely terrified',
      'panic',
    ],
    medium: [
      'scared',
      'afraid',
      'frightened',
      'worried',
      'anxious',
      'concerned',
    ],
    weak: ['bit scared', 'slightly worried', 'little nervous'],
    negative_context: ['not scared', 'feeling brave', 'confident now'],
  },
  gratitude: {
    strong: [
      'deeply grateful',
      'so thankful',
      'cant thank enough',
      'eternally grateful',
      'blessed',
    ],
    medium: [
      'thank you',
      'grateful',
      'appreciate',
      'thanks',
      'thankful',
      'much appreciated',
    ],
    weak: ['thanks', 'cheers', 'ta'],
    negative_context: ['not thankful', 'ungrateful', 'dont appreciate'],
  },
  grief: {
    strong: [
      'devastated',
      'heartbroken',
      'consumed by grief',
      'inconsolable',
      'mourning deeply',
    ],
    medium: [
      'grieving',
      'mourning',
      'loss',
      'died',
      'death',
      'bereaved',
      'bereft',
    ],
    weak: ['sad about loss', 'missing', 'remembering'],
    negative_context: ['healing', 'moving on', 'better now', 'acceptance'],
  },
  joy: {
    strong: [
      'overjoyed',
      'elated',
      'blissful',
      'pure happiness',
      'radiating joy',
      'euphoric',
    ],
    medium: [
      'happy',
      'joyful',
      'delighted',
      'cheerful',
      'pleased',
      'glad',
      'wonderful',
    ],
    weak: ['content', 'satisfied', 'okay', 'fine'],
    negative_context: ['not happy', 'sad', 'unhappy', 'fake happiness'],
  },
  love: {
    strong: [
      'deeply in love',
      'adore',
      'head over heels',
      'love with all my heart',
      'soulmate',
    ],
    medium: ['love', 'cherish', 'affection', 'romantic', 'beloved', 'treasure'],
    weak: ['like a lot', 'fond of', 'care for'],
    negative_context: ['dont love', 'falling out of love', 'hate'],
  },
  nervousness: {
    strong: [
      'extremely nervous',
      'anxiety attack',
      'panic',
      'terrified',
      'shaking',
    ],
    medium: [
      'nervous',
      'anxious',
      'worried',
      'stressed',
      'tense',
      'uneasy',
      'jittery',
    ],
    weak: ['bit nervous', 'slightly anxious', 'little worried'],
    negative_context: ['calm', 'relaxed', 'not nervous', 'confident'],
  },
  neutral: {
    strong: [
      'completely neutral',
      'no opinion',
      'indifferent',
      'doesnt matter',
      'whatever',
    ],
    medium: [
      'okay',
      'fine',
      'alright',
      'normal',
      'regular',
      'standard',
      'average',
    ],
    weak: ['meh', 'so-so', 'nothing special'],
    negative_context: ['strong feelings', 'care deeply', 'passionate about'],
  },
  optimism: {
    strong: [
      'incredibly hopeful',
      'bright future ahead',
      'everything will be amazing',
      'confident',
    ],
    medium: [
      'hopeful',
      'positive',
      'optimistic',
      'look forward',
      'things will improve',
      'bright side',
    ],
    weak: ['maybe better', 'could improve', 'hopefully'],
    negative_context: ['pessimistic', 'hopeless', 'no hope', 'doubt it'],
  },
  pride: {
    strong: [
      'extremely proud',
      'bursting with pride',
      'so proud',
      'incredible achievement',
      'triumph',
    ],
    medium: [
      'proud',
      'accomplished',
      'achieved',
      'success',
      'victory',
      'satisfied',
    ],
    weak: ['did okay', 'not bad', 'decent job'],
    negative_context: ['ashamed', 'not proud', 'disappointed in', 'failed'],
  },
  realization: {
    strong: [
      'sudden realization',
      'epiphany',
      'everything makes sense',
      'lightbulb moment',
      'breakthrough',
    ],
    medium: [
      'realize',
      'understand',
      'aha',
      'i see',
      'makes sense',
      'clarity',
      'now i get it',
    ],
    weak: ['starting to understand', 'beginning to see', 'think i get it'],
    negative_context: ['still confused', 'dont get it', 'makes no sense'],
  },
  relief: {
    strong: [
      'huge relief',
      'so relieved',
      'weight off shoulders',
      'finally over',
      'massive relief',
    ],
    medium: ['relief', 'relieved', 'better', 'finally', 'whew', 'phew'],
    weak: ['bit better', 'somewhat relieved', 'little easier'],
    negative_context: ['still worried', 'not relieved', 'still stressed'],
  },
  remorse: {
    strong: [
      'deeply sorry',
      'terrible guilt',
      'so ashamed',
      'regret everything',
      'feel awful',
    ],
    medium: [
      'sorry',
      'regret',
      'apologize',
      'my fault',
      'feel bad',
      'guilty',
      'remorseful',
    ],
    weak: ['bit sorry', 'maybe shouldnt have', 'slight regret'],
    negative_context: ['not sorry', 'no regrets', 'glad i did', 'proud of it'],
  },
  sadness: {
    strong: [
      'devastated',
      'heartbroken',
      'deeply depressed',
      'inconsolable',
      'miserable',
    ],
    medium: [
      'sad',
      'depressed',
      'down',
      'blue',
      'melancholy',
      'unhappy',
      'sorrowful',
    ],
    weak: ['bit sad', 'slightly down', 'little blue'],
    negative_context: ['happy', 'not sad', 'cheering up', 'better now'],
  },
  surprise: {
    strong: [
      'absolutely shocked',
      'completely unexpected',
      'blown away',
      'mind blown',
      'astonished',
    ],
    medium: [
      'surprised',
      'shocked',
      'unexpected',
      'didnt expect',
      'sudden',
      'wow',
    ],
    weak: ['bit surprised', 'somewhat unexpected', 'little shock'],
    negative_context: [
      'expected',
      'saw it coming',
      'not surprised',
      'predictable',
    ],
  },
};

// Intensity modifiers for emotion strength
export const INTENSITY_MODIFIERS = {
  high: [
    'very',
    'extremely',
    'incredibly',
    'really',
    'so',
    'absolutely',
    'completely',
    'totally',
    'utterly',
    'deeply',
  ],
  medium: ['quite', 'pretty', 'fairly', 'somewhat', 'rather', 'moderately'],
  low: [
    'a bit',
    'slightly',
    'kind of',
    'sort of',
    'a little',
    'somewhat',
    'mildly',
  ],
};

// Context clues for better emotion detection
export const CONTEXT_PATTERNS = {
  question: ['?', 'what', 'how', 'why', 'when', 'where', 'who', 'which'],
  exclamation: ['!', 'wow', 'amazing', 'incredible', 'fantastic'],
  negation: [
    'not',
    'no',
    'never',
    'dont',
    "don't",
    'wont',
    "won't",
    'cant',
    "can't",
    'shouldnt',
    "shouldn't",
  ],
};

// Advanced pattern matching for better emotion detection
export const EMOTION_PHRASE_PATTERNS = {
  // Multi-word phrases that indicate strong emotions
  strong_positive: [
    'over the moon',
    'on cloud nine',
    'walking on air',
    'bursting with joy',
    'heart is full',
    "couldn't be happier",
    'dream come true',
    'best day ever',
  ],
  strong_negative: [
    'worst nightmare',
    'heart is broken',
    "can't take it anymore",
    'at rock bottom',
    'want to disappear',
    'feel like dying',
    'end of the world',
    'lost all hope',
  ],
  confusion_indicators: [
    "i don't get it",
    'makes no sense',
    'confused about',
    "don't understand",
    'what do you mean',
    'can you explain',
    "i'm lost",
    'not following',
  ],
  excitement_indicators: [
    "can't wait",
    'so excited',
    'this is amazing',
    'absolutely love',
    'best thing ever',
    'incredible news',
    'fantastic idea',
    'blow my mind',
  ],
};

// Emotional cues that help identify context
export const EMOTIONAL_CUES = {
  sarcasm: [
    'yeah right',
    'sure thing',
    'oh great',
    'just wonderful',
    'how lovely',
  ],
  genuine_praise: [
    'truly amazing',
    'really impressed',
    'genuinely happy',
    'honestly love',
  ],
  uncertainty: [
    'not sure',
    'maybe',
    'possibly',
    'might be',
    'could be',
    'perhaps',
  ],
  emphasis: [
    'absolutely',
    'definitely',
    'completely',
    'totally',
    'entirely',
    'really really',
  ],
};

// Emoji-to-emotion mapping for user input analysis
export const EMOJI_EMOTIONS: Record<string, { emotion: EmotionLabel; weight: number }> = {
  // Joy/Happiness
  '😊': { emotion: 'joy', weight: 0.8 },
  '😀': { emotion: 'joy', weight: 0.7 },
  '😃': { emotion: 'joy', weight: 0.7 },
  '😄': { emotion: 'joy', weight: 0.8 },
  '😁': { emotion: 'joy', weight: 0.7 },
  '🙂': { emotion: 'joy', weight: 0.6 },
  '😆': { emotion: 'amusement', weight: 0.8 },
  '😂': { emotion: 'amusement', weight: 0.9 },
  '🤣': { emotion: 'amusement', weight: 0.9 },
  '😸': { emotion: 'joy', weight: 0.7 },
  '😺': { emotion: 'joy', weight: 0.6 },
  
  // Love/Affection
  '😍': { emotion: 'love', weight: 0.9 },
  '🥰': { emotion: 'love', weight: 0.9 },
  '😘': { emotion: 'love', weight: 0.8 },
  '💕': { emotion: 'love', weight: 0.8 },
  '❤️': { emotion: 'love', weight: 0.9 },
  '💖': { emotion: 'love', weight: 0.8 },
  '💗': { emotion: 'love', weight: 0.8 },
  '💓': { emotion: 'love', weight: 0.8 },
  
  // Excitement
  '🤩': { emotion: 'excitement', weight: 0.9 },
  '😮': { emotion: 'surprise', weight: 0.7 },
  '🎉': { emotion: 'excitement', weight: 0.8 },
  '🎊': { emotion: 'excitement', weight: 0.7 },
  '✨': { emotion: 'excitement', weight: 0.6 },
  
  // Sadness/Grief
  '😢': { emotion: 'sadness', weight: 0.8 },
  '😭': { emotion: 'grief', weight: 0.9 },
  '😿': { emotion: 'sadness', weight: 0.7 },
  '💔': { emotion: 'grief', weight: 0.8 },
  '😔': { emotion: 'sadness', weight: 0.7 },
  '😞': { emotion: 'disappointment', weight: 0.7 },
  '😟': { emotion: 'sadness', weight: 0.6 },
  
  // Anger/Annoyance
  '😠': { emotion: 'anger', weight: 0.8 },
  '😡': { emotion: 'anger', weight: 0.9 },
  '🤬': { emotion: 'anger', weight: 0.9 },
  '😤': { emotion: 'annoyance', weight: 0.7 },
  '💢': { emotion: 'anger', weight: 0.7 },
  
  // Fear/Nervousness
  '😨': { emotion: 'fear', weight: 0.8 },
  '😰': { emotion: 'nervousness', weight: 0.8 },
  '😱': { emotion: 'fear', weight: 0.9 },
  '😖': { emotion: 'nervousness', weight: 0.7 },
  
  // Confusion
  '😕': { emotion: 'confusion', weight: 0.7 },
  '🤔': { emotion: 'curiosity', weight: 0.7 },
  '😵': { emotion: 'confusion', weight: 0.8 },
  '🤷': { emotion: 'confusion', weight: 0.6 },
  
  // Surprise
  '😲': { emotion: 'surprise', weight: 0.8 },
  '😯': { emotion: 'surprise', weight: 0.7 },
  '🙀': { emotion: 'surprise', weight: 0.7 },
  
  // Disgust
  '🤢': { emotion: 'disgust', weight: 0.8 },
  '🤮': { emotion: 'disgust', weight: 0.9 },
  '😷': { emotion: 'disgust', weight: 0.6 },
  
  // Embarrassment
  '😳': { emotion: 'embarrassment', weight: 0.8 },
  '😬': { emotion: 'embarrassment', weight: 0.7 },
  
  // Gratitude
  '🙏': { emotion: 'gratitude', weight: 0.8 },
  '🤗': { emotion: 'caring', weight: 0.7 },
  
  // Pride
  '😎': { emotion: 'pride', weight: 0.7 },
  '💪': { emotion: 'pride', weight: 0.6 },
  
  // Neutral/Thinking
  '😐': { emotion: 'neutral', weight: 0.8 },
  '😶': { emotion: 'neutral', weight: 0.7 },
  '🤐': { emotion: 'neutral', weight: 0.6 },
};

// Punctuation-based emotion indicators
export const PUNCTUATION_EMOTIONS = {
  multiple_exclamation: /!{2,}/g, // !! or more
  multiple_question: /\?{2,}/g, // ?? or more
  caps_words: /\b[A-Z]{2,}\b/g, // CAPS words
  ellipsis: /\.{3,}/g, // ... or more
  repeated_letters: /(.)\1{2,}/g, // repeated letters like "nooooo"
};

/**
 * Detects negation scopes in text - returns array of [start, end] indices
 */
interface NegationScope {
  start: number;
  end: number;
}

function detectNegationScopes(text: string): NegationScope[] {
  const negationWords = [
    'not',
    'no',
    'never',
    "don't",
    "dont",
    "won't",
    "wont",
    "can't",
    "cant",
    "shouldn't",
    "shouldnt",
    "wouldn't",
    "wouldnt",
    "couldn't",
    "couldnt",
    "isn't",
    "isnt",
    "aren't",
    "arent",
    "wasn't",
    "wasnt",
    "weren't",
    "werent",
    "hasn't",
    "hasnt",
    "haven't",
    "havent",
    "hadn't",
    "hadnt",
    "doesn't",
    "doesnt",
    "didn't",
    "didnt",
    'without',
    'neither',
    'nor',
    'none',
    'nobody',
    'nothing',
    'nowhere',
  ];

  const scopes: NegationScope[] = [];
  const words = text.split(/\s+/);
  let currentIndex = 0;

  words.forEach((word, i) => {
    const wordStart = text.indexOf(word, currentIndex);
    currentIndex = wordStart + word.length;

    if (negationWords.includes(word.toLowerCase())) {
      // Negation scope extends to next punctuation or 5 words
      const scopeEnd = Math.min(
        currentIndex + 50, // ~5-10 words
        text.length
      );

      // Check for punctuation to limit scope
      const nextPunctuation = text.substring(currentIndex).search(/[.!?,;]/);
      const actualEnd =
        nextPunctuation !== -1
          ? currentIndex + nextPunctuation
          : scopeEnd;

      scopes.push({
        start: wordStart,
        end: actualEnd,
      });
    }
  });

  return scopes;
}

/**
 * Finds all occurrences of a keyword in text and returns their indices
 */
function findKeywordOccurrences(text: string, keyword: string): number[] {
  const occurrences: number[] = [];
  let index = text.indexOf(keyword);

  while (index !== -1) {
    occurrences.push(index);
    index = text.indexOf(keyword, index + 1);
  }

  return occurrences;
}

/**
 * Checks if a text position is within any negation scope
 */
function isWithinNegationScope(
  position: number,
  scopes: NegationScope[]
): boolean {
  return scopes.some(
    scope => position >= scope.start && position <= scope.end
  );
}

/**
 * Applies softmax normalization for more realistic probability distribution
 */
function applySoftmaxNormalization(
  emotions: Array<{ emotion: EmotionLabel; confidence: number }>
): Array<{ emotion: EmotionLabel; confidence: number }> {
  if (emotions.length === 0) {
    return [{ emotion: 'neutral', confidence: 1.0 }];
  }

  if (emotions.length === 1) {
    return [{ emotion: emotions[0].emotion, confidence: 1.0 }];
  }

  // Apply softmax with temperature parameter for better distribution
  const temperature = 1.5; // Higher temperature = more uniform distribution
  const expScores = emotions.map(e => Math.exp(e.confidence / temperature));
  const sumExp = expScores.reduce((a, b) => a + b, 0);

  const normalized = emotions.map((e, i) => ({
    emotion: e.emotion,
    confidence: expScores[i] / sumExp,
  }));

  // Ensure primary emotion has at least 40% confidence if it was clearly dominant
  if (normalized[0].confidence < 0.4 && emotions[0].confidence > emotions[1]?.confidence * 2) {
    // Original emotion was clearly dominant, preserve that
    return [
      { emotion: normalized[0].emotion, confidence: 0.45 },
      ...normalized.slice(1).map(e => ({
        emotion: e.emotion,
        confidence: e.confidence * 0.55 / (1 - normalized[0].confidence)
      }))
    ];
  }

  return normalized;
}

/**
 * Gets adaptive confidence threshold based on text characteristics
 */
function getAdaptiveThreshold(text: string): number {
  const textLength = text.split(/\s+/).length;
  const normalizedText = text.toLowerCase();

  // Check for strong emotional indicators
  const hasStrongIndicators =
    /!{2,}/.test(text) || // Multiple exclamations
    /\?{2,}/.test(text) || // Multiple questions
    /\b[A-Z]{3,}\b/.test(text) || // CAPS words
    normalizedText.includes('very') ||
    normalizedText.includes('extremely') ||
    normalizedText.includes('absolutely') ||
    normalizedText.includes('incredibly') ||
    normalizedText.includes('really really');

  // Dynamic threshold based on text characteristics
  if (textLength < 5) return 0.3; // Higher threshold for short text
  if (hasStrongIndicators) return 0.12; // Lower for clear signals
  if (textLength > 30) return 0.18; // Moderate for longer text
  return 0.2; // Default
}

/**
 * Normalizes emotion scores to percentages that sum to 100%
 */
function normalizeEmotionScores(
  emotions: Array<{ emotion: EmotionLabel; confidence: number }>
): Array<{ emotion: EmotionLabel; confidence: number }> {
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
    confidence: e.confidence / totalConfidence,
  }));
}

/**
 * Formats emotions with proper percentage display
 */
function formatEmotionsWithPercentages(
  emotions: Array<{ emotion: EmotionLabel; confidence: number }>
): string[] {
  const normalized = normalizeEmotionScores(emotions);

  return normalized.map(e => {
    const percentage = e.confidence * 100;
    // Use 1 decimal place for percentages less than 10%, otherwise whole numbers
    const formattedPercentage =
      percentage < 10
        ? percentage.toFixed(1)
        : Math.round(percentage).toString();

    return `${e.emotion.toUpperCase()} (${formattedPercentage}%)`;
  });
}

/**
 * Advanced pattern analysis for emotion detection
 */
function analyzeAdvancedPatterns(
  text: string,
  emotionScores: Record<EmotionLabel, number>
): void {
  const normalizedText = text.toLowerCase();

  // Complex emotional phrases
  const advancedPatterns: Record<
    string,
    { emotion: EmotionLabel; score: number }
  > = {
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
    'through the roof': { emotion: 'excitement', score: 0.8 },
  };

  Object.entries(advancedPatterns).forEach(([pattern, config]) => {
    if (normalizedText.includes(pattern)) {
      emotionScores[config.emotion] += config.score;
    }
  });

  // Enhanced sarcasm detection with contradiction analysis
  const sarcasmIndicators = detectSarcasm(text, normalizedText);
  if (sarcasmIndicators.isSarcastic) {
    // Invert positive emotions to negative
    emotionScores['joy'] *= 0.2;
    emotionScores['excitement'] *= 0.2;
    emotionScores['admiration'] *= 0.2;
    emotionScores['gratitude'] *= 0.2;
    
    // Boost negative emotions based on sarcasm strength
    emotionScores['annoyance'] += 0.6 * sarcasmIndicators.confidence;
    emotionScores['disapproval'] += 0.5 * sarcasmIndicators.confidence;
    emotionScores['disappointment'] += 0.3 * sarcasmIndicators.confidence;
  }

  // Confusion indicators
  const confusionPatterns = [
    'i dont understand',
    'what do you mean',
    'im lost',
    'makes no sense',
    'confused about',
  ];

  confusionPatterns.forEach(pattern => {
    if (normalizedText.includes(pattern)) {
      emotionScores['confusion'] += 0.7;
    }
  });

  // Analyze emojis in text
  analyzeEmojis(text, emotionScores);
}

/**
 * Enhanced sarcasm detection using contradiction and context analysis
 */
function detectSarcasm(
  originalText: string,
  normalizedText: string
): { isSarcastic: boolean; confidence: number } {
  let sarcasmScore = 0;
  let indicators = 0;

  // Pattern 1: Positive words in negative context
  const positiveWords = ['great', 'wonderful', 'perfect', 'amazing', 'fantastic', 'brilliant'];
  const negativeContext = ['but', 'however', 'unfortunately', 'sadly', 'too bad'];
  
  const hasPositive = positiveWords.some(word => normalizedText.includes(word));
  const hasNegativeContext = negativeContext.some(word => normalizedText.includes(word));
  
  if (hasPositive && hasNegativeContext) {
    sarcasmScore += 0.5;
    indicators++;
  }

  // Pattern 2: Exaggerated punctuation with contradictory tone
  const hasExcessivePunctuation = /!{2,}/.test(originalText) || /\.{3,}/.test(originalText);
  const sarcasmPhrases = EMOTIONAL_CUES.sarcasm;
  
  sarcasmPhrases.forEach(phrase => {
    if (normalizedText.includes(phrase)) {
      sarcasmScore += 0.4;
      indicators++;
      
      // Higher score if combined with exaggerated punctuation
      if (hasExcessivePunctuation) {
        sarcasmScore += 0.2;
      }
    }
  });

  // Pattern 3: "Oh" at the start with positive words (often sarcastic)
  if (/^oh,?\s+(great|wonderful|perfect|fantastic)/i.test(normalizedText)) {
    sarcasmScore += 0.6;
    indicators++;
  }

  // Pattern 4: "Just" before positive adjectives (minimizing/sarcastic)
  if (/just\s+(perfect|great|wonderful|amazing)/i.test(normalizedText)) {
    sarcasmScore += 0.4;
    indicators++;
  }

  // Pattern 5: Quotation marks around positive words (ironic usage)
  if (/"(great|wonderful|perfect|amazing|fantastic)"/.test(originalText)) {
    sarcasmScore += 0.5;
    indicators++;
  }

  // Pattern 6: "Sure" or "Right" in standalone or with positive words
  if (/\b(sure|right|okay)\b[.!,]?\s*$/i.test(normalizedText) || 
      /yeah,?\s+right/i.test(normalizedText)) {
    sarcasmScore += 0.5;
    indicators++;
  }

  const confidence = Math.min(sarcasmScore, 1.0);
  const isSarcastic = indicators >= 2 || sarcasmScore >= 0.6;

  return { isSarcastic, confidence };
}

/**
 * Analyzes emojis in text and adjusts emotion scores
 */
function analyzeEmojis(
  text: string,
  emotionScores: Record<EmotionLabel, number>
): void {
  // Extract all emojis from text
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojis = text.match(emojiRegex) || [];

  if (emojis.length === 0) return;

  // Analyze each emoji
  emojis.forEach(emoji => {
    const emojiData = EMOJI_EMOTIONS[emoji];
    if (emojiData) {
      emotionScores[emojiData.emotion] += emojiData.weight;
    }
  });

  // Multiple same emojis indicate intensity
  const emojiCounts = new Map<string, number>();
  emojis.forEach(emoji => {
    emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
  });

  // Boost emotions for repeated emojis
  emojiCounts.forEach((count, emoji) => {
    if (count > 1) {
      const emojiData = EMOJI_EMOTIONS[emoji];
      if (emojiData) {
        // Add bonus for repetition (but with diminishing returns)
        const bonus = Math.log(count) * 0.3;
        emotionScores[emojiData.emotion] += bonus;
      }
    }
  });
}

/**
 * Punctuation-based emotion analysis
 */
function analyzePunctuationEmotions(
  text: string,
  emotionScores: Record<EmotionLabel, number>
): void {
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
export function analyzeEmotions(
  text: string
): Array<{ emotion: EmotionLabel; confidence: number }> {
  if (!text || text.trim().length === 0) {
    return [{ emotion: 'neutral', confidence: 1.0 }];
  }

  const normalizedText = text.toLowerCase().trim();
  const words = normalizedText.split(/\s+/);
  const emotionScores: Record<EmotionLabel, number> = {} as Record<
    EmotionLabel,
    number
  >;

  // Initialize all emotions with 0 score
  EMOTION_LABELS.forEach(emotion => {
    emotionScores[emotion] = 0;
  });

  // Enhanced keyword matching with weighted scoring and negation scope detection
  for (const [emotion, keywordGroups] of Object.entries(EMOTION_KEYWORDS)) {
    const emotionKey = emotion as EmotionLabel;
    let score = 0;

    // Advanced negation scope detection
    const negationScopes = detectNegationScopes(normalizedText);

    // Score weighted keywords with negation awareness
    keywordGroups.strong.forEach(keyword => {
      const occurrences = findKeywordOccurrences(
        normalizedText,
        keyword.toLowerCase()
      );
      occurrences.forEach(index => {
        // Check if this occurrence is within a negation scope
        const isNegated = isWithinNegationScope(index, negationScopes);
        const baseScore = isNegated ? -0.5 : 1.0;

        score += baseScore;

        // Check for intensity modifiers
        const beforeKeyword = normalizedText.substring(
          Math.max(0, index - 20),
          index
        );

        if (
          INTENSITY_MODIFIERS.high.some(modifier =>
            beforeKeyword.includes(modifier)
          )
        ) {
          score += isNegated ? -0.25 : 0.5;
        }
      });
    });

    keywordGroups.medium.forEach(keyword => {
      const occurrences = findKeywordOccurrences(
        normalizedText,
        keyword.toLowerCase()
      );
      occurrences.forEach(index => {
        const isNegated = isWithinNegationScope(index, negationScopes);
        
        // Reduce false positives for common weak words
        const isCommonWord = ['okay', 'ok', 'fine', 'yes', 'no', 'sure'].includes(keyword.toLowerCase());
        const baseScore = isNegated ? -0.3 : (isCommonWord ? 0.3 : 0.6);

        score += baseScore;

        // Check for intensity modifiers
        const beforeKeyword = normalizedText.substring(
          Math.max(0, index - 20),
          index
        );

        if (
          INTENSITY_MODIFIERS.high.some(modifier =>
            beforeKeyword.includes(modifier)
          )
        ) {
          score += isNegated ? -0.15 : 0.3;
        } else if (
          INTENSITY_MODIFIERS.medium.some(modifier =>
            beforeKeyword.includes(modifier)
          )
        ) {
          score += isNegated ? -0.1 : 0.2;
        }
      });
    });

    keywordGroups.weak.forEach(keyword => {
      const occurrences = findKeywordOccurrences(
        normalizedText,
        keyword.toLowerCase()
      );
      occurrences.forEach((index: number) => {
        const isNegated = isWithinNegationScope(index, negationScopes);
        score += isNegated ? -0.15 : 0.3;
      });
    });

    // Check explicit negative context patterns
    const hasNegativeContext = keywordGroups.negative_context.some(negKeyword =>
      normalizedText.includes(negKeyword.toLowerCase())
    );
    if (hasNegativeContext) {
      score -= 0.8;
    }

    emotionScores[emotionKey] = Math.max(0, score);
  }

  // Apply advanced pattern analysis
  analyzeAdvancedPatterns(text, emotionScores);

  // Apply punctuation-based emotion analysis
  analyzePunctuationEmotions(text, emotionScores);

  // Reduce false positives
  reduceFalsePositives(text, emotionScores);

  // Enhanced context analysis
  const hasQuestion = CONTEXT_PATTERNS.question.some(q =>
    normalizedText.includes(q)
  );
  const hasExclamation =
    CONTEXT_PATTERNS.exclamation.some(e => normalizedText.includes(e)) ||
    normalizedText.includes('!');
  const hasNegation = CONTEXT_PATTERNS.negation.some(n =>
    normalizedText.includes(n)
  );

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

  // Apply psychological coherence check
  applyPsychologicalCoherence(emotionScores, text);

  // Apply adaptive confidence threshold
  const confidenceThreshold = getAdaptiveThreshold(text);
  const detectedEmotions = Object.entries(emotionScores)
    .filter(([_, score]) => score > confidenceThreshold)
    .map(([emotion, score]) => ({
      emotion: emotion as EmotionLabel,
      confidence: Math.min(score / Math.max(1, words.length / 8), 1.0),
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

  // Calibrate confidence based on text characteristics
  const calibratedEmotions = calibrateConfidence(text, detectedEmotions);

  // Return top emotions with better confidence distribution using softmax
  const topEmotions = calibratedEmotions.slice(0, 3);
  const softmaxEmotions = applySoftmaxNormalization(topEmotions);

  // Ensure primary emotion has reasonable confidence
  if (softmaxEmotions[0].confidence < 0.3) {
    softmaxEmotions[0].confidence = 0.3;
  }

  return softmaxEmotions;
}

/**
 * Emotion intensity levels
 */
export type EmotionIntensity = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

/**
 * Enhanced emotion result with intensity
 */
export interface EmotionWithIntensity {
  emotion: EmotionLabel;
  confidence: number;
  intensity: EmotionIntensity;
}

/**
 * Calculates emotion intensity based on confidence and text characteristics
 */
function calculateEmotionIntensity(
  confidence: number,
  text: string,
  emotion: EmotionLabel
): EmotionIntensity {
  let intensityScore = confidence;

  // Boost intensity for strong indicators
  const normalizedText = text.toLowerCase();
  
  // Check for intensity modifiers
  if (INTENSITY_MODIFIERS.high.some(modifier => normalizedText.includes(modifier))) {
    intensityScore += 0.2;
  }

  // Check for punctuation indicators
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    intensityScore += 0.1 * Math.min(exclamationCount, 3);
  }

  // Check for CAPS
  const capsWords = text.match(/\b[A-Z]{2,}\b/g);
  if (capsWords && capsWords.length > 0) {
    intensityScore += 0.15;
  }

  // Check for repeated letters (e.g., "sooooo")
  if (/(.)\1{2,}/.test(text)) {
    intensityScore += 0.1;
  }

  // Normalize score
  intensityScore = Math.min(intensityScore, 1.0);

  // Map to intensity levels
  if (intensityScore >= 0.8) return 'very_high';
  if (intensityScore >= 0.6) return 'high';
  if (intensityScore >= 0.4) return 'medium';
  if (intensityScore >= 0.2) return 'low';
  return 'very_low';
}

/**
 * Analyzes emotions with intensity information
 */
export function analyzeEmotionsWithIntensity(text: string): EmotionWithIntensity[] {
  const emotions = analyzeEmotions(text);
  
  return emotions.map(e => ({
    emotion: e.emotion,
    confidence: e.confidence,
    intensity: calculateEmotionIntensity(e.confidence, text, e.emotion),
  }));
}

/**
 * Gets the primary emotion from analysis results
 */
export function getPrimaryEmotion(
  emotions: Array<{ emotion: EmotionLabel; confidence: number }>
): EmotionLabel {
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
    primaryEmotion,
  };
}

/**
 * Analyzes AI response for emotions
 * Returns emotions that match what the avatar will display
 */
export function analyzeResponseEmotions(aiResponse: string): {
  emotions: string[];
  primaryEmotion: EmotionLabel;
} {
  const analysis = analyzeEmotions(aiResponse);
  const filteredEmotions = analysis.filter(e => e.confidence > 0.1);

  const emotions = formatEmotionsWithPercentages(filteredEmotions);
  const primaryEmotion = getPrimaryEmotion(analysis);

  return {
    emotions: emotions.length > 0 ? emotions : ['NEUTRAL (100%)'],
    primaryEmotion,
  };
}

/**
 * Analyzes conversation emotions with full context
 * This is what should be used to ensure avatar and emotion boxes are synchronized
 */
export function analyzeConversationEmotions(
  userInput: string,
  aiResponse: string
): {
  avatarEmotion: EmotionLabel;
  userEmotions: string[];
  responseEmotions: string[];
  userPrimaryEmotion: EmotionLabel;
  responsePrimaryEmotion: EmotionLabel;
} {
  // Get the avatar emotion (with full contextual processing)
  const avatarEmotion = classifyConversationEmotion(userInput, aiResponse);

  // Analyze user emotions
  const userAnalysis = analyzeEmotions(userInput);
  const filteredUserEmotions = userAnalysis.filter(e => e.confidence > 0.1);
  const userEmotions = formatEmotionsWithPercentages(filteredUserEmotions);
  const userPrimaryEmotion = getPrimaryEmotion(userAnalysis);

  // For response emotions, we want to ensure they align with the avatar
  // So we'll re-analyze with awareness of the avatar emotion
  const responseAnalysis = analyzeEmotions(aiResponse);
  
  // Ensure the avatar emotion is represented in the response emotions
  const avatarEmotionInList = responseAnalysis.find(e => e.emotion === avatarEmotion);
  
  // If avatar emotion isn't in top results, we need to boost it
  let adjustedResponseAnalysis = [...responseAnalysis];
  if (!avatarEmotionInList || avatarEmotionInList.confidence < 0.15) {
    // The contextual analysis chose a different emotion than what raw analysis found
    // We should ensure the avatar emotion is represented
    adjustedResponseAnalysis = adjustResponseEmotionsToMatchAvatar(
      responseAnalysis,
      avatarEmotion
    );
  }

  const filteredResponseEmotions = adjustedResponseAnalysis.filter(e => e.confidence > 0.08);
  const responseEmotions = formatEmotionsWithPercentages(filteredResponseEmotions);

  return {
    avatarEmotion,
    userEmotions: userEmotions.length > 0 ? userEmotions : ['NEUTRAL (100%)'],
    responseEmotions: responseEmotions.length > 0 ? responseEmotions : ['NEUTRAL (100%)'],
    userPrimaryEmotion,
    responsePrimaryEmotion: avatarEmotion, // Avatar emotion is the response primary
  };
}

/**
 * Adjusts response emotions to ensure avatar emotion is properly represented
 */
function adjustResponseEmotionsToMatchAvatar(
  emotions: Array<{ emotion: EmotionLabel; confidence: number }>,
  avatarEmotion: EmotionLabel
): Array<{ emotion: EmotionLabel; confidence: number }> {
  // Check if avatar emotion is already in the list
  const existing = emotions.find(e => e.emotion === avatarEmotion);
  
  if (existing) {
    // Boost it to be primary if it's not already
    if (existing.confidence < emotions[0].confidence) {
      return [
        { emotion: avatarEmotion, confidence: emotions[0].confidence * 1.1 },
        ...emotions.filter(e => e.emotion !== avatarEmotion)
      ];
    }
    return emotions;
  }
  
  // Avatar emotion not in list - add it as primary
  // This happens when contextual analysis chose something different
  const topConfidence = emotions[0]?.confidence || 0.5;
  return [
    { emotion: avatarEmotion, confidence: topConfidence * 1.1 },
    ...emotions.slice(0, 4) // Keep top 4 others
  ];
}

/**
 * Emotion history for tracking conversation flow
 */
interface EmotionHistoryEntry {
  timestamp: number;
  emotion: EmotionLabel;
  confidence: number;
  speaker: 'user' | 'assistant';
}

class EmotionHistoryTracker {
  private history: EmotionHistoryEntry[] = [];
  private readonly maxHistory = 10; // Keep last 10 emotion events

  addEmotion(emotion: EmotionLabel, confidence: number, speaker: 'user' | 'assistant'): void {
    this.history.push({
      timestamp: Date.now(),
      emotion,
      confidence,
      speaker,
    });

    // Keep only recent history
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getRecentTrend(speaker?: 'user' | 'assistant'): EmotionLabel | null {
    const relevantHistory = speaker
      ? this.history.filter(e => e.speaker === speaker)
      : this.history;

    if (relevantHistory.length === 0) return null;

    // Get most common emotion in recent history
    const emotionCounts = new Map<EmotionLabel, number>();
    relevantHistory.forEach(entry => {
      emotionCounts.set(entry.emotion, (emotionCounts.get(entry.emotion) || 0) + 1);
    });

    let maxCount = 0;
    let trendEmotion: EmotionLabel = 'neutral';

    emotionCounts.forEach((count, emotion) => {
      if (count > maxCount) {
        maxCount = count;
        trendEmotion = emotion;
      }
    });

    return trendEmotion;
  }

  getEmotionalTrajectory(): 'escalating' | 'de-escalating' | 'stable' {
    if (this.history.length < 3) return 'stable';

    // Calculate average confidence for first half vs second half
    const midPoint = Math.floor(this.history.length / 2);
    const firstHalf = this.history.slice(0, midPoint);
    const secondHalf = this.history.slice(midPoint);

    const firstAvg = firstHalf.reduce((sum, e) => sum + e.confidence, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, e) => sum + e.confidence, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 0.15) return 'escalating';
    if (diff < -0.15) return 'de-escalating';
    return 'stable';
  }

  clear(): void {
    this.history = [];
  }
}

// Global emotion history tracker
export const emotionHistory = new EmotionHistoryTracker();

/**
 * Dialogue act classification types
 */
export type DialogueAct = 'question' | 'statement' | 'command' | 'exclamation' | 'greeting';

/**
 * Intent classification types
 */
export type Intent = 'inform' | 'request' | 'express_emotion' | 'confirm' | 'social';

/**
 * Enhanced emotion analysis result with dialogue context
 */
export interface EnhancedEmotionAnalysis {
  emotion: EmotionLabel;
  confidence: number;
  dialogueAct: DialogueAct;
  intent: Intent;
}

/**
 * Classifies the dialogue act of a text
 */
function classifyDialogueAct(text: string): DialogueAct {
  const trimmedText = text.trim();
  const normalizedText = text.toLowerCase();

  // Check for questions
  if (trimmedText.includes('?') || 
      /^(what|when|where|who|why|how|can|could|would|should|is|are|do|does|did)/i.test(trimmedText)) {
    return 'question';
  }

  // Check for exclamations
  if (trimmedText.includes('!') || /\b(wow|amazing|incredible|awesome)\b/i.test(normalizedText)) {
    return 'exclamation';
  }

  // Check for commands/requests
  if (/^(please|kindly|could you|can you|would you|tell me|show me|help me|give me)/i.test(trimmedText)) {
    return 'command';
  }

  // Check for greetings
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)\b/i.test(normalizedText)) {
    return 'greeting';
  }

  // Default to statement
  return 'statement';
}

/**
 * Classifies the intent of a text
 */
function classifyIntent(text: string, emotion: EmotionLabel): Intent {
  const normalizedText = text.toLowerCase();

  // Social intent (greetings, pleasantries)
  if (/^(hi|hello|hey|thanks|thank you|bye|goodbye|see you)\b/i.test(normalizedText)) {
    return 'social';
  }

  // Request intent (asking for something)
  if (/^(can|could|would|please|help|tell me|show me|give me)/i.test(normalizedText) ||
      normalizedText.includes('?')) {
    return 'request';
  }

  // Confirmation intent
  if (/^(yes|yeah|yep|yup|sure|okay|ok|correct|right|exactly|agreed)\b/i.test(normalizedText)) {
    return 'confirm';
  }

  // Express emotion intent (strong emotional content)
  const strongEmotions: EmotionLabel[] = ['joy', 'anger', 'sadness', 'fear', 'love', 'excitement', 'grief'];
  if (strongEmotions.includes(emotion)) {
    return 'express_emotion';
  }

  // Default to inform
  return 'inform';
}

/**
 * Analyzes text with dialogue context
 */
export function analyzeEmotionsWithContext(text: string): EnhancedEmotionAnalysis {
  const emotions = analyzeEmotions(text);
  const primaryEmotion = getPrimaryEmotion(emotions);
  const confidence = emotions.length > 0 ? emotions[0].confidence : 0;
  
  const dialogueAct = classifyDialogueAct(text);
  const intent = classifyIntent(text, primaryEmotion);

  return {
    emotion: primaryEmotion,
    confidence,
    dialogueAct,
    intent,
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
  if (
    userText.includes('?') &&
    (responseText.includes('because') || responseText.includes('explanation'))
  ) {
    emotionScores['realization'] += 0.4;
  }

  // If user expresses problem and AI offers help, boost caring
  if (
    (userText.includes('problem') ||
      userText.includes('issue') ||
      userText.includes('struggling')) &&
    (responseText.includes('help') || responseText.includes('support'))
  ) {
    emotionScores['caring'] += 0.5;
  }

  // If user expresses achievement and AI congratulates, boost pride/joy
  if (
    (userText.includes('achieved') ||
      userText.includes('accomplished') ||
      userText.includes('succeeded')) &&
    (responseText.includes('congratulations') ||
      responseText.includes('well done'))
  ) {
    emotionScores['pride'] += 0.6;
    emotionScores['joy'] += 0.4;
  }

  // Consider emotional trajectory from history
  const trajectory = emotionHistory.getEmotionalTrajectory();
  const recentTrend = emotionHistory.getRecentTrend();

  if (trajectory === 'escalating' && recentTrend) {
    // Boost the trending emotion slightly
    emotionScores[recentTrend] += 0.2;
  } else if (trajectory === 'de-escalating') {
    // User may be calming down, boost neutral/calm emotions
    emotionScores['neutral'] += 0.2;
    emotionScores['relief'] += 0.15;
  }
}

/**
 * Advanced emotion classification using pattern matching and context
 * Avatar should reflect AI response emotions, not user emotions
 */
export function classifyConversationEmotion(
  userInput: string,
  aiResponse: string
): EmotionLabel {
  const userAnalysis = analyzeEmotions(userInput);
  const responseAnalysis = analyzeEmotions(aiResponse);

  // Track emotions in history
  if (userAnalysis.length > 0) {
    emotionHistory.addEmotion(
      userAnalysis[0].emotion,
      userAnalysis[0].confidence,
      'user'
    );
  }

  // Create emotion scores for contextual adjustment
  const contextualScores: Record<EmotionLabel, number> = {} as Record<
    EmotionLabel,
    number
  >;
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
  const contextualPrimary = Object.entries(contextualScores).reduce(
    (max, [emotion, score]) =>
      score > max.score ? { emotion: emotion as EmotionLabel, score } : max,
    { emotion: 'neutral' as EmotionLabel, score: 0 }
  ).emotion;

  // Track the final emotion in history
  const finalEmotion = contextualPrimary;
  emotionHistory.addEmotion(
    finalEmotion,
    contextualScores[finalEmotion],
    'assistant'
  );

  // If contextual analysis found a strong emotion, use that
  if (contextualScores[contextualPrimary] > 0.4) {
    return contextualPrimary;
  }

  // If AI response has a strong emotion, use that
  if (responseAnalysis.length > 0 && responseAnalysis[0].confidence > 0.3) {
    return responsePrimary;
  }

  // If AI response is neutral but user has strong emotion, AI might mirror it appropriately
  if (
    responsePrimary === 'neutral' &&
    userAnalysis.length > 0 &&
    userAnalysis[0].confidence > 0.5
  ) {
    // Enhanced emotion mapping for better AI responses
    const emotionMapping: Record<string, EmotionLabel> = {
      anger: 'caring',
      sadness: 'caring',
      grief: 'caring',
      fear: 'caring',
      nervousness: 'caring',
      excitement: 'joy',
      joy: 'joy',
      gratitude: 'joy',
      confusion: 'caring',
      curiosity: 'neutral',
      surprise: 'joy',
      love: 'caring',
      pride: 'admiration',
      embarrassment: 'caring',
      disappointment: 'caring',
      remorse: 'caring',
    };

    return emotionMapping[userPrimary] || 'neutral';
  }

  // Default to AI response emotion, or neutral if none detected
  return responsePrimary;
}

/**
 * Psychological emotion incompatibility rules
 * Based on Russell's Circumplex Model and Plutchik's Wheel of Emotions
 */
const EMOTION_INCOMPATIBILITIES: Record<EmotionLabel, EmotionLabel[]> = {
  joy: ['sadness', 'grief', 'disappointment', 'remorse', 'anger'],
  sadness: ['joy', 'excitement', 'amusement', 'optimism'],
  anger: ['joy', 'love', 'gratitude', 'caring', 'relief'],
  fear: ['pride', 'joy', 'excitement', 'optimism'],
  love: ['anger', 'disgust', 'disapproval', 'annoyance'],
  excitement: ['sadness', 'grief', 'disappointment', 'fear'],
  gratitude: ['anger', 'disgust', 'disapproval'],
  admiration: ['disgust', 'disapproval', 'anger'],
  disapproval: ['approval', 'admiration', 'gratitude', 'love'],
  disappointment: ['joy', 'excitement', 'pride', 'optimism'],
  disgust: ['love', 'admiration', 'caring', 'gratitude'],
  pride: ['embarrassment', 'remorse', 'sadness', 'disappointment'],
  relief: ['fear', 'nervousness', 'anger'],
  optimism: ['sadness', 'grief', 'disappointment', 'fear'],
  neutral: [], // Neutral is compatible with everything
  confusion: ['realization', 'approval'],
  curiosity: [], // Can coexist with many emotions
  surprise: [], // Can be positive or negative
  amusement: ['sadness', 'grief', 'anger'],
  embarrassment: ['pride', 'admiration'],
  nervousness: ['relief', 'joy'],
  annoyance: ['gratitude', 'joy', 'love'],
  caring: ['anger', 'disgust', 'annoyance'],
  desire: [], // Can coexist with many emotions
  grief: ['joy', 'excitement', 'amusement', 'relief'],
  realization: ['confusion'],
  remorse: ['pride', 'joy'],
  approval: ['disapproval', 'anger'],
};

/**
 * Applies psychological coherence rules to prevent incompatible emotions
 */
function applyPsychologicalCoherence(
  emotionScores: Record<EmotionLabel, number>,
  text: string
): void {
  // Find the dominant emotion
  let dominantEmotion: EmotionLabel = 'neutral';
  let maxScore = 0;

  Object.entries(emotionScores).forEach(([emotion, score]) => {
    if (score > maxScore) {
      maxScore = score;
      dominantEmotion = emotion as EmotionLabel;
    }
  });

  // If dominant emotion is weak, don't apply strong incompatibility rules
  if (maxScore < 0.3) return;

  // Get incompatible emotions for the dominant emotion
  const incompatibleEmotions = EMOTION_INCOMPATIBILITIES[dominantEmotion] || [];

  // Reduce incompatible emotions based on dominant emotion strength
  incompatibleEmotions.forEach(incompatibleEmotion => {
    if (emotionScores[incompatibleEmotion] > 0) {
      // Stronger dominant emotion = more suppression of incompatible emotions
      const suppressionFactor = Math.max(0.2, 1 - maxScore * 0.7);
      emotionScores[incompatibleEmotion] *= suppressionFactor;
    }
  });

  // Additional rule: If positive sentiment is strong, reduce all negative emotions
  const positiveScore = EMOTION_CATEGORIES.positive.reduce(
    (sum, emotion) => sum + emotionScores[emotion as EmotionLabel],
    0
  );
  const negativeScore = EMOTION_CATEGORIES.negative.reduce(
    (sum, emotion) => sum + emotionScores[emotion as EmotionLabel],
    0
  );

  // If there's clear positive sentiment, reduce negative emotions
  if (positiveScore > negativeScore * 2) {
    EMOTION_CATEGORIES.negative.forEach(emotion => {
      emotionScores[emotion as EmotionLabel] *= 0.4;
    });
  }
  // If there's clear negative sentiment, reduce positive emotions
  else if (negativeScore > positiveScore * 2) {
    EMOTION_CATEGORIES.positive.forEach(emotion => {
      emotionScores[emotion as EmotionLabel] *= 0.4;
    });
  }

  // Handle questions: reduce emotions that don't make sense with questions
  if (text.includes('?')) {
    // Questions typically indicate curiosity, confusion, or neutral inquiry
    // Reduce strong declarative emotions
    emotionScores['pride'] *= 0.5;
    emotionScores['relief'] *= 0.5;
    emotionScores['realization'] *= 0.5;
  }

  // Detect overall sentiment polarity and enforce coherence
  enforceGlobalSentimentCoherence(emotionScores, text);
}

/**
 * Enforces global sentiment coherence to prevent positive text from having negative dominant emotions
 */
function enforceGlobalSentimentCoherence(
  emotionScores: Record<EmotionLabel, number>,
  text: string
): void {
  const normalizedText = text.toLowerCase();

  // Count positive and negative keywords
  const positiveKeywords = [
    'great', 'excellent', 'wonderful', 'fantastic', 'amazing', 'awesome',
    'perfect', 'brilliant', 'outstanding', 'superb', 'love', 'enjoy',
    'happy', 'glad', 'pleased', 'delighted', 'thrilled', 'excited',
    'appreciate', 'thank', 'grateful', 'beautiful', 'incredible', 'best'
  ];

  const negativeKeywords = [
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'dislike',
    'angry', 'sad', 'upset', 'disappointed', 'frustrated', 'annoyed',
    'problem', 'issue', 'wrong', 'fail', 'error', 'difficult', 'struggle'
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveKeywords.forEach(keyword => {
    if (normalizedText.includes(keyword)) positiveCount++;
  });

  negativeKeywords.forEach(keyword => {
    if (normalizedText.includes(keyword)) negativeCount++;
  });

  // Strong positive text should not have dominant negative emotions
  if (positiveCount >= 2 && negativeCount === 0) {
    // This is clearly positive text
    EMOTION_CATEGORIES.negative.forEach(emotion => {
      emotionScores[emotion as EmotionLabel] *= 0.3; // Strongly suppress negative emotions
    });
    
    // Boost positive emotions slightly
    EMOTION_CATEGORIES.positive.forEach(emotion => {
      emotionScores[emotion as EmotionLabel] *= 1.2;
    });
  }

  // Strong negative text should not have dominant positive emotions
  if (negativeCount >= 2 && positiveCount === 0) {
    // This is clearly negative text
    EMOTION_CATEGORIES.positive.forEach(emotion => {
      emotionScores[emotion as EmotionLabel] *= 0.3; // Strongly suppress positive emotions
    });
    
    // Boost negative emotions slightly
    EMOTION_CATEGORIES.negative.forEach(emotion => {
      emotionScores[emotion as EmotionLabel] *= 1.2;
    });
  }

  // Mixed sentiment: moderate both
  if (positiveCount > 0 && negativeCount > 0) {
    // Text contains both - allow mixed emotions but moderate extremes
    const totalKeywords = positiveCount + negativeCount;
    const positiveRatio = positiveCount / totalKeywords;
    
    if (positiveRatio > 0.7) {
      // Mostly positive
      EMOTION_CATEGORIES.negative.forEach(emotion => {
        emotionScores[emotion as EmotionLabel] *= 0.6;
      });
    } else if (positiveRatio < 0.3) {
      // Mostly negative
      EMOTION_CATEGORIES.positive.forEach(emotion => {
        emotionScores[emotion as EmotionLabel] *= 0.6;
      });
    }
  }
}

/**
 * False positive reduction system
 */
function reduceFalsePositives(
  text: string,
  emotionScores: Record<EmotionLabel, number>
): void {
  const normalizedText = text.toLowerCase();

  // Common misleading phrases that cause false positives
  const misleadingPhrases = {
    love: ['love to hate', 'love how terrible'],
    joy: ['joy of complaining'],
    excitement: ['excited to complain'],
    gratitude: ['thanks for nothing'],
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
  const uncertaintyWords = [
    'i think',
    'maybe',
    'perhaps',
    'might be',
    'could be',
  ];
  const uncertaintyCount = uncertaintyWords.filter(word =>
    normalizedText.includes(word)
  ).length;

  if (uncertaintyCount > 0) {
    const reductionFactor = Math.max(0.4, 1 - uncertaintyCount * 0.2);
    Object.keys(emotionScores).forEach(emotion => {
      emotionScores[emotion as EmotionLabel] *= reductionFactor;
    });
  }

  // Past tense indicators (not current emotions)
  const pastTenseWords = ['used to', 'was', 'were', 'had been', 'would have'];
  const pastTenseCount = pastTenseWords.filter(word =>
    normalizedText.includes(word)
  ).length;

  if (pastTenseCount > 0) {
    const reductionFactor = Math.max(0.5, 1 - pastTenseCount * 0.25);
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
      confidence: adjustedConfidence,
    };
  });
}
