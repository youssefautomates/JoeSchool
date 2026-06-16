const token = 'vca_2rKPAZIs6BpDm3N2JipbpcvLNp3qhJpjgb7t0fDjyzxA3KUVZR06qDvc';
const projectId = 'prj_trg68RA4buDCi9PBdsc8S3NKq46F';
const teamId = 'team_U4AoZey6IielVKfm7FenzyfV';

async function run() {
  const url = `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=5`;
  console.log('Fetching latest deployments from Vercel...');
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
    console.error('❌ Failed to fetch deployments:', res.status, await res.text());
    return;
  }

  const data = await res.json();
  console.log(`📋 Found ${data.deployments?.length || 0} deployments.`);
  data.deployments.forEach((dep, idx) => {
    console.log(`\n[Deployment #${idx+1}]`);
    console.log(`- ID: ${dep.uid}`);
    console.log(`- State: ${dep.state}`);
    console.log(`- URL: https://${dep.url}`);
    console.log(`- Created: ${new Date(dep.created).toLocaleString()}`);
    console.log(`- Creator: ${dep.creator?.username}`);
    console.log(`- Commit: ${dep.meta?.githubCommitMessage || 'N/A'} (${dep.meta?.githubCommitSha?.slice(0, 7) || 'N/A'})`);
  });
}

run().catch(err => console.error(err));
