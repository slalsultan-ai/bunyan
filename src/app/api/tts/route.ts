import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { getDb } from '@/lib/db';
import { siteContent } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { checkRateLimit, getIp } from '@/lib/rate-limit-db';
import { escapeSpeechXml, prepareArabicSpeech } from '@/lib/arabic-speech';

// Cache key prefix for TTS audio
const TTS_PREFIX = 'tts:v2:';
const LEGACY_TTS_PREFIX = 'tts:';
const MAX_TEXT_LENGTH = 500;

// Voice: ar-SA-HamedNeural (male) or ar-SA-ZariyahNeural (female)
const VOICE = 'ar-SA-ZariyahNeural';

async function getCachedAudio(cacheKey: string): Promise<string | null> {
  try {
    const db = getDb();
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, cacheKey));
    if (!row) return null;
    return (row.value as { audio: string }).audio;
  } catch {
    return null;
  }
}

async function cacheAudio(cacheKey: string, base64Audio: string): Promise<void> {
  try {
    const db = getDb();
    await db
      .insert(siteContent)
      .values({ key: cacheKey, value: { audio: base64Audio } as never })
      .onConflictDoUpdate({
        target: siteContent.key,
        set: { value: { audio: base64Audio } as never, updatedAt: sql`CURRENT_TIMESTAMP` },
      });
  } catch {
    // Cache failure is non-critical
  }
}

async function hashText(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

async function generateAudio(text: string): Promise<Buffer> {
  let lastError: unknown;

  // The consumer speech endpoint can occasionally drop a WebSocket connection.
  // Retrying once prevents a transient failure from forcing a browser fallback.
  for (let attempt = 0; attempt < 2; attempt++) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(escapeSpeechXml(text), {
        // A deliberate, warm cadence is easier for pre-literate children to follow.
        rate: '-12%',
        pitch: '+2Hz',
        volume: '+4%',
      });

      const chunks: Buffer[] = [];
      return await new Promise((resolve, reject) => {
        audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        audioStream.on('end', () => resolve(Buffer.concat(chunks)));
        audioStream.on('error', reject);
      });
    } catch (error) {
      lastError = error;
    } finally {
      tts.close();
    }
  }

  throw lastError;
}

export async function POST(req: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const ip = getIp(req);
  const rl = await checkRateLimit(`tts:${ip}`, 30, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { text } = body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: 'Text too long' }, { status: 400 });
  }

  const cleanText = prepareArabicSpeech(text);
  const [textHash, legacyTextHash] = await Promise.all([
    hashText(`${VOICE}:warm-v2:${cleanText}`),
    hashText(text.trim()),
  ]);
  const cacheKey = TTS_PREFIX + textHash;

  // Check cache first
  const cached = await getCachedAudio(cacheKey) ?? await getCachedAudio(LEGACY_TTS_PREFIX + legacyTextHash);
  if (cached) {
    const audioBuffer = Buffer.from(cached, 'base64');
    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  // Generate fresh audio
  try {
    const audioBuffer = await generateAudio(cleanText);
    const base64Audio = audioBuffer.toString('base64');

    // Cache for future use (don't await - fire and forget)
    cacheAudio(cacheKey, base64Audio).catch(() => {});

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('[TTS] Generation failed:', err);
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
  }
}
