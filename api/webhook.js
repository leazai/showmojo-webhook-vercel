const { Client } = require('pg');
// Force fresh deployment with transaction pooler

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Debug: Check if environment variables are loaded
  console.log('Environment check:', {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasToken: !!process.env.SHOWMOJO_BEARER_TOKEN,
    databaseUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) : 'MISSING'
  });

  // Verify authorization
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.SHOWMOJO_BEARER_TOKEN;
  
  if (!expectedToken) {
    return res.status(500).json({ error: 'Server configuration error: Missing SHOWMOJO_BEARER_TOKEN' });
  }
  
  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Server configuration error: Missing DATABASE_URL' });
  }

  try {
    const payload = req.body;
    
    if (!payload || !payload.event) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const event = payload.event;
    
    // Connect to Supabase PostgreSQL with better configuration
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      query_timeout: 10000,
      statement_timeout: 10000,
      idle_in_transaction_session_timeout: 10000
    });

    console.log('Attempting to connect to database...');
    await client.connect();
    console.log('Database connected successfully');

    try {
      // Insert event
      const eventResult = await client.query(
        `INSERT INTO events (event_id, action, actor, team_member_name, team_member_uid, created_at, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING id`,
        [
          event.id,
          event.action,
          event.actor || null,
          event.team_member_name || null,
          event.team_member_uid || null,
          event.created_at,
          JSON.stringify(payload)
        ]
      );

      // If showing data exists, process it
      if (event.showing) {
        const showing = event.showing;

        // Upsert listing
        if (showing.listing_uid && showing.listing_full_address) {
          await client.query(
            `INSERT INTO listings (uid, full_address, first_seen_at, last_seen_at, total_showings)
             VALUES ($1, $2, NOW(), NOW(), 1)
             ON CONFLICT (uid) DO UPDATE SET
               last_seen_at = NOW(),
               total_showings = listings.total_showings + 1`,
            [showing.listing_uid, showing.listing_full_address]
          );
        }

        // Upsert prospect
        if (showing.email) {
          await client.query(
            `INSERT INTO prospects (email, name, phone, first_contact_at, last_contact_at, total_showings)
             VALUES ($1, $2, $3, NOW(), NOW(), 1)
             ON CONFLICT (email) DO UPDATE SET
               name = COALESCE($2, prospects.name),
               phone = COALESCE($3, prospects.phone),
               last_contact_at = NOW(),
               total_showings = prospects.total_showings + 1`,
            [showing.email, showing.name || null, showing.phone || null]
          );
        }

        // Insert showing
        await client.query(
          `INSERT INTO showings (
            uid, event_id, created_at, showtime, showing_time_zone, 
            showing_time_zone_utc_offset, name, phone, email, notes,
            listing_uid, listing_full_address, is_self_show, 
            confirmed_at, canceled_at, self_show_code_distributed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (uid) DO UPDATE SET
            showtime = COALESCE($4, showings.showtime),
            confirmed_at = COALESCE($14, showings.confirmed_at),
            canceled_at = COALESCE($15, showings.canceled_at),
            self_show_code_distributed_at = COALESCE($16, showings.self_show_code_distributed_at),
            updated_at = NOW()`,
          [
            showing.uid,
            event.id,
            showing.created_at || null,
            showing.showtime || null,
            showing.showing_time_zone || null,
            showing.showing_time_zone_utc_offset || null,
            showing.name || null,
            showing.phone || null,
            showing.email || null,
            showing.notes || null,
            showing.listing_uid || null,
            showing.listing_full_address || null,
            showing.is_self_show || null,
            showing.confirmed_at || null,
            showing.canceled_at || null,
            showing.self_show_code_distributed_at || null
          ]
        );
      }

      await client.end();

      return res.status(200).json({
        status: 'success',
        message: 'Webhook processed successfully',
        event_id: event.id
      });

    } catch (dbError) {
      await client.end();
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Database error', details: dbError.message });
    }

  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack 
    });
  }
};
