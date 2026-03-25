const fs = require('fs');
let code = fs.readFileSync('d:\\Billiard_APPS\\frontend\\src\\app\\admin\\dashboard\\page.tsx', 'utf-8');

// Replace all self-closing divs with a safe placeholder
code = code.replace(/<div(?:[^>"']|"[^"]*"|'[^']*')*\/>/g, '<!-- SELF_CLOSING_DIV -->');

const lines = code.split('\n');

let stack = [];
let started = false;
let out = [];

for (let i = 780; i <= 1045; i++) {
    const line = lines[i] || '';
    if (line.includes('── Analytics Tab ──')) started = true;
    if (line.includes('── Overview Tab ──')) break;
    
    if (!started) continue;

    const regex = /<div(?=[\s>])|<\/div>/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
        if (match[0].startsWith('<div')) {
            stack.push({ line: i + 1, text: line.trim() });
        } else if (match[0] === '</div') {
            if (stack.length === 0) {
                out.push(`REDUNDANT </div FOUND AT LINE ${i + 1}`);
                break;
            } else {
                stack.pop();
            }
        }
    }
}

if (stack.length > 0) {
    out.push(`UNCLOSED <div TAGS REMAINING: ${stack.length}`);
    stack.forEach(item => {
        out.push(`Line ${item.line}: ${item.text.substring(0, 100)}`);
    });
} else {
    out.push('PERFECT BALANCE IN ANALYTICS TAB');
}

fs.writeFileSync('d:\\Billiard_APPS\\check_out3.txt', out.join('\n'));
