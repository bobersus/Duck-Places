// These public read-only endpoints replace the former Render service.
// Hosts and upstream paths are fixed: this is not an open proxy.
const endpoints = {
  games: 'https://games.roblox.com/v1/games',
  icons: 'https://thumbnails.roblox.com/v1/games/icons',
  thumbnails: 'https://thumbnails.roblox.com/v1/games/multiget/thumbnails'
};

module.exports = function robloxHandler(kind) {
  return async function handler(req, res) {
    // This API contains only public Roblox data, without cookies or credentials.
    // Allow the GitHub Pages frontend to read responses from our Vercel origin.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const raw = new URL(req.url, 'https://duckplaces.com').searchParams.get('universeIds');
    const ids = raw ? raw.split(',') : [];
    if (!ids.length || ids.length > 50 || ids.some(id => !/^[1-9]\d{0,14}$/.test(id))) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(400).json({ error: 'Provide 1–50 positive universeIds' });
    }

    const url = new URL(endpoints[kind]);
    url.searchParams.set('universeIds', [...new Set(ids)].join(','));
    if (kind === 'icons') {
      url.searchParams.set('size', '512x512');
      url.searchParams.set('format', 'Png');
      url.searchParams.set('isCircular', 'false');
      url.searchParams.set('returnPolicy', 'PlaceHolder');
    }
    if (kind === 'thumbnails') {
      url.searchParams.set('countPerUniverse', '1');
      url.searchParams.set('defaults', 'true');
      url.searchParams.set('size', '768x432');
      url.searchParams.set('format', 'Webp');
      url.searchParams.set('isCircular', 'false');
    }

    try {
      const upstream = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!upstream.ok) throw new Error(`Roblox HTTP ${upstream.status}`);
      const result = await upstream.json();
      if (!Array.isArray(result.data)) throw new Error('Invalid Roblox response');
      // Cache successful responses at the CDN; keep the browser revalidating.
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=60');
      if (req.method === 'HEAD') return res.status(200).end();
      return res.status(200).json({ data: result.data });
    } catch (error) {
      console.error('Roblox request failed:', kind, error.message);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ error: 'Roblox is temporarily unavailable' });
    }
  };
};
