// Test file for emotion classification
import {
  analyzeEmotions,
  classifyConversationEmotion,
  getPrimaryEmotion,
  EMOTION_LABELS,
  analyzeEmotionsWithContext,
  analyzeEmotionsWithIntensity,
  emotionHistory,
  analyzeConversationEmotions,
} from '../services/emotionService';

// Test cases for different emotions
const testCases = [
  {
    userInput: "I'm so excited about this new feature!",
    aiResponse: "That's wonderful! I'm glad you're enthusiastic about it.",
    expectedUserEmotion: 'excitement',
    expectedResponseEmotion: 'joy',
  },
  {
    userInput: "I'm really confused about how this works",
    aiResponse:
      'Let me help clarify that for you. I understand it can be confusing.',
    expectedUserEmotion: 'confusion',
    expectedResponseEmotion: 'caring',
  },
  {
    userInput: 'Thank you so much for your help!',
    aiResponse: "You're very welcome! I'm happy to assist you.",
    expectedUserEmotion: 'gratitude',
    expectedResponseEmotion: 'joy',
  },
  {
    userInput: "I'm worried this might not work",
    aiResponse: "I understand your concerns. Let's work through this together.",
    expectedUserEmotion: 'fear',
    expectedResponseEmotion: 'caring',
  },
  {
    userInput: 'This is absolutely amazing!',
    aiResponse: "I'm thrilled you think so! It really is remarkable.",
    expectedUserEmotion: 'admiration',
    expectedResponseEmotion: 'excitement',
  },
  {
    userInput: 'I hate this feature',
    aiResponse:
      "I'm sorry you're having a difficult experience. Let me help you.",
    expectedUserEmotion: 'anger',
    expectedResponseEmotion: 'caring',
  },
  {
    userInput: 'Oh great, another bug... 🙄',
    aiResponse: "I understand your frustration. Let's fix this.",
    expectedUserEmotion: 'annoyance',
    expectedResponseEmotion: 'caring',
  },
  {
    userInput: 'This is AMAZING!!! 😍😍😍',
    aiResponse: "So glad you love it!",
    expectedUserEmotion: 'excitement',
    expectedResponseEmotion: 'joy',
  },
];

