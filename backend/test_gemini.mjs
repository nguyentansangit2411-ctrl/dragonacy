// Quick Gemini API key test script (supports new AQ. key format)
// Usage: node test_gemini.mjs YOUR_API_KEY_HERE

const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ Usage: node test_gemini.mjs YOUR_GEMINI_API_KEY');
  process.exit(1);
}

console.log(`🔑 Testing key: ${apiKey.substring(0, 10)}...`);
console.log('📡 Calling Gemini API via new @google/genai SDK...\n');

try {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Say "Hello from Gemini!" in exactly 5 words.',
  });

  const text = response.text;
  console.log('✅ SUCCESS! Gemini API key is working!');
  console.log(`💬 Response: "${text}"`);
  console.log('\n👉 Restart your backend with: npm run start:dev');
} catch (err) {
  const msg = err?.message || String(err);
  if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
    console.error('❌ 429 - Quota exceeded. Use a DIFFERENT Google account.');
  } else {
    console.error('❌ Error:', msg);
  }
}
