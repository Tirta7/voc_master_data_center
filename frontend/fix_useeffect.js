const fs = require('fs');
const filePath = 'd:/Billiard_APPS/frontend/src/app/admin/settings/billiard/page.tsx';

let content = fs.readFileSync(filePath, 'utf-8');

// The exact string in the file (normalized to avoid \r\n issues)
const target = "    useEffect(() => {\n        fetchPackages();\n        fetchGlobalSettings();\n    }, []);";
const targetCRLF = "    useEffect(() => {\r\n        fetchPackages();\r\n        fetchGlobalSettings();\r\n    }, []);";

const replacement = "    useEffect(() => {\n        fetchPackages();\n        fetchGlobalSettings();\n        fetchCategories();\n    }, []);";

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Fixed LF");
} else if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, replacement);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Fixed CRLF");
} else {
    console.log("Not found. Trying regex...");
    content = content.replace(/fetchGlobalSettings\(\);\s*\}, \[\]\);/g, "fetchGlobalSettings();\n        fetchCategories();\n    }, []);");
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Fixed with Regex");
}
