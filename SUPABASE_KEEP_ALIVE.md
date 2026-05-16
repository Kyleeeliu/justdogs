# Supabase Keep-Alive Automation

This project includes an automated system to prevent the Supabase free tier database from becoming inactive after a week of no usage.

## How It Works

### 1. Keep-Alive API Endpoint
- **Location**: `/api/keep-alive`
- **Purpose**: Performs a simple database query to keep Supabase active
- **Security**: Protected with an optional bearer token
- **Methods**: GET and POST supported

### 2. Automated Scheduling
- **Platform**: Vercel Cron Jobs
- **Schedule**: Once a week (`0 0 * * 0`)
- **Configuration**: Defined in `vercel.json`

### 3. Environment Variables
Add these to your `.env.local` and Vercel environment variables:

```env
# Required for Supabase connection
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional security token for keep-alive endpoint
KEEP_ALIVE_TOKEN=your_secure_token
```

## Setup Instructions

### 1. Local Development
The system is already configured and will work automatically when deployed to Vercel.

### 2. Vercel Deployment
1. Deploy your project to Vercel
2. Add the environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `KEEP_ALIVE_TOKEN` (optional but recommended)

### 3. Vercel Cron Jobs
Vercel will automatically recognize the `vercel.json` configuration and set up the cron job.

## Testing

### Manual Testing
```bash
# Test with authorization (if KEEP_ALIVE_TOKEN is set)
curl -X GET "https://your-domain.vercel.app/api/keep-alive" \
  -H "Authorization: Bearer your_keep_alive_token"

# Test without authorization (should return 401 if token is set)
curl -X GET "https://your-domain.vercel.app/api/keep-alive"
```

### Expected Response
```json
{
  "success": true,
  "message": "Database is active",
  "timestamp": "2026-05-12T06:30:22.355Z",
  "queryResult": "Query executed successfully"
}
```

## Schedule Details

- **Frequency**: Once a week
- **Time**: Every Sunday at 00:00 UTC
- **Purpose**: Ensures database activity well within the 7-day inactivity limit

## Security Features

- Optional bearer token authentication
- Server-side only execution using service role key
- Error handling and logging
- No sensitive data exposure in responses

## Monitoring

Check Vercel's Functions tab to monitor:
- Cron job execution logs
- Success/failure rates
- Response times
- Any errors

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check if `KEEP_ALIVE_TOKEN` is set correctly
2. **500 Internal Server Error**: Verify Supabase credentials and database access
3. **Cron not running**: Ensure `vercel.json` is in the root directory

### Logs
Check Vercel function logs for detailed error information and execution history.

## Cost Considerations

- Vercel Cron Jobs: Free tier includes sufficient executions
- Supabase: Minimal database queries don't impact free tier limits
- This solution is completely free for typical usage patterns

## Alternative Solutions

If you prefer other approaches:
1. **GitHub Actions**: Use scheduled workflows
2. **External Services**: UptimeRobot, Pingdom, etc.
3. **Manual**: Set calendar reminders to visit your app weekly

This automated solution is the most reliable and maintenance-free option.