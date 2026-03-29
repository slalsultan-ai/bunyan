import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { getDb } from '@/lib/db';
import { siteContent } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { rateLimit, getIp } from '@/lib/rate-limit';

// Cache key prefix for TTS audio
const TTS_PREFIX = 'tts:';
const MAX_TEXT_LENGTH = 500;

// Voice: ar-SA-HamedNeural (male) or ar-SA-ZariyahNeural (female)
const VOICE = 'ar-SA-ZariyahNeural';

async function getCachedAudio(textHash: string): Promise<string | null> {
  try {
    const db = getDb();
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, TTS_PREFIX + textHash));
    if (!row) return null;
    return (row.value as { audio: string }).audio;
  } catch {
    return null;
  }
}

async function cacheAudio(textHash: string, base64Audio: string): Promise<void> {
  try {
    const db = getDb();
    await db
      .insert(siteContent)
      .values({ key: TTS_PREFIX + textHash, value: { audio: base64Audio } as never })
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
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  const { audioStream } = tts.toStream(text, {
    rate: '-5%',
    pitch: '+0Hz',
  });

  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    audioStream.on('end', () => {
      tts.close();
      resolve(Buffer.concat(chunks));
    });
    audioStream.on('error', (err: Error) => {
      tts.close();
      reject(err);
    });
  });
}

export async function POST(req: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const ip = getIp(req);
  const rl = rateLimit(`tts:${ip}`, 30, 60_000);
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

  const cleanText = text.trim();
  const textHash = await hashText(cleanText);

  // Check cache first
  const cached = await getCachedAudio(textHash);
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
    cacheAudio(textHash, base64Audio).catch(() => {});

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
