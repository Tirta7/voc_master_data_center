const fs = require('fs');
let code = fs.readFileSync('d:\\Billiard_APPS\\frontend\\src\\app\\admin\\dashboard\\page.tsx', 'utf-8');

// Replace all self-closing divs (even multi-line ones) with a safe placeholder
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

    // Now we can safely count <div and </div because all <div ... /> are removed!
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
                let popped = stack.pop();
                if (i >= 1010) {
                    out.push(`Line ${i + 1} closed opening tag from Line ${popped.line}`);
                }
            }
        }
    }
    if (stack.length === 0 && started && i > 800) {
       out.push(`ANALYTICS TAB COMPLETELY CLOSED AT LINE ${i+1}`);
    }
}
fs.writeFileSync('d:\\Billiard_APPS\\check_out2.txt', out.join('\n'));
