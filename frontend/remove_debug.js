const fs = require('fs');
const filePath = 'd:/Billiard_APPS/frontend/src/app/admin/settings/billiard/page.tsx';

let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `<div className="bg-red-50 p-4 mb-4 text-red-500 overflow-auto max-h-40">
    DEBUG: {categories.length} categories loaded. 
    <pre>{JSON.stringify(categories, null, 2)}</pre>
</div>
`;
const targetStrCRLF = targetStr.replace(/\n/g, '\r\n');

if (content.includes(targetStr)) {
    content = content.replace(targetStr, "");
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Removed Debug (LF)");
} else if (content.includes(targetStrCRLF)) {
    content = content.replace(targetStrCRLF, "");
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Removed Debug (CRLF)");
} else {
    console.log("Debug string not found");
}
