/*
 * GIF search via Tenor (v2). Needs an API key, from the workspace chat
 * settings (admins can paste one) or `REACT_APP_TENOR_KEY`. Without a key the
 * GIF button is hidden. GIFs are stored as external URLs, not data URLs.
 */

const ENV_KEY = process.env.REACT_APP_TENOR_KEY || "";
const BASE = "https://tenor.googleapis.com/v2";

export function resolveGifKey(workspace) {
  return String(workspace?.integrations?.tenorKey || ENV_KEY || "").trim();
}

function mapResults(data) {
  return (data?.results || []).map((item) => {
    const gif = item.media_formats?.gif || item.media_formats?.mediumgif;
    const tiny = item.media_formats?.tinygif || item.media_formats?.nanogif || gif;
    if (!gif?.url) return null;
    return {
      id: item.id,
      title: item.content_description || item.title || "GIF",
      url: gif.url,
      preview: tiny?.url || gif.url,
      width: gif.dims?.[0] || tiny?.dims?.[0] || 0,
      height: gif.dims?.[1] || tiny?.dims?.[1] || 0,
    };
  }).filter(Boolean);
}

export async function searchGifs(query, { key, limit = 24, signal } = {}) {
  if (!key) return [];
  const params = new URLSearchParams({ key, limit: String(limit), media_filter: "gif,tinygif", contentfilter: "medium", client_key: "corechestra" });
  const endpoint = query?.trim() ? `${BASE}/search?q=${encodeURIComponent(query.trim())}&${params}` : `${BASE}/featured?${params}`;
  const response = await fetch(endpoint, { signal });
  if (!response.ok) throw new Error(response.status === 400 || response.status === 403 ? "The GIF API key was rejected." : "GIF search is unavailable right now.");
  return mapResults(await response.json());
}

export function gifToAttachment(gif) {
  return {
    id: `gif-${gif.id}`,
    name: `${gif.title || "GIF"}.gif`.slice(0, 80),
    type: "image/gif",
    size: 0,
    url: gif.url,
    width: gif.width,
    height: gif.height,
    source: "tenor",
  };
}
