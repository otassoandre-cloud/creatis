// Proxy Groq Whisper — audio transcription
// Reçoit multipart avec champ 'file', retourne { ok, segments, duration }
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ ok: false, error: 'GROQ_API_KEY manquante' });

  try {
    // Lire le body raw et le forwarder tel quel à Groq
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyBuffer = Buffer.concat(chunks);

    const contentType = req.headers['content-type'] || '';

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': contentType,
      },
      body: bodyBuffer,
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(500).json({ ok: false, error: `Groq Whisper: ${err}` });
    }

    const data = await groqRes.json();

    // Groq retourne { text, segments: [{id, start, end, text, ...}] }
    const segments = (data.segments || []).map(s => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));

    const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

    return res.status(200).json({ ok: true, segments, duration, text: data.text || '' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
