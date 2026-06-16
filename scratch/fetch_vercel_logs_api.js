const fs = require('fs');
const path = require('path');

const token = 'vca_2rKPAZIs6BpDm3N2JipbpcvLNp3qhJpjgb7t0fDjyzxA3KUVZR06qDvc';
const deploymentId = 'dpl_BCiuYR3KqLepy87a69AgNqracd5m';

// Timestamps: June 12 18:00 UTC to June 13 15:00 UTC
// In milliseconds:
// 2026-06-12T18:00:00Z -> 1781287200000
// 2026-06-13T15:00:00Z -> 1781362800000
const since = 1781287200000;
const until = 1781362800000;

async function getLogs() {
  console.log(`🔍 Fetching logs from Vercel API for deployment ${deploymentId}...`);
  console.log(`Since: ${new Date(since).toISOString()} (${since})`);
  console.log(`Until: ${new Date(until).toISOString()} (${until})`);

  let url = `https://api.vercel.com/v2/deployments/${deploymentId}/events?since=${since}&until=${until}&limit=5000&direction=forward`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error(`❌ Failed to fetch logs: ${response.status}`, await response.text());
    return;
  }

  const events = await response.json();
  console.log(`📋 Received ${events.length || 0} events.`);

  if (!Array.isArray(events)) {
    console.log('Unexpected response format:', JSON.stringify(events).slice(0, 500));
    return;
  }

  // Write all logs to a file for backup
  fs.writeFileSync(path.resolve(__dirname, 'vercel_api_raw_logs.json'), JSON.stringify(events, null, 2));
  console.log(`💾 Raw logs saved to scratch/vercel_api_raw_logs.json`);

  // Analyze events
  // We want to find any logs related to `/api/paymob/callback`, `/api/paymob/webhook`, or `/api/paymob/verify-and-deliver`
  const keywords = ['paymob', 'callback', 'webhook', 'verify-and-deliver', 'pi_live_'];
  const matchedEvents = [];

  events.forEach(event => {
    // Event message or request path
    const message = event.info?.message || event.payload?.text || event.text || '';
    const requestPath = event.info?.requestPath || '';
    const textContent = (message + ' ' + requestPath).toLowerCase();

    const isMatch = keywords.some(k => textContent.includes(k.toLowerCase()));
    if (isMatch) {
      matchedEvents.push(event);
    }
  });

  console.log(`\n🔎 Found ${matchedEvents.length} events matching payment keywords.`);

  matchedEvents.forEach((event, idx) => {
    const time = new Date(event.created || event.timestamp).toISOString();
    const requestPath = event.info?.requestPath || '';
    const statusCode = event.info?.statusCode || '';
    const message = event.info?.message || event.payload?.text || event.text || '';
    console.log(`\n[Event #${idx+1}] Time: ${time} | Path: ${requestPath} | Status: ${statusCode}`);
    console.log(`Message: ${message}`);
  });
}

getLogs().catch(err => console.error('Error:', err));
