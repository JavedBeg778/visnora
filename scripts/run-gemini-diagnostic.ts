import { GoogleGenAI } from '@google/genai';

function redact(text: string, secret?: string): string {
  if (!secret || !text) return text;
  return text.split(secret).join('[REDACTED_API_KEY]');
}

function sanitizeError(err: any, secret?: string): any {
  if (!err) return null;
  const rawObj: Record<string, any> = {
    name: err.name,
    message: redact(err.message, secret),
    status: err.status,
    statusCode: err.statusCode,
    code: err.code,
    stack: redact(err.stack, secret),
  };

  // Inspect Google GenAI SDK custom error fields
  if (err.errorDetails) rawObj.errorDetails = JSON.parse(redact(JSON.stringify(err.errorDetails), secret));
  if (err.details) rawObj.details = JSON.parse(redact(JSON.stringify(err.details), secret));
  if (err.response) {
    try {
      rawObj.response = JSON.parse(redact(JSON.stringify(err.response), secret));
    } catch {
      rawObj.response = redact(String(err.response), secret);
    }
  }

  // Check any additional enumerable properties
  for (const key of Object.keys(err)) {
    if (!rawObj[key]) {
      try {
        rawObj[key] = JSON.parse(redact(JSON.stringify(err[key]), secret));
      } catch {
        rawObj[key] = redact(String(err[key]), secret);
      }
    }
  }

  return rawObj;
}

async function runDiagnostic() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY is not defined in environment.');
    process.exit(1);
  }

  console.log('=== Visnora Controlled Gemini 429 Root Cause Diagnostic ===');
  console.log(`API Key Detected: Yes (Length: ${apiKey.length})`);
  console.log(`SDK: @google/genai`);
  console.log(`Target Model: gemini-3.8-flash\n`);

  const client = new GoogleGenAI({ apiKey });

  // Test A: 1 Minimal text-generation request WITHOUT Search Grounding
  console.log('--- TEST A: Minimal text generation WITHOUT Search Grounding ---');
  let testASucceeded = false;
  try {
    const startTime = Date.now();
    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Respond with exactly the single word: READY',
    });
    const latency = Date.now() - startTime;
    testASucceeded = true;
    console.log('TEST A RESULT: SUCCESS');
    console.log(`Latency: ${latency}ms`);
    console.log(`Response Text: "${response.text?.trim()}"`);
    console.log('Usage Metadata:', response.usageMetadata);
  } catch (err: any) {
    console.log('TEST A RESULT: FAILED');
    const sanitized = sanitizeError(err, apiKey);
    console.log('Structured Error:', JSON.stringify(sanitized, null, 2));
  }

  // Test B: 1 request WITH Search Grounding (if Test A succeeded or if needed to compare)
  if (testASucceeded) {
    console.log('\n--- TEST B: 1 request WITH Search Grounding ---');
    try {
      const startTime = Date.now();
      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'What are the top AI SEO tools in 2026? Give a brief 1-sentence answer.',
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      const latency = Date.now() - startTime;
      console.log('TEST B RESULT: SUCCESS');
      console.log(`Latency: ${latency}ms`);
      console.log(`Response Text: "${response.text?.trim()}"`);
      console.log('Usage Metadata:', response.usageMetadata);
      console.log('Grounding Metadata:', JSON.stringify(response.candidates?.[0]?.groundingMetadata, null, 2));
    } catch (err: any) {
      console.log('TEST B RESULT: FAILED');
      const sanitized = sanitizeError(err, apiKey);
      console.log('Structured Error:', JSON.stringify(sanitized, null, 2));
    }
  } else {
    console.log('\nSkipping Test B because Test A failed.');
  }

  console.log('\n=== Diagnostic Completed ===');
}

runDiagnostic().catch((e) => {
  console.error('Fatal diagnostic error:', e);
});

