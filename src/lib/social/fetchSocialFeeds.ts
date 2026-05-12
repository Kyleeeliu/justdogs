/**
 * Fetches public Facebook Page posts and (when linked) Instagram Business media
 * using a single Meta Page access token.
 *
 * Env (optional — if META_PAGE_ACCESS_TOKEN is unset, callers should use embed fallbacks):
 * - META_PAGE_ACCESS_TOKEN: long-lived Page access token with pages_read_engagement
 *   (and instagram_basic if the Page has a linked Instagram Business account)
 * - META_PAGE_ID: numeric Page ID or page username (default: justdogsbehaviour)
 */

const GRAPH_VERSION = 'v20.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type SocialPost = {
  id: string;
  source: 'facebook' | 'instagram';
  text: string | null;
  imageUrl: string | null;
  permalink: string;
  publishedAt: string;
};

type GraphError = { message?: string; error?: { message?: string } };

function graphErrorMessage(body: GraphError): string {
  return body.error?.message || body.message || 'Graph API error';
}

function pickFbImage(post: Record<string, unknown>): string | null {
  if (typeof post.full_picture === 'string' && post.full_picture) return post.full_picture;
  const attachments = post.attachments as
    | { data?: Array<{ media?: { image?: { src?: string } }; subattachments?: { data?: Array<{ media?: { image?: { src?: string } } }> } }> }
    | undefined;
  const first = attachments?.data?.[0];
  const fromMain = first?.media?.image?.src;
  if (fromMain) return fromMain;
  const sub = first?.subattachments?.data?.[0];
  return sub?.media?.image?.src ?? null;
}

export async function fetchFacebookPagePosts(
  pageId: string,
  accessToken: string,
  limit: number
): Promise<SocialPost[]> {
  const fields =
    'message,story,created_time,permalink_url,full_picture,attachments{media{image{src}},subattachments{media{image{src}}}}';
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/posts`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  const body = (await res.json()) as { data?: Record<string, unknown>[] } & GraphError;

  if (!res.ok) {
    throw new Error(graphErrorMessage(body));
  }

  const rows = body.data || [];
  const out: SocialPost[] = [];
  for (const post of rows) {
    const id = typeof post.id === 'string' ? post.id : null;
    const created = typeof post.created_time === 'string' ? post.created_time : null;
    const permalink = typeof post.permalink_url === 'string' ? post.permalink_url : null;
    if (!id || !created || !permalink) continue;
    const message =
      (typeof post.message === 'string' && post.message) ||
      (typeof post.story === 'string' && post.story) ||
      null;
    out.push({
      id: `fb_${id}`,
      source: 'facebook',
      text: message,
      imageUrl: pickFbImage(post),
      permalink,
      publishedAt: new Date(created).toISOString(),
    });
  }
  return out;
}

async function resolveInstagramBusinessAccountId(
  pageId: string,
  accessToken: string
): Promise<string | null> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(pageId)}`);
  url.searchParams.set('fields', 'instagram_business_account');
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  const body = (await res.json()) as {
    instagram_business_account?: { id?: string };
  } & GraphError;

  if (!res.ok) {
    return null;
  }
  const igId = body.instagram_business_account?.id;
  return typeof igId === 'string' ? igId : null;
}

export async function fetchInstagramMedia(
  igUserId: string,
  accessToken: string,
  limit: number
): Promise<SocialPost[]> {
  const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  const body = (await res.json()) as {
    data?: Array<{
      id?: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      permalink?: string;
      thumbnail_url?: string;
      timestamp?: string;
    }>;
  } & GraphError;

  if (!res.ok) {
    throw new Error(graphErrorMessage(body));
  }

  const rows = body.data || [];
  const out: SocialPost[] = [];
  for (const m of rows) {
    if (!m.id || !m.timestamp || !m.permalink) continue;
    const imageUrl =
      m.media_type === 'VIDEO'
        ? m.thumbnail_url || m.media_url || null
        : m.media_url || m.thumbnail_url || null;
    out.push({
      id: `ig_${m.id}`,
      source: 'instagram',
      text: typeof m.caption === 'string' ? m.caption : null,
      imageUrl: imageUrl || null,
      permalink: m.permalink,
      publishedAt: new Date(m.timestamp).toISOString(),
    });
  }
  return out;
}

export type MergedSocialFeedResult = {
  configured: boolean;
  posts: SocialPost[];
  error?: string;
};

const DEFAULT_PAGE_ID = 'justdogsbehaviour';

export async function fetchMergedSocialFeed(): Promise<MergedSocialFeedResult> {
  const token = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  const pageId = process.env.META_PAGE_ID?.trim() || DEFAULT_PAGE_ID;

  if (!token) {
    return { configured: false, posts: [] };
  }

  try {
    const half = 12;
    const [fbPosts, igUserId] = await Promise.all([
      fetchFacebookPagePosts(pageId, token, half).catch((e: unknown) => {
        console.error('[social-feed] Facebook fetch failed:', e);
        return [] as SocialPost[];
      }),
      resolveInstagramBusinessAccountId(pageId, token),
    ]);

    let igPosts: SocialPost[] = [];
    if (igUserId) {
      igPosts = await fetchInstagramMedia(igUserId, token, half).catch((e: unknown) => {
        console.error('[social-feed] Instagram fetch failed:', e);
        return [] as SocialPost[];
      });
    }

    const merged = [...fbPosts, ...igPosts].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return { configured: true, posts: merged.slice(0, 24) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { configured: true, posts: [], error: msg };
  }
}

export const FACEBOOK_PAGE_URL = 'https://www.facebook.com/justdogsbehaviour/';
export const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/justdogsbehaviour/';

export function facebookPagePluginSrc(width = 500, height = 700): string {
  const href = encodeURIComponent(FACEBOOK_PAGE_URL);
  return `https://www.facebook.com/plugins/page.php?href=${href}&tabs=timeline&width=${width}&height=${height}&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`;
}
