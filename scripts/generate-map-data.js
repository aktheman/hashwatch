const mod = require('world-map-country-shapes');
const countries = mod.default || mod;
const fs = require('fs');

const groups = {
  NA: ['ca','us','mx','gt','bz','sv','hn','ni','cr','pa','cu','jm','ht','do','bs'],
  SA: ['co','ve','gy','sr','ec','pe','br','bo','py','uy','ar','cl'],
  EU: ['gb','ie','fr','be','nl','lu','de','ch','li','at','cz','sk','pl','dk','no','se','fi','ee','lv','lt','by','ua','md','ro','hu','si','hr','ba','rs','me','al','mk','bg','gr','it','pt','es','ad','is'],
  AF: ['ma','dz','tn','ly','eg','sd','ss','er','dj','et','so','ke','ug','rw','bi','tz','mw','zm','za','bw','na','ao','cd','cg','ga','gq','cm','cf','td','ne','ng','bj','tg','bf','gh','ci','lr','sl','gn','gw','sn','gm','ml','mr','mg','sz','ls','eh'],
  AS: ['ru','kz','uz','tm','kg','tj','af','pk','in','np','bt','bd','mm','la','th','kh','vn','my','sg','id','ph','cn','mn','kp','kr','jp','lk','bn','tl','ir','iq','sa','ye','om','ae','sy','jo','il','lb','kw','bh','qa','tr','ge','am','az','cy','mn','np'],
  OC: ['au','nz','pg'],
};

const result = {};
for (const [key, codes] of Object.entries(groups)) {
  const path = countries
    .filter(c => codes.includes(c.id.toLowerCase()))
    .map(c => c.shape)
    .join(' ');
  result[key] = path;
}

const totalBytes = Object.values(result).reduce((s, p) => s + p.length, 0);
console.log(`Total path data: ${(totalBytes / 1024).toFixed(1)}KB`);

// Generate TypeScript data file
let out = '// Generated from world-map-country-shapes\n';
out += '// Robinson projection, original viewBox 0 0 2000 1001\n';
out += `// Combined paths from ${Object.values(groups).reduce((s, g) => s + g.length, 0)} countries\n`;
out += '// Actual bounds: X ~ -305..1977, Y ~ -357..1151\n';
out += '// Apply transform="scale(0.05, 0.05)" and viewBox="-17 -20 120 80"\n\n';

for (const [key, path] of Object.entries(result)) {
  const sizeKb = (path.length / 1024).toFixed(1);
  out += `// ${sizeKb}KB\n`;
  out += `export const ${key} = ' ${path}';\n\n`;
}

out += 'export const WORLD_PATH = [\n';
out += Object.keys(result).map((k) => `  ${k}`).join(',\n');
out += '\n].join("");\n';

const dir = `${__dirname}/../src/data`;
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(`${dir}/worldMap.ts`, out);
console.log(`Written: ${(out.length / 1024).toFixed(1)}KB to src/data/worldMap.ts`);
