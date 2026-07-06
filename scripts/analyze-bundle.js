const fs = require('fs');
const path = require('path');

const distDir = process.argv[2] || 'dist/_expo/static/js/web';

const files = fs.readdirSync(distDir);
const mapFile = files.find(f => f.endsWith('.map'));
const jsFile = files.find(f => f.endsWith('.js') && !f.endsWith('.map'));

if (!mapFile || !jsFile) {
  console.error('No bundle or sourcemap found in', distDir);
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(path.join(distDir, mapFile), 'utf8'));
const bundle = fs.readFileSync(path.join(distDir, jsFile), 'utf8');
const sources = map.sources;
const sourceContent = map.sourcesContent || [];

const fileSizes = {};
let totalMapped = 0;

for (let i = 0; i < sources.length; i++) {
  const content = sourceContent[i];
  if (!content) continue;
  const size = Buffer.byteLength(content, 'utf8');
  let name = sources[i];
  if (name.startsWith('../')) {
    name = name.replace(/^(\.\.[\/])+/, '');
  } else if (name.startsWith('./')) {
    name = name.slice(2);
  }
  const parts = name.split(/[\\/]/);
  let pkg;
  if (name.includes('node_modules')) {
    const after = name.slice(name.indexOf('node_modules') + 'node_modules'.length + 1);
    const pkgParts = after.split(/[\\/]/);
    pkg = pkgParts[0].startsWith('@') ? pkgParts[0] + '/' + pkgParts[1] : pkgParts[0];
  } else if (parts[0] === 'src') {
    pkg = './src';
  } else if (name.startsWith('/')) {
    pkg = '(root)';
  } else {
    pkg = parts[0];
  }
  fileSizes[pkg] = (fileSizes[pkg] || 0) + size;
  totalMapped += size;
}

const bundleSize = Buffer.byteLength(bundle, 'utf8');
console.log('Bundle: ' + jsFile);
console.log('Bundle size: ' + (bundleSize / 1024 / 1024).toFixed(2) + ' MB');
console.log('Mapped source: ' + (totalMapped / 1024 / 1024).toFixed(2) + ' MB');
console.log('');
console.log('Top packages:');
Object.entries(fileSizes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([name, size]) => {
    const pct = ((size / totalMapped) * 100).toFixed(1);
    const sizeStr = (size / 1024).toFixed(0) + ' KB';
    console.log('  ' + sizeStr.padStart(8) + ' (' + pct.padStart(4) + '%)  ' + name);
  });
