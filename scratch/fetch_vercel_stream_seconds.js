const fs = require('fs');
const path = require('path');

const token = 'vca_2rKPAZIs6BpDm3N2JipbpcvLNp3qhJpjgb7t0fDjyzxA3KUVZR06qDvc';
const projectId = 'prj_trg68RA4buDCi9PBdsc8S3NKq46F';
const deploymentId = 'dpl_BCiuYR3KqLepy87a69AgNqracd5m';
const teamId = 'team_U4AoZey6IielVKfm7FenzyfV';

// Timestamps in seconds (June 12 18:00 UTC to June 13 15:00 UTC)
const since = 1781287200; 
const until = 1781362800; 

async function run() {
  console.log(`🔍 Fetching streaming runtime logs (using seconds)...`);
  console.log(`Since: ${new Date(since * 1000).toISOString()} (${since})`);
  console.log(`Until: ${new Date(until * 1000).toISOString()} (${until})`);
  
  let logsUrl = `https://api.vercel.com/v1/projects/${projectId}/deployments/${deploymentId}/runtime-logs?since=${since}&until=${until}&teamId=${teamId}`;
  console.log('Request URL:', logsUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('⏱️ 15s timeout reached, aborting stream...');
    controller.abort();
  }, 15000);

  try {
    const response = await fetch(logsUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal
    });

    console.log('HTTP Status:', response.status);
    if (!response.ok) {
      console.error('❌ Failed to fetch:', response.status, await response.text());
      clearTimeout(timeoutId);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let eventCount = 0;
    const allEvents = [];
    const matched = [];

    const keywords = ['paymob', 'callback', 'webhook', 'verify-and-deliver', 'pi_live_'];

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('🏁 Stream ended by server.');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last partial line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        eventCount++;
        try {
          const event = JSON.parse(line);
          allEvents.push(event);
          const msg = (event.message || '').toLowerCase();
          const pathStr = (event.proxy?.request?.path || '').toLowerCase();
          const isMatch = keywords.some(k => msg.includes(k) || pathStr.includes(k));
          
          if (isMatch) {
            matched.push(event);
          }
        } catch (e) {
          // Sometimes it sends non-JSON keep-alive data or partial lines
        }
      }
    }

    clearTimeout(timeoutId);
    console.log(`📋 Total events parsed: ${eventCount}`);
    
    // Save all events for local debugging
    fs.writeFileSync(path.resolve(__dirname, 'all_vercel_logs.json'), JSON.stringify(allEvents, null, 2));
    console.log(`💾 Saved all ${allEvents.length} events to scratch/all_vercel_logs.json`);

    fs.writeFileSync(path.resolve(__dirname, 'matched_vercel_logs.json'), JSON.stringify(matched, null, 2));
    console.log(`💾 Saved matched ${matched.length} logs to scratch/matched_vercel_logs.json`);

    matched.forEach((e, idx) => {
      const dateStr = new Date(e.timestamp).toISOString();
      const method = e.proxy?.request?.method || 'LOG';
      const pathVal = e.proxy?.request?.path || '';
      const statusVal = e.proxy?.response?.status || '';
      console.log(`\n[Event #${idx+1}] Time: ${dateStr} | ${method} ${pathVal} | Status: ${statusVal}`);
      console.log(`Message: ${e.message}`);
    });

  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('🛑 Request aborted due to timeout.');
    } else {
      console.error('Error during fetch:', err);
    }
  }
}

run().catch(err => console.error('Error:', err));
