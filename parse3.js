const fs = require('fs');
const lines = fs.readFileSync('d:\\Billiard_APPS\\frontend\\src\\app\\admin\\dashboard\\page.tsx', 'utf-8').split('\n');

let stack = [];
let started = false;
let out = [];

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
                out.push(`REDUNDANT </div FOUND AT LINE ${i + 1}`);
                break;
            } else {
                let popped = stack.pop();
                if (i >= 1020) {
                    out.push(`Line ${i + 1} closed opening tag from Line ${popped.line}: ${popped.text.substring(0, 50)}`);
                }
            }
        }
    }
}
fs.writeFileSync('d:\\Billiard_APPS\\check_out.txt', out.join('\n'));
