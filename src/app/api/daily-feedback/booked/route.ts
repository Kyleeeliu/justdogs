import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  bookingOverlapsDay,
} from '@/app/api/daily-feedback/_helpers';

type DogRow = { id: string; name: string; breed?: string; owner_id?: string };

/** Dogs with a booking overlapping the given calendar day (UTC), not cancelled. */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !['trainer', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr =
      searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('dog_id, start_time, end_time, status, dogs(id, name, breed, owner_id)')
      .not('status', 'eq', 'cancelled');

    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }

    const byDog = new Map<string, DogRow>();
    for (const row of bookings || []) {
      if (!bookingOverlapsDay(row.start_time, row.end_time, dateStr)) continue;
      const d = row.dogs as DogRow | null;
      if (d?.id) {
        byDog.set(d.id, { id: d.id, name: d.name, breed: d.breed, owner_id: d.owner_id });
      }
    }

    const dogs = Array.from(byDog.values()).sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ date: dateStr, dogs });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
