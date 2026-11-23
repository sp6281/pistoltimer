import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Audio cache to serve instant responses for standard shooting commands
const audioCache = new Map<string, string>();

// Initialize Gemini client on server
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Available Natural Studio Voices
const STUDIO_VOICES = [
  { id: 'Fenrir', name: 'Fenrir (Authoritative British RO)', desc: 'Deep, commanding Range Officer tone ideal for range PA' },
  { id: 'Charon', name: 'Charon (Formal Deep RO)', desc: 'Clear, disciplined, steady competition official tone' },
  { id: 'Puck', name: 'Puck (Crisp Sharp RO)', desc: 'High-clarity, focused range cadence' },
  { id: 'Kore', name: 'Kore (Clear Professional)', desc: 'Balanced, articulate, highly intelligible command voice' },
  { id: 'Zephyr', name: 'Zephyr (Calm Articulate)', desc: 'Smooth, natural voice with crisp pronunciation' },
];

const LOCAL_COMMAND_MAP: Record<string, string> = {
  'LOAD': 'load.wav',
  'TEN SECONDS': 'ten_sec.wav',
  'ATTENTION': 'attention.wav',
  'STOP, UNLOAD, MAKE SAFE': 'stop_unload.wav',
  'MATCH COMPLETE, STAND DOWN': 'match_complete.wav',
};

// Pre-fill cache with pristine local audio files immediately on server start
function initLocalCache() {
  for (const [cmd, filename] of Object.entries(LOCAL_COMMAND_MAP)) {
    const filePath = path.resolve(__dirname, 'public', 'audio', filename);
    if (fs.existsSync(filePath)) {
      const b64 = fs.readFileSync(filePath).toString('base64');
      STUDIO_VOICES.forEach((v) => {
        audioCache.set(`${v.id}:${cmd}`, b64);
      });
    }
  }
}
initLocalCache();

app.get('/api/voices', (req, res) => {
  res.json({
    studioVoices: STUDIO_VOICES,
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Fenrir' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required' });
    }

    const cleanText = text.trim().toUpperCase();
    const cacheKey = `${voice}:${cleanText}`;
    if (audioCache.has(cacheKey)) {
      return res.json({
        audioBase64: audioCache.get(cacheKey),
        mimeType: 'audio/wav',
        cached: true,
      });
    }

    // Try Gemini TTS if not cached
    const ai = getAiClient();
    if (ai) {
      try {
        const validVoice = STUDIO_VOICES.some((v) => v.id === voice) ? voice : 'Fenrir';
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: text.trim(),
                  speechMetadata: {
                    style: 'Commanding, clear, loud British shooting range officer voice',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: validVoice },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          audioCache.set(cacheKey, base64Audio);
          return res.json({
            audioBase64: base64Audio,
            mimeType: 'audio/wav',
            cached: false,
          });
        }
      } catch (err) {
        console.warn('Gemini TTS unavailable, falling back to local studio files:', err);
      }
    }

    // Fallback to local studio audio files
    const localFileName = LOCAL_COMMAND_MAP[cleanText];
    if (localFileName) {
      const filePath = path.resolve(__dirname, 'public', 'audio', localFileName);
      if (fs.existsSync(filePath)) {
        const b64 = fs.readFileSync(filePath).toString('base64');
        audioCache.set(cacheKey, b64);
        return res.json({
          audioBase64: b64,
          mimeType: 'audio/wav',
          cached: true,
        });
      }
    }

    return res.status(500).json({ error: 'Audio file not found' });
  } catch (error: unknown) {
    console.error('Error generating speech:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
});

// Mount Vite or serve static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`NSRA Pistol Audio server running at http://0.0.0.0:${port}`);
  });
}

startServer();
