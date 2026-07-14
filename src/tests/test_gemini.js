const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

function loadEnvKey() {
  try {
    const envPath = path.join(__dirname, '../../.env.local');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/GEMINI_API_KEY\s*=\s*(.+)/);
    return match ? match[1].trim() : null;
  } catch (e) {
    return null;
  }
}

async function runTest() {
  const apiKey = loadEnvKey();
  if (!apiKey || apiKey.includes('your-gemini-api-key')) {
    console.error('ERROR: GEMINI_API_KEY is not set in .env.local file!');
    return;
  }

  console.log('Testing Gemini API key integration...\n');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const mockCreator = {
    name: 'Akshay',
    handle: 'akshaygupta_ak',
    niche: 'Fashion',
    location: 'Lucknow, Uttar Pradesh',
    bio: 'fashion Influencer | men\'s Fashion | lifestyle | tech\nakshaygupta1559@gmail.com',
    recent_posts: [
      { text: 'This combo has been working really well for my skin lately 👀' },
      { text: 'Summer days + good audio = perfect content mood ☀️🎤' }
    ]
  };

  const postsText = mockCreator.recent_posts
    .map((post, idx) => `Post ${idx + 1}: "${post.text || ''}"`)
    .join('\n\n');

  const prompt = `
You are an expert brand partnerships manager drafting personalized collaboration outreach copy for an Indian creator.

Creator Details:
- Name: ${mockCreator.name}
- Handle: @${mockCreator.handle}
- Niche/Category: ${mockCreator.niche}
- Location: ${mockCreator.location || 'India'}
- Bio: ${mockCreator.bio || ''}

Collaboration Details:
- Type of Campaign: Sponsored post

Creator's Recent Content/Post Snippets:
${postsText || 'None available.'}

Generate two personalized messages for this creator:
1. An EMAIL (60 to 90 words):
   - Catchy, professional, and friendly subject line.
   - Refer to a specific detail or theme in their recent posts if available.
   - Propose the collaboration type clearly.
   - Keep the length strictly between 60 and 90 words.
   - Conversational tone, avoid boilerplate spammy copy.

2. An INSTAGRAM DM (15 to 30 words):
   - Ultra-short, casual, hook-oriented.
   - Mention a specific detail from their content or style.
   - Ask a simple question about collaborations.
   - Keep it strictly between 15 and 30 words.

Return a JSON object exactly matching this schema:
{
  "emailSubject": "catchy subject line",
  "emailBody": "drafted email content",
  "dmBody": "drafted instagram DM content"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log('SUCCESS! Response from Gemini:');
    console.log(JSON.stringify(JSON.parse(text), null, 2));

    const parsed = JSON.parse(text);
    const emailWordCount = parsed.emailBody.split(/\s+/).length;
    const dmWordCount = parsed.dmBody.split(/\s+/).length;

    console.log(`\nMetrics:`);
    console.log(`- Email word count: ${emailWordCount} words (Target: 60-90)`);
    console.log(`- DM word count: ${dmWordCount} words (Target: 15-30)`);
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

runTest();
