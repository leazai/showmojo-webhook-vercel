# ShowMojo Webhook Handler for Vercel

Real-time webhook listener for ShowMojo that stores data in Supabase.

## One-Click Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/leazai/showmojo-webhook-vercel)

## Manual Deployment

1. Fork or clone this repository
2. Sign up for [Vercel](https://vercel.com) (free)
3. Import this repository in Vercel
4. Add environment variables:
   - `DATABASE_URL`: `postgresql://postgres:Leazgrowinfinite%23%40%40@db.adqrscwcbdzezbxhyqjl.supabase.co:5432/postgres`
   - `SHOWMOJO_BEARER_TOKEN`: `27ac6aadb42bb1fa05ef6167c5572674`
5. Deploy!

## Your Webhook URL

After deployment, your webhook URL will be:
```
https://YOUR-PROJECT.vercel.app/webhook
```

## Configure ShowMojo

1. Go to ShowMojo settings
2. Add webhook URL: `https://YOUR-PROJECT.vercel.app/webhook`
3. Set Authorization header: `Bearer 27ac6aadb42bb1fa05ef6167c5572674`
4. Save and test!

## Features

- ✅ Real-time webhook processing
- ✅ Stores data in Supabase PostgreSQL
- ✅ Automatic deduplication
- ✅ Tracks listings, showings, and prospects
- ✅ 100% serverless
- ✅ Free hosting on Vercel

## API Endpoint

**POST** `/webhook`

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer 27ac6aadb42bb1fa05ef6167c5572674`

## Database Tables

- `events` - All webhook events
- `showings` - Showing details
- `listings` - Property information
- `prospects` - Contact information

## Support

For issues or questions, check the [documentation](https://github.com/leazai/showmojo-webhook-vercel).
