const fs = require('fs');
const lines = fs.readFileSync('d:\\Billiard_APPS\\frontend\\src\\app\\admin\\dashboard\\page.tsx', 'utf-8').split('\n');
let depth = 0;
let started = false;
let out = [];
for (let i = 780; i <= 1040; i++) {
    const line = lines[i] || '';
    if (line.includes('-- Analytics Tab --')) started = true;
    if (!started) continue;
    
    let opens = (line.match(/<div(?![^>]*\/>)/g) || []).length;
    let closes = (line.match(/<\/div/g) || []).length;
    
    depth += (opens - closes);
    let shortLine = line.trim().substring(0, 40);
    out.push(${i+1}: (1) [+0 -0] );
    if (depth < 0) {
        out.push('DEPTH NEGATIVE HERE!');
        break;
    }
}
fs.writeFileSync('d:\\Billiard_APPS\\check_out.txt', out.join('\n'));
