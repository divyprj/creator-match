import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId, collabType } = body;

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }

    if (!collabType) {
      return NextResponse.json({ error: 'Collaboration type is required' }, { status: 400 });
    }

    // 1. Fetch creator details from database
    const { data: creator, error: creatorError } = await supabase
      .from('influencers')
      .select('*')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: `Creator not found: ${creatorError?.message || 'Unknown'}` },
        { status: 404 }
      );
    }

    // 2. Fetch Gemini API Key from settings (database) or env
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('gemini_api_key')
      .eq('id', 1)
      .single();

    const apiKey = settingsData?.gemini_api_key || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.includes('your-gemini-api-key')) {
      return NextResponse.json(
        { error: 'Gemini API Key is not configured. Please add it in App Settings.' },
        { status: 400 }
      );
    }

    // 3. Prepare recent posts text for personalization
    const postsText = (creator.recent_posts || [])
      .map((post: any, idx: number) => `Post ${idx + 1}: "${post.text || ''}"`)
      .join('\n\n');

    // 4. Initialize Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
You are an expert brand partnerships manager drafting personalized collaboration outreach copy for an Indian creator.

Creator Details:
- Name: ${creator.name}
- Handle: @${creator.handle}
- Niche/Category: ${creator.niche}
- Location: ${creator.location || 'India'}
- Bio: ${creator.bio || ''}

Collaboration Details:
- Type of Campaign: ${collabType}

Creator's Recent Content/Post Snippets:
${postsText || 'None available.'}

Generate two personalized messages for this creator:
1. An EMAIL (60 to 90 words):
   - Catchy, professional, and friendly subject line.
   - Refer to a specific detail or theme in their recent posts if available to show genuine appreciation of their work.
   - Propose the collaboration type clearly.
   - Keep the length strictly between 60 and 90 words (excluding subject line).
   - Conversational tone, avoid boilerplate spammy copy.

2. An INSTAGRAM DM (15 to 30 words):
   - Ultra-short, casual, hook-oriented.
   - Mention a specific detail from their content or style.
   - Ask a simple question about collaborations (e.g. "Do you handle brand inquiries here or via email?").
   - Keep it strictly between 15 and 30 words.

Return a JSON object exactly matching this schema:
{
  "emailSubject": "catchy subject line",
  "emailBody": "drafted email content",
  "dmBody": "drafted instagram DM content"
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let generatedData;
    try {
      generatedData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Gemini JSON response:', responseText);
      return NextResponse.json({ error: 'Gemini did not return valid JSON' }, { status: 500 });
    }

    return NextResponse.json({
      emailSubject: generatedData.emailSubject || `Collab opportunity with @${creator.handle}`,
      emailBody: generatedData.emailBody || '',
      dmBody: generatedData.dmBody || '',
    });

  } catch (error: any) {
    console.error('Error in outreach generation route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
