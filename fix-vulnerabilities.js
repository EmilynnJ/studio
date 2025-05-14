const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.overrides = { "tough-cookie": "^4.1.3" };
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
