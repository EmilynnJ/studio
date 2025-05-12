// server/firebase-admin.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
let serviceAccount;

// Try to get service account from environment variable
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    // First try to parse as JSON string
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (e) {
    try {
      // If that fails, try to decode from base64
      serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
    } catch (e2) {
      console.error('Error parsing Firebase service account from environment variable:', e2);
      throw new Error('Invalid Firebase service account configuration');
    }
  }
} else {
  // Fall back to file for local development
  const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
  } else {
    throw new Error('Firebase service account not found. Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable or provide firebase-service-account.json file.');
  }
}

// Initialize the app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://soulseer-2c4ed-default-rtdb.firebaseio.com"
});

// Export the admin SDK for use in other server files
module.exports = {
  admin,
  auth: admin.auth(),
  firestore: admin.firestore(),
  database: admin.database(),
  storage: admin.storage()
};