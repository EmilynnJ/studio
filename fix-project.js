const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Fix all import statements in the entire project
function fixImportsInDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      fixImportsInDirectory(fullPath);
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      // Fix imports with spaces
      if (content.includes("from ' @")) {
        content = content.replace(/from ' @/g, "from '@");
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed imports in ${fullPath}`);
      }
    }
  }
}

// Fix all imports in the project
fixImportsInDirectory(path.join(__dirname, 'src'));

// Create next.config.js that properly handles module resolution
const nextConfig = `/** @type {import('next').NextConfig} */
module.exports = {
  typescript: {
    // Don't ignore TypeScript errors
    ignoreBuildErrors: false,
  },
  eslint: {
    // Don't ignore ESLint errors
    ignoreDuringBuilds: false,
  },
  webpack: (config) => {
    // Improve module resolution
    config.resolve.fallback = { fs: false, path: false };
    return config;
  }
};`;

fs.writeFileSync(path.join(__dirname, 'next.config.js'), nextConfig);
console.log('Created proper next.config.js');

console.log('Project fixed for production build');
