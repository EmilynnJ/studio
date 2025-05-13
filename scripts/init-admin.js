// Initialize admin account script
const https = require('https');
const http = require('http');

async function makeRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    
    const reqOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = lib.request(url, reqOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function initializeAdmin() {
  try {
    console.log('Initializing admin account...');
    
    const response = await makeRequest('http://localhost:3001/api/admin/initialize', {
      method: 'POST'
    });
    
    if (response.ok) {
      console.log('✅ Admin account initialized successfully!');
      console.log('UID:', response.data.uid);
    } else {
      console.error('❌ Failed to initialize admin account:', response.data.error || response.data.message);
      
      if (response.data.message && response.data.message.includes('already exists')) {
        console.log('Attempting to set admin role for existing account...');
        
        const setAdminResponse = await makeRequest('http://localhost:3001/api/admin/set-admin', {
          method: 'POST'
        });
        
        if (setAdminResponse.ok) {
          console.log('✅ Admin role set successfully!');
          console.log('UID:', setAdminResponse.data.uid);
        } else {
          console.error('❌ Failed to set admin role:', setAdminResponse.data.error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

initializeAdmin();