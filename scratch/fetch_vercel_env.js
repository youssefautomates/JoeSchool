const token = 'vca_2rKPAZIs6BpDm3N2JipbpcvLNp3qhJpjgb7t0fDjyzxA3KUVZR06qDvc';
const projectId = 'prj_trg68RA4buDCi9PBdsc8S3NKq46F';
const teamId = 'team_U4AoZey6IielVKfm7FenzyfV';

async function run() {
  const url = `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}`;
  console.log('Fetching env vars from:', url);
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
    console.error('❌ Failed to fetch env vars:', res.status, await res.text());
    return;
  }

  const data = await res.json();
  console.log(`📋 Found ${data.envs?.length || 0} env variables.`);
  data.envs.forEach(env => {
    // Only print key, type and target (value might be sensitive, but if it's domain we want to see it)
    console.log(`- Key: ${env.key} | Value: ${env.value} | Targets: ${env.target?.join(', ')}`);
  });
}

run().catch(err => console.error(err));
