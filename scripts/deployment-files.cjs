const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const paths = ['index.html', 'games.html', 'careers.html', 'privacy-policy.html', '404.html', 'style.css', 'design.css', 'refinements.css', 'script.js', 'client.js', 'theme.js', 'effects.js', 'package.json', 'vercel.json', 'api/games.js', 'api/game-icons.js', 'api/game-thumbnails.js', 'lib/roblox.js'];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(file);
    else if (entry.name !== 'desktop.ini') paths.push(file);
  }
}
walk('assets');
const files = paths.map(file => {
  const data = fs.readFileSync(path.join(root, file));
  return { file, sha: crypto.createHash('sha1').update(data).digest('hex'), size: data.length };
});
if (process.argv[2] === 'chunk') {
  const data = fs.readFileSync(path.join(root, process.argv[3]));
  const offset = Number(process.argv[4]);
  process.stdout.write(data.subarray(offset, offset + 24000).toString('base64'));
} else process.stdout.write(JSON.stringify(files));
