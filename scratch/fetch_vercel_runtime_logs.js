const fs = require('fs');
const path = require('path');

const token = 'vca_2rKPAZIs6BpDm3N2JipbpcvLNp3qhJpjgb7t0fDjyzxA3KUVZR06qDvc';
const projectId = 'prj_trg68RA4buDCi9PBdsc8S3NKq46F';
const deploymentId = 'dpl_BCiuYR3KqLepy87a69AgNqracd5m';

// Timestamps: June 12 18:00 UTC to June 13 15:00 UTC
const since = 1781287200000;
const until = 1781362800000;

async function run() {
  console.log('🔍 Fetching Vercel teams...');
  const teamsResponse = await fetch('https://api.vercel.com/v2/teams', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!teamsResponse.ok) {
    console.error('❌ Failed to fetch teams:', teamsResponse.status, await teamsResponse.text());
    return;
  }
  
  const teamsData = await teamsResponse.json();
  console.log('📋 Teams:', JSON.stringify(teamsData, null, 2));
  
  let teamId = null;
  const targetTeam = teamsData.teams.find(t => t.slug === 'youssef-mostafa-projects1');
  if (targetTeam) {
    teamId = targetTeam.id;
    console.log(`✅ Found team ID for 'youssef-mostafa-projects1': ${teamId}`);
  } else {
    console.warn(`⚠️ Could not find team 'youssef-mostafa-projects1' in list. Trying query parameters without teamId...`);
  }

  console.log(`\n🔍 Fetching runtime logs...`);
  let logsUrl = `https://api.vercel.com/v1/projects/${projectId}/deployments/${deploymentId}/runtime-logs?since=${Math.floor(since/1000)}&until=${Math.floor(until/1000)}&limit=1000`;
  if (teamId) {
    logsUrl += `&teamId=${teamId}`;
  }

  console.log('Request URL:', logsUrl);
  const logsResponse = await fetch(logsUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('HTTP Status:', logsResponse.status);
  const text = await logsResponse.text();
  
  try {
    const data = JSON.parse(text);
    console.log(`📋 Received logs response. Size/Keys:`, Object.keys(data));
    
    // Save response to scratch directory
    fs.writeFileSync(path.resolve(__dirname, 'vercel_runtime_logs_raw.json'), JSON.stringify(data, null, 2));
    console.log(`💾 Raw runtime logs saved to scratch/vercel_runtime_logs_raw.json`);
    
    if (data.events) {
      console.log(`📋 Total events received: ${data.events.length}`);
      
      const keywords = ['paymob', 'callback', 'webhook', 'verify-and-deliver', 'pi_live_'];
      const matched = data.events.filter(e => {
        const msg = (e.message || '').toLowerCase();
        const pathStr = (e.proxy?.request?.path || '').toLowerCase();
        return keywords.some(k => msg.includes(k) || pathStr.includes(k));
      });
      
      console.log(`🔎 Found ${matched.length} matching events:`);
      matched.forEach((e, idx) => {
        console.log(`\n[Event #${idx+1}] Time: ${new Date(e.timestamp).toISOString()} | Method: ${e.proxy?.request?.method} | Path: ${e.proxy?.request?.path} | Status: ${e.proxy?.response?.status}`);
        console.log(`Message: ${e.message}`);
      });
    } else {
      console.log('No events array in response. Response body:', text.slice(0, 1000));
    }
  } catch (e) {
    console.error('Failed to parse logs response as JSON:', e);
    console.log('Raw text response:', text.slice(0, 2000));
  }
}

run().catch(err => console.error('Error:', err));
