const fs = require('fs');
let code = fs.readFileSync('d:\\Billiard_APPS\\frontend\\src\\app\\admin\\dashboard\\page.tsx', 'utf-8');

code = code.replace(/<div(?:[^>"']|"[^"]*"|'[^']*')*\/>/g, '<!-- SELF_CLOSING_DIV -->');
const lines = code.split('\n');

let stack = [];
let out = [];

let inReturn = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || '';
    if (line.includes('return (') && !inReturn) {
        inReturn = true;
    }
    if (!inReturn) continue;

    const regex = /<div(?=[\s>])|<\/div>/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
        if (match[0].startsWith('<div')) {
            stack.push({ line: i + 1, text: line.trim() });
        } else if (match[0] === '</div') {
            if (stack.length === 0) {
                out.push(`FATAL: PREMATURE ROOT CLOSURE AT LINE ${i + 1}`);
            } else {
                let popped = stack.pop();
                out.push(`Line ${i + 1} closed opening tag from Line ${popped.line}`);
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
    out.push('PERFECT BALANCE GLOBALLY');
}

fs.writeFileSync('d:\\Billiard_APPS\\full_trace.txt', out.join('\n'));
