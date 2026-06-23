// Test multiple Gemini models to find one with available quota
const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('Usage: node test_models.mjs YOUR_API_KEY');
  process.exit(1);
}

const models = [
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-1.0-pro',
];

const { GoogleGenAI } = await import('@google/genai');
const ai = new GoogleGenAI({ apiKey });

console.log(`🔑 Key: ${apiKey.substring(0, 12)}...\n`);
console.log('Testing models...\n');

for (const model of models) {
  process.stdout.write(`📡 ${model.padEnd(30)}`);
  try {
    const response = await ai.models.generateContent({
      model,
      contents: 'Say "OK" only.',
    });
    const text = response.text?.trim();
    console.log(`✅ WORKS! Response: "${text}"`);
    console.log(`\n🎉 Use this model: ${model}`);
    break;
  } catch (err) {
    const msg = err?.message || String(err);
    if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
      console.log('❌ 429 Quota exceeded');
    } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      console.log('⚠️  Model not found');
    } else if (msg.includes('401') || msg.toLowerCase().includes('unauthenticated')) {
      console.log('🔒 401 Auth error');
    } else {
      console.log(`❌ Error: ${msg.substring(0, 60)}`);
    }
  }
}

console.log('\nDone.');
