const fs = require('fs');
const path = require('path');

// Fix the dashboard page
const dashboardPath = path.join(__dirname, 'src/app/(main)/dashboard/page.tsx');
let content = fs.readFileSync(dashboardPath, 'utf8');
content = content.replace(/from ' @/g, "from '@");
fs.writeFileSync(dashboardPath, content);

console.log('Fixed dashboard page imports');
