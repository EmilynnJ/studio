const fs = require('fs');
const path = require('path');

// Replace all client-dashboard pages with a minimal version
const directories = [
  'src/app/(main)/client-dashboard',
  'deploy/src/app/(main)/client-dashboard',
  'deploy_package/src/app/(main)/client-dashboard',
  'direct_deploy/src/app/(main)/client-dashboard'
];

const minimalPage = `'use client';

// Minimal implementation with no imports
export default function ClientDashboard() {
  return <div>Dashboard</div>;
}`;

directories.forEach(dir => {
  const filePath = path.join(__dirname, dir, 'page.tsx');
  if (fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, minimalPage);
    console.log(`Fixed ${filePath}`);
  }
});

console.log('All client-dashboard pages fixed');