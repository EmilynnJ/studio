const fs = require('fs');
const path = require('path');

// Path to the problematic file
const filePath = path.join(__dirname, 'src/app/(main)/client-dashboard/page.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Fix the imports
content = content.replace(/from ' @/g, "from '@");

// Write the fixed content back
fs.writeFileSync(filePath, content);

console.log('Fixed imports in client-dashboard/page.tsx');