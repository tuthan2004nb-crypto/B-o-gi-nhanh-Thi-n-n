import fs from 'fs';
const data = fs.readFileSync('data/catalog.json', 'utf8');
console.log('Size:', data.length);
