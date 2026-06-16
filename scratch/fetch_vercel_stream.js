const fs = require('fs');
const path = require('path');

const token = 'vca_2rKPAZIs6BpDm3N2JipbpcvLNp3qhJpjgb7t0fDjyzxA3KUVZR06qDvc';
const projectId = 'prj_trg68RA4buDCi9PBdsc8S3NKq46F';
const deploymentId = 'dpl_BCiuYR3KqLepy87a69AgNqracd5m';
const teamId = 'team_U4AoZey6IielVKfm7FenzyfV';

// Timestamps: June 12 18:00 UTC to June 13 15:00 UTC
const since = 1781287200000;
const until = 1781362800000;

async function run() {
  console.log(`🔍 Fetching streaming runtime logs...`);
  // Note: for this API, since and until are in seconds, or milliseconds?
  // Let's try both or let's check. Standard Vercel API since/until is in seconds or milliseconds.
  // The web search said "since: epoch time in milliseconds (or relative or string)".
  // Wait, let's use milliseconds since it's the standard. If that returns nothing, we can try seconds.
  // Actually, let's request both!
  
  let logsUrl = `https://api.vercel.com/v1/projects/${projectId}/deployments/${deploymentId}/runtime-logs?since=${since}&until=${until}&teamId=${teamId}`;
  console.log('Request URL:', logsUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('⏱️ 30s timeout reached, aborting stream...');
    controller.abort();
  }, 30000);

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
          const msg = (event.message || '').toLowerCase();
          const pathStr = (event.proxy?.request?.path || '').toLowerCase();
          const isMatch = keywords.some(k => msg.includes(k) || pathStr.includes(k));
          
          if (isMatch) {
            matched.push(event);
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse line:', line.slice(0, 100));
        }
      }
    }

    clearTimeout(timeoutId);
    console.log(`📋 Total events parsed: ${eventCount}`);
    console.log(`🔎 Found ${matched.length} matching events:`);

    fs.writeFileSync(path.resolve(__dirname, 'matched_vercel_logs.json'), JSON.stringify(matched, null, 2));
    console.log(`💾 Saved matched logs to scratch/matched_vercel_logs.json`);

    matched.forEach((e, idx) => {
      console.log(`\n[Event #${idx+1}] Time: ${new Date(e.timestamp).toISOString()} | Method: ${e.proxy?.request?.method} | Path: ${e.proxy?.request?.path} | Status: ${e.proxy?.response?.status}`);
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