// Function to run tests
export function runEmotionTests() {
  console.log('🧪 Running Enhanced Emotion Classification Tests...\n');

  // Test 1: Check all emotion labels are valid
  console.log('Test 1: Validating emotion labels');
  console.log(`Total emotion labels: ${EMOTION_LABELS.length}`);
  console.log(`Emotion labels: ${EMOTION_LABELS.join(', ')}\n`);

  // Test 2: Basic emotion analysis with new features
  console.log('Test 2: Enhanced emotion analysis with context and intensity');
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test Case ${index + 1} ---`);
    console.log(`User: "${testCase.userInput}"`);
    console.log(`AI: "${testCase.aiResponse}"`);

    const primaryEmotion = classifyConversationEmotion(
      testCase.userInput,
      testCase.aiResponse
    );
    
    const userAnalysisWithContext = analyzeEmotionsWithContext(testCase.userInput);
    const userAnalysisWithIntensity = analyzeEmotionsWithIntensity(testCase.userInput);
    const responseAnalysis = analyzeEmotions(testCase.aiResponse);

    console.log('User Analysis:');
    console.log(`  Primary: ${userAnalysisWithContext.emotion} (${(userAnalysisWithContext.confidence * 100).toFixed(1)}%)`);
    console.log(`  Dialogue Act: ${userAnalysisWithContext.dialogueAct}`);
    console.log(`  Intent: ${userAnalysisWithContext.intent}`);
    if (userAnalysisWithIntensity.length > 0) {
      console.log(`  Intensity: ${userAnalysisWithIntensity[0].intensity}`);
    }
    
    console.log(
      `Response emotions: ${responseAnalysis.map((e: any) => `${e.emotion}(${(e.confidence * 100).toFixed(1)}%)`).join(', ')}`
    );
    console.log(`Avatar emotion (AI response): ${primaryEmotion}`);
    console.log(
      `Expected user: ${testCase.expectedUserEmotion}, Expected response: ${testCase.expectedResponseEmotion}`
    );
  });

  // Test 3: Sarcasm detection
  console.log('\n\nTest 3: Sarcasm detection');
  const sarcasmTests = [
    { input: 'Oh great, just what I needed...', expected: 'annoyance' },
    { input: 'Yeah right, that will totally work', expected: 'disapproval' },
    { input: 'Just "perfect"', expected: 'annoyance' },
    { input: 'Sure, why not break everything?', expected: 'annoyance' },
  ];

  sarcasmTests.forEach((test, index) => {
    console.log(`\n--- Sarcasm Test ${index + 1} ---`);
    console.log(`Input: "${test.input}"`);
    const analysis = analyzeEmotions(test.input);
    console.log(`Detected: ${analysis[0]?.emotion || 'neutral'} (expected: ${test.expected})`);
    console.log(`Confidence: ${((analysis[0]?.confidence || 0) * 100).toFixed(1)}%`);
  });

  // Test 4: Emoji analysis
  console.log('\n\nTest 4: Emoji emotion analysis');
  const emojiTests = [
    { input: 'I love this! 😍😍', expected: 'love' },
    { input: 'So sad 😢', expected: 'sadness' },
    { input: 'This is hilarious 😂😂😂', expected: 'amusement' },
    { input: 'What?? 🤔', expected: 'confusion' },
  ];

  emojiTests.forEach((test, index) => {
    console.log(`\n--- Emoji Test ${index + 1} ---`);
    console.log(`Input: "${test.input}"`);
    const analysis = analyzeEmotions(test.input);
    console.log(`Detected: ${analysis[0]?.emotion || 'neutral'} (expected: ${test.expected})`);
    console.log(`Confidence: ${((analysis[0]?.confidence || 0) * 100).toFixed(1)}%`);
  });

  // Test 5: Negation scope
  console.log('\n\nTest 5: Negation scope detection');
  const negationTests = [
    { input: "I'm not happy about this", expected: 'disappointment' },
    { input: "This is not terrible", expected: 'neutral' },
    { input: "I don't hate it", expected: 'neutral' },
    { input: "Never been more excited!", expected: 'excitement' },
  ];

  negationTests.forEach((test, index) => {
    console.log(`\n--- Negation Test ${index + 1} ---`);
    console.log(`Input: "${test.input}"`);
    const analysis = analyzeEmotions(test.input);
    console.log(`Detected: ${analysis[0]?.emotion || 'neutral'}`);
    console.log(`Confidence: ${((analysis[0]?.confidence || 0) * 100).toFixed(1)}%`);
  });

  // Test 6: Emotion intensity
  console.log('\n\nTest 6: Emotion intensity detection');
  const intensityTests = [
    { input: "I'm happy", expectedIntensity: 'medium' },
    { input: "I'm EXTREMELY HAPPY!!!", expectedIntensity: 'very_high' },
    { input: "I'm sooooo excited", expectedIntensity: 'high' },
    { input: "That's okay", expectedIntensity: 'low' },
  ];

  intensityTests.forEach((test, index) => {
    console.log(`\n--- Intensity Test ${index + 1} ---`);
    console.log(`Input: "${test.input}"`);
    const analysis = analyzeEmotionsWithIntensity(test.input);
    if (analysis.length > 0) {
      console.log(`Detected: ${analysis[0].emotion}`);
      console.log(`Intensity: ${analysis[0].intensity} (expected: ${test.expectedIntensity})`);
      console.log(`Confidence: ${(analysis[0].confidence * 100).toFixed(1)}%`);
    }
  });

  // Test 7: Conversation history tracking
  console.log('\n\nTest 7: Emotion history and trajectory');
  emotionHistory.clear();
  
  const conversation = [
    { user: "I'm frustrated", ai: "I understand" },
    { user: "This is really annoying", ai: "Let me help" },
    { user: "Getting worse!", ai: "I see" },
  ];

  conversation.forEach((turn, index) => {
    console.log(`\nTurn ${index + 1}:`);
    classifyConversationEmotion(turn.user, turn.ai);
    const trajectory = emotionHistory.getEmotionalTrajectory();
    console.log(`  User: "${turn.user}"`);
    console.log(`  Trajectory: ${trajectory}`);
  });

  // Test 8: Psychological coherence - positive text should not have negative emotions
  console.log('\n\nTest 8: Psychological coherence validation');
  const coherenceTests = [
    { 
      input: 'This is amazing! I love it so much. Great work!', 
      expectedPrimary: 'joy',
      shouldNotBe: ['anger', 'sadness', 'disappointment', 'disapproval']
    },
    { 
      input: 'This is terrible. I hate everything about it.', 
      expectedPrimary: 'anger',
      shouldNotBe: ['joy', 'excitement', 'love', 'gratitude']
    },
    {
      input: 'Thank you! This is perfect and exactly what I needed.',
      expectedPrimary: 'gratitude',
      shouldNotBe: ['anger', 'disgust', 'disappointment']
    },
    {
      input: 'Wonderful! Absolutely brilliant and outstanding!',
      expectedPrimary: 'admiration',
      shouldNotBe: ['disapproval', 'anger', 'sadness']
    },
  ];

  coherenceTests.forEach((test, index) => {
    console.log(`\n--- Coherence Test ${index + 1} ---`);
    console.log(`Input: "${test.input}"`);
    const analysis = analyzeEmotions(test.input);
    const primary = analysis[0]?.emotion || 'neutral';
    
    console.log(`Expected primary: ${test.expectedPrimary}, Got: ${primary}`);
    console.log(`All detected emotions:`);
    analysis.slice(0, 5).forEach(e => {
      const mark = test.shouldNotBe.includes(e.emotion) ? '❌ SHOULD NOT APPEAR' : '✓';
      console.log(`  ${mark} ${e.emotion}: ${(e.confidence * 100).toFixed(1)}%`);
    });
    
    // Check if any "should not be" emotions are in top 3
    const top3 = analysis.slice(0, 3).map(e => e.emotion);
    const violations = test.shouldNotBe.filter(e => top3.includes(e as any));
    if (violations.length > 0) {
      console.log(`⚠️  WARNING: Found incompatible emotions in top 3: ${violations.join(', ')}`);
    } else {
      console.log(`✅ Psychological coherence maintained`);
    }
  });

  // Test 9: Avatar-Box Synchronization
  console.log('\n\nTest 9: Avatar and Emotion Box Synchronization');
  const syncTests = [
    {
      user: 'This is amazing! I love it!',
      ai: "Thank you! I'm so glad you're enjoying it!",
      description: 'Positive conversation'
    },
    {
      user: "I'm confused about this",
      ai: 'Let me help clarify that for you. I understand it can be confusing.',
      description: 'Helpful response to confusion'
    },
    {
      user: 'Great work!',
      ai: 'I appreciate your feedback!',
      description: 'Simple gratitude'
    },
    {
      user: 'This is terrible',
      ai: "I'm sorry you're having a difficult experience. Let me help.",
      description: 'Caring response to frustration'
    },
  ];

  syncTests.forEach((test, index) => {
    console.log(`\n--- Sync Test ${index + 1}: ${test.description} ---`);
    console.log(`User: "${test.user}"`);
    console.log(`AI: "${test.ai}"`);
    
    // Get synchronized analysis
    const fullAnalysis = analyzeConversationEmotions(test.user, test.ai);
    
    console.log(`\n🎭 Avatar Emotion: ${fullAnalysis.avatarEmotion.toUpperCase()}`);
    console.log(`📊 Response Emotions Box: ${fullAnalysis.responseEmotions.join(', ')}`);
    console.log(`👤 User Emotions Box: ${fullAnalysis.userEmotions.join(', ')}`);
    
    // Check if avatar emotion is in the response emotions list
    const avatarEmotionInBox = fullAnalysis.responseEmotions.some(emotionStr => 
      emotionStr.toLowerCase().startsWith(fullAnalysis.avatarEmotion.toLowerCase())
    );
    
    if (avatarEmotionInBox) {
      console.log(`✅ Avatar emotion (${fullAnalysis.avatarEmotion}) is shown in response box`);
    } else {
      console.log(`⚠️  WARNING: Avatar shows ${fullAnalysis.avatarEmotion} but it's not prominent in response box`);
      console.log(`   Response box shows: ${fullAnalysis.responseEmotions[0]}`);
    }
  });

  console.log('\n✅ Enhanced emotion classification tests completed!');
}

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).testEmotions = runEmotionTests;
  console.log(
    '💡 Run testEmotions() in the console to test enhanced emotion classification'
  );
}

