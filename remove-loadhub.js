const fs = require('fs');
const path = 'app/page.tsx';
let s = fs.readFileSync(path, 'utf8');
const start = '      <section id= load-hub className=load-management-hub>';
const end = '\n      {profitLeakOpen && (';
const first = s.indexOf(start);
const second = s.indexOf(start, first + 1);
if (second === -1) { throw new Error('Second load-hub not found'); }
const endIdx = s.indexOf(end, second);
if (endIdx === -1) { throw new Error('End marker not found'); }
s = s.slice(0, second) + s.slice(endIdx);
fs.writeFileSync(path, s);
