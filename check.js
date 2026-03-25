const fs = require('fs');
const lines = fs.readFileSync('d:\\Billiard_APPS\\frontend\\src\\app\\admin\\dashboard\\page.tsx', 'utf-8').split('\n');
let depth = 0;
let started = false;
for (let i = 780; i <= 1040; i++) {
    const line = lines[i] || '';
    if (line.includes('── Analytics Tab ──')) started = true;
    if (!started) continue;
    
    let opens = (line.match(/<div(?![^>]*\/>)/g) || []).length;
    let closes = (line.match(/<\/div/g) || []).length;
    
    depth += (opens - closes);
    console.log(`${i+1}: (${depth}) [+${opens} -${closes}] ${line.trim()}`);
    if (depth < 0) {
        console.log('DEPTH NEGATIVE HERE!');
        break;
    }
}
