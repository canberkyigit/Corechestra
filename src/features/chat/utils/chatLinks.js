/*
 * Link previews ("unfurls").
 *
 * Well-known providers (YouTube, GitHub, Figma, Loom, Google Docs, direct
 * images) and Corechestra's own links are recognised from the URL alone, so
 * they work without any server. Arbitrary pages need their HTML fetched,
 * which browsers block cross-origin; when `REACT_APP_LINK_PREVIEW_ENDPOINT`
 * is configured the author's client asks it for Open Graph metadata once and
 * stores the result on the message for everyone else.
 */

const URL_PATTERN = /https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"\]]/g;
const CODE_SEGMENTS = /(```[\s\S]*?```|`[^`\n]+`)/g;
const MAX_PREVIEWS = 3;
const ENDPOINT = process.env.REACT_APP_LINK_PREVIEW_ENDPOINT || "";

export function extractUrls(text, max = MAX_PREVIEWS) {
  const outsideCode = String(text || "").split(CODE_SEGMENTS).filter((_, index) => index % 2 === 0).join(" ");
  // Markdown links: keep the href.
  const found = [...outsideCode.matchAll(URL_PATTERN)].map((match) => match[0]);
  return [...new Set(found)].slice(0, max);
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function prettyName(segment) {
  return decodeURIComponent(String(segment || "")).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Classifies a URL. Returns `null` for invalid URLs, otherwise
 * `{ kind, url, host, ... }` with provider specific fields.
 */
export function classifyUrl(value, { origin = typeof window !== "undefined" ? window.location.origin : "" } = {}) {
  const url = safeUrl(value);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "");
  const base = { url: url.toString(), host };

  if (origin && url.origin === origin) {
    const page = url.pathname.replace(/^\//, "").split("/")[0];
    const params = url.searchParams;
    if (page === "docs" && params.get("page")) return { ...base, kind: "internal", entity: "doc", id: params.get("page") };
    if (page === "releases" && params.get("release")) return { ...base, kind: "internal", entity: "release", id: params.get("release") };
    if (page === "chats" && params.get("c")) return { ...base, kind: "internal", entity: "message", channelId: params.get("c"), messageId: params.get("m"), threadRootId: params.get("t") };
    return { ...base, kind: "internal", entity: "page", page: page || "board" };
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    let id = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    else if (url.pathname.startsWith("/shorts/")) id = url.pathname.split("/")[2];
    else id = url.searchParams.get("v");
    if (id && /^[\w-]{6,20}$/.test(id)) {
      return {
        ...base,
        kind: "video",
        provider: "YouTube",
        title: "YouTube video",
        image: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        embed: `https://www.youtube-nocookie.com/embed/${id}`,
      };
    }
  }

  if (host === "loom.com") {
    const match = url.pathname.match(/^\/share\/([\w-]+)/);
    if (match) return { ...base, kind: "video", provider: "Loom", title: "Loom recording", embed: `https://www.loom.com/embed/${match[1]}` };
  }

  if (host === "github.com") {
    const [owner, repo, section, number, ...rest] = url.pathname.split("/").filter(Boolean);
    if (owner && repo) {
      let title = `${owner}/${repo}`;
      let subtitle = "Repository";
      if (section === "pull" && number) { title = `${owner}/${repo} #${number}`; subtitle = "Pull request"; }
      else if (section === "issues" && number) { title = `${owner}/${repo} #${number}`; subtitle = "Issue"; }
      else if (section === "commit" && number) { title = `${owner}/${repo}@${number.slice(0, 7)}`; subtitle = "Commit"; }
      else if ((section === "blob" || section === "tree") && rest.length) { title = `${owner}/${repo}/${rest.join("/")}`; subtitle = section === "blob" ? "File" : "Folder"; }
      else if (section === "releases") { subtitle = "Releases"; }
      return { ...base, kind: "card", provider: "GitHub", title, subtitle };
    }
  }

  if (host === "figma.com") {
    const match = url.pathname.match(/^\/(?:file|design|proto|board)\/([\w-]+)\/?([^/?]*)/);
    if (match) return { ...base, kind: "card", provider: "Figma", title: prettyName(match[2]) || "Figma file", subtitle: "Design file" };
  }

  if (host === "docs.google.com") {
    const kind = url.pathname.split("/")[1];
    const labels = { document: "Google Docs", spreadsheets: "Google Sheets", presentation: "Google Slides", forms: "Google Forms" };
    if (labels[kind]) return { ...base, kind: "card", provider: labels[kind], title: labels[kind].replace("Google ", "") + " file", subtitle: "Google Workspace" };
  }

  if (/\.(png|jpe?g|gif|webp|avif)$/i.test(url.pathname)) {
    return { ...base, kind: "image", title: prettyName(url.pathname.split("/").pop()), image: url.toString() };
  }

  const path = url.pathname.replace(/\/$/, "");
  return {
    ...base,
    kind: "card",
    provider: host,
    title: path && path !== "" ? prettyName(path.split("/").pop()) || host : host,
    subtitle: host,
    generic: true,
  };
}

export function isLinkPreviewServiceAvailable() {
  return Boolean(ENDPOINT);
}

/** Open Graph metadata from the configured service: `{ title, description, image, siteName }`. */
export async function fetchLinkMetadata(url, { signal } = {}) {
  if (!ENDPOINT) return null;
  const response = await fetch(`${ENDPOINT}${ENDPOINT.includes("?") ? "&" : "?"}url=${encodeURIComponent(url)}`, { signal });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data || (!data.title && !data.description && !data.image)) return null;
  return {
    url,
    title: String(data.title || "").slice(0, 200),
    description: String(data.description || "").slice(0, 400),
    image: typeof data.image === "string" && /^https?:\/\//.test(data.image) ? data.image : null,
    siteName: String(data.siteName || data.site_name || "").slice(0, 80),
  };
}

/**
 * Previews to store on a freshly sent message: metadata for generic links
 * only (provider links are rendered from the URL). Never throws.
 */
export async function resolveStoredPreviews(text) {
  if (!ENDPOINT) return [];
  const generic = extractUrls(text).filter((url) => classifyUrl(url)?.generic);
  const results = await Promise.all(generic.map((url) => fetchLinkMetadata(url).catch(() => null)));
  return results.filter(Boolean);
}
