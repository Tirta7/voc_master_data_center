const fs = require('fs');
const lines = fs.readFileSync('d:\\Billiard_APPS\\frontend\\src\\app\\admin\\dashboard\\page.tsx', 'utf-8').split('\n');

let stack = [];
let started = false;

for (let i = 780; i <= 1045; i++) {
    const line = lines[i] || '';
    if (line.includes('── Analytics Tab ──')) started = true;
    if (line.includes('── Overview Tab ──')) break;
    
    if (!started) continue;

    const regex = /<div(?![^>]*\/>)|<\/div/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
        if (match[0].startsWith('<div')) {
            stack.push({ line: i + 1, text: line.trim() });
        } else if (match[0] === '</div') {
            if (stack.length === 0) {
                console.log(`REDUNDANT </div FOUND AT LINE ${i + 1}`);
                console.log(line);
                process.exit(1);
            } else {
                stack.pop();
            }
        }
    }
}

if (stack.length > 0) {
    console.log(`UNCLOSED <div TAGS REMAINING: ${stack.length}`);
    stack.forEach(item => {
        console.log(`Line ${item.line}: ${item.text}`);
    });
} else {
    console.log('PERFECT BALANCE IN ANALYTICS TAB');
}
