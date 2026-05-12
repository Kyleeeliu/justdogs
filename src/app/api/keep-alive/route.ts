import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Check if the request is from a valid source (optional security measure)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.KEEP_ALIVE_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Perform a simple query to keep the database active
    // This queries the auth.users table which should always exist
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Keep-alive query failed:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        }, 
        { status: 500 }
      );
    }

    console.log('Keep-alive ping successful at:', new Date().toISOString());
    
    return NextResponse.json({
      success: true,
      message: 'Database is active',
      timestamp: new Date().toISOString(),
      queryResult: data ? 'Query executed successfully' : 'No data returned'
    });

  } catch (error) {
    console.error('Keep-alive endpoint error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

// Also support POST method for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}