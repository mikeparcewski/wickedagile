/* ──────────────────────────────────────────────────────────────
   Build-time Medium RSS fetch. Runs in Node during `astro build`,
   where the request is NOT subject to browser CORS / origin rules
   (rss2json returns 200 server-side but 422 with no CORS from a
   browser; corsproxy.io is now paywalled). The result is baked into
   static HTML, so the page never depends on a client-side proxy.
   ────────────────────────────────────────────────────────────── */
const FEED = 'https://medium.com/feed/@mike.parcewski';

function readTime(html) {
  const wc = String(html || '').replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wc / 200));
}

/* A clean intro snippet for the mobile article list: strip tags/entities,
   collapse whitespace, then hard-cap at n chars on a word boundary + ellipsis. */
function introSnippet(html, n = 120) {
  const txt = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (txt.length <= n) return txt;
  return txt.slice(0, n).replace(/\s+\S*$/, '').trim() + '…';
}

function mapRss2json(items) {
  return items.slice(0, 12).map((it) => {
    const html = it.content || it.description || '';
    let thumb = it.thumbnail || '';
    if (!thumb) { const m = html.match(/<img[^>]+src="([^"]+)"/); if (m) thumb = m[1]; }
    return {
      title: (it.title || '').trim(),
      link: (it.link || '').trim(),
      pubDate: it.pubDate || '',
      thumbnail: thumb || '',
      readTime: readTime(html),
      intro: introSnippet(it.description || it.content || ''),
    };
  }).filter((a) => a.title && a.link);
}

function parseXml(xml) {
  const out = [];
  const blocks = xml.split(/<item>/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/item>/i)[0];
    const pick = (tag) => {
      const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };
    const title = pick('title');
    const link = pick('link') || pick('guid');
    const content = pick('content:encoded') || pick('description');
    let thumb = '';
    const im = content.match(/<img[^>]+src="([^"]+)"/); if (im) thumb = im[1];
    if (title && link) out.push({ title, link, pubDate: pick('pubDate'), thumbnail: thumb, readTime: readTime(content), intro: introSnippet(pick('description') || content) });
    if (out.length >= 12) break;
  }
  return out;
}

export async function getArticles() {
  // primary: rss2json (clean JSON, works server-side)
  try {
    const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(FEED) + '&count=12');
    if (r.ok) {
      const j = await r.json();
      if (j && j.status === 'ok' && Array.isArray(j.items) && j.items.length) return mapRss2json(j.items);
    }
  } catch (_) { /* fall through */ }
  // fallback: Medium feed XML directly (no CORS at build time)
  try {
    const r = await fetch(FEED, { headers: { 'user-agent': 'wickedagile-build' } });
    if (r.ok) { const items = parseXml(await r.text()); if (items.length) return items; }
  } catch (_) { /* fall through */ }
  return [];
}
