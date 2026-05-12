import { NextResponse } from 'next/server';
import { fetchMergedSocialFeed } from '@/lib/social/fetchSocialFeeds';

/**
 * Public JSON for the marketing news page. Graph responses use fetch revalidate (see lib).
 */
export async function GET() {
  try {
    const result = await fetchMergedSocialFeed();
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ configured: false, posts: [], error: message }, { status: 500 });
  }
}
