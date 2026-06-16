const fs = require('fs');
const path = require('path');

const token = 'vca_2rKPAZIs6BpDm3N2JipbpcvLNp3qhJpjgb7t0fDjyzxA3KUVZR06qDvc';
const deploymentId = 'dpl_BCiuYR3KqLepy87a69AgNqracd5m';

// Last 1 hour in milliseconds
const until = Date.now();
const since = until - 60 * 60 * 1000;

async function getLogs() {
  console.log(`🔍 Fetching logs from Vercel API for deployment ${deploymentId}...`);
  console.log(`Since: ${new Date(since).toISOString()}`);
  console.log(`Until: ${new Date(until).toISOString()}`);

  const url = `https://api.vercel.com/v2/deployments/${deploymentId}/events?since=${since}&until=${until}&limit=100&direction=forward`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('HTTP Status:', response.status);
  if (!response.ok) {
    console.error(`❌ Failed to fetch logs: ${response.status}`, await response.text());
    return;
  }

  const events = await response.json();
  console.log(`📋 Received ${events.length || 0} events.`);
  if (events.length > 0) {
    console.log('Sample event:', JSON.stringify(events[0], null, 2));
  }
}

getLogs().catch(err => console.error('Error:', err));
