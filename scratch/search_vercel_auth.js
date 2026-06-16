const fs = require('fs');
const path = require('path');
const os = require('os');

function searchDir(dir, searchFile, maxDepth = 4, depth = 0) {
  if (depth > maxDepth) return [];
  let results = [];
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      
      if (stat.isDirectory()) {
        if (file === 'node_modules' || file === '.git' || file === '.next') continue;
        results = results.concat(searchDir(fullPath, searchFile, maxDepth, depth + 1));
      } else if (file === searchFile) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Ignore permissions errors
  }
  return results;
}

const home = os.homedir();
console.log('Searching in home directory:', home);
const foundAuth = searchDir(home, 'auth.json');
console.log('Found auth.json files:', foundAuth);

if (foundAuth.length > 0) {
  foundAuth.forEach(p => {
    try {
      const content = fs.readFileSync(p, 'utf8');
      console.log(`Content of ${p}:`, content);
    } catch (e) {
      console.error(`Error reading ${p}:`, e.message);
    }
  });
}

const foundConfig = searchDir(home, 'config.json');
console.log('Found config.json files:', foundConfig.filter(p => p.toLowerCase().includes('vercel')));
