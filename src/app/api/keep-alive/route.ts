import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  return handleKeepAlive(request);
}

export async function POST(request: NextRequest) {
  return handleKeepAlive(request);
}

async function handleKeepAlive(request: NextRequest) {
  try {
    // Check for optional authorization token
    const keepAliveToken = process.env.KEEP_ALIVE_TOKEN;
    
    if (keepAliveToken) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token || token !== keepAliveToken) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Perform a simple database query to keep Supabase active
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Keep-alive query error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database query failed',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database is active',
      timestamp: new Date().toISOString(),
      queryResult: 'Query executed successfully'
    });

  } catch (error) {
    console.error('Keep-alive error:', error);
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