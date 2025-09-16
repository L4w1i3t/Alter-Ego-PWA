// Test file for emotion classification
import {
  analyzeEmotions,
  classifyConversationEmotion,
  getPrimaryEmotion,
  EMOTION_LABELS,
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
];

// Function to run tests
export function runEmotionTests() {
  console.log(' Running Emotion Classification Tests...\n');

  // Test 1: Check all emotion labels are valid
  console.log('Test 1: Validating emotion labels');
  console.log(`Total emotion labels: ${EMOTION_LABELS.length}`);
  console.log(`Emotion labels: ${EMOTION_LABELS.join(', ')}\n`);

  // Test 2: Basic emotion analysis
  console.log('Test 2: Basic emotion analysis');
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test Case ${index + 1} ---`);
    console.log(`User: "${testCase.userInput}"`);
    console.log(`AI: "${testCase.aiResponse}"`);

    const primaryEmotion = classifyConversationEmotion(
      testCase.userInput,
      testCase.aiResponse
    );
    const userAnalysis = analyzeEmotions(testCase.userInput);
    const responseAnalysis = analyzeEmotions(testCase.aiResponse);

    console.log(
      `User emotions: ${userAnalysis.map((e: any) => `${e.emotion}(${(e.confidence * 100).toFixed(1)}%)`).join(', ')}`
    );
    console.log(
      `Response emotions: ${responseAnalysis.map((e: any) => `${e.emotion}(${(e.confidence * 100).toFixed(1)}%)`).join(', ')}`
    );
    console.log(`Avatar emotion (AI response): ${primaryEmotion}`);
    console.log(
      `Expected user: ${testCase.expectedUserEmotion}, Expected response: ${testCase.expectedResponseEmotion}`
    );

    // Check if percentages sum to approximately 100%
    const userTotal = userAnalysis.reduce(
      (sum: number, e: any) => sum + e.confidence,
      0
    );
    const responseTotal = responseAnalysis.reduce(
      (sum: number, e: any) => sum + e.confidence,
      0
    );
    console.log(
      ` User emotions total confidence: ${(userTotal * 100).toFixed(1)}%`
    );
    console.log(
      ` Response emotions total confidence: ${(responseTotal * 100).toFixed(1)}%`
    );
  });

  // Test 3: Edge cases
  console.log('\n\nTest 3: Edge cases');

  const edgeCases = [
    { input: '', response: '', description: 'Empty strings' },
    { input: 'hello', response: 'hi', description: 'Simple greetings' },
    {
      input: 'What time is it?',
      response: "It's 3 PM.",
      description: 'Neutral question',
    },
    {
      input: 'I LOVE this SO MUCH!!!',
      response: "That's fantastic!",
      description: 'High intensity positive',
    },
    {
      input: 'I hate everything',
      response: "I'm sorry you're feeling that way.",
      description: 'Strong negative emotion',
    },
  ];
  edgeCases.forEach((testCase, index) => {
    console.log(`\n--- Edge Case ${index + 1}: ${testCase.description} ---`);
    const primaryEmotion = classifyConversationEmotion(
      testCase.input,
      testCase.response
    );
    const userAnalysis = analyzeEmotions(testCase.input);
    console.log(`Input: "${testCase.input}"`);
    console.log(`Response: "${testCase.response}"`);
    console.log(`Primary emotion: ${primaryEmotion}`);
    console.log(
      `User emotions: ${userAnalysis.map((e: any) => `${e.emotion}(${(e.confidence * 100).toFixed(1)}%)`).join(', ')}`
    );
  });

  console.log('\n Emotion classification tests completed!');
}

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).testEmotions = runEmotionTests;
  console.log(
    ' Run testEmotions() in the console to test emotion classification'
  );
}
