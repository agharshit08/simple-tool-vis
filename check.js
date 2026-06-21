const fs = require('fs');
const content = fs.readFileSync('src/components/map/HistoricalMapView.tsx', 'utf8');

let depth = 0;
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  depth += opens - closes;
  if (depth < 0) {
    console.log(`Negative depth at line ${i+1}`);
    break;
  }
}
console.log('Final depth:', depth);
