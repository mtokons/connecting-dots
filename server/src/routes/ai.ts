import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    return null;
  }
  return new Anthropic({ apiKey });
};

// POST /api/ai/captions
router.post('/captions', async (req: Request, res: Response) => {
  const { transcript } = req.body as { transcript?: string };

  if (!transcript) {
    res.status(400).json({ error: 'transcript is required' });
    return;
  }

  const client = getClient();
  if (!client) {
    res.status(500).json({ error: 'Anthropic API key not configured' });
    return;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system:
        'You are a podcast production assistant for Connecting Dot, a professional podcast platform by SCCG Consulting. Return only valid JSON, no markdown.',
      messages: [
        {
          role: 'user',
          content: `Given this transcript segment: '${transcript}'
Return JSON with: 
{ "cleanedTranscript": string, 
  "lowerThirdSuggestions": string[] (3 items, max 40 chars each),
  "chapterTitle": string (max 60 chars) }`,
        },
      ],
    });

    const text =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(text);

    res.json(parsed);
  } catch (err) {
    res.status(500).json({
      error: 'AI processing failed',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// POST /api/ai/layout
router.post('/layout', async (req: Request, res: Response) => {
  const { speakerCount, hasScreenShare } = req.body as {
    speakerCount?: number;
    hasScreenShare?: boolean;
  };

  if (speakerCount === undefined) {
    res.status(400).json({ error: 'speakerCount is required' });
    return;
  }

  const client = getClient();
  if (!client) {
    // Fallback for demo/production without key
    res.json({ layout: speakerCount > 2 ? '2x2' : '2col', mainSpeakerIndex: 0, reason: 'Automatic layout based on speaker count.' });
    return;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      system:
        'You are a podcast production assistant. Return only valid JSON, no markdown.',
      messages: [
        {
          role: 'user',
          content: `Podcast studio has ${speakerCount} speakers, screen share: ${hasScreenShare}. 
Return JSON: { "layout": "1col"|"2col"|"2x2"|"spotlight", "mainSpeakerIndex": number, "reason": string }`,
        },
      ],
    });

    const text =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(text);

    res.json(parsed);
  } catch (err) {
    res.status(500).json({
      error: 'AI layout suggestion failed',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// POST /api/ai/highlight
router.post('/highlight', async (req: Request, res: Response) => {
  const { messages } = req.body as { messages: any[] };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  const client = getClient();
  if (!client) {
    // Return the latest message as a "highlight" if no AI is available
    const latest = messages[0];
    res.json({ highlightId: latest?.id, reason: 'Showing latest message (AI not configured)' });
    return;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      system: 'You are a podcast producer. Identify the most engaging or relevant chat message to show on screen.',
      messages: [
        {
          role: 'user',
          content: `Current chat messages: ${JSON.stringify(messages.slice(0, 5))}
Return JSON: { "highlightId": string, "reason": string }`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    res.json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: 'Highlight analysis failed' });
  }
});

export default router;
