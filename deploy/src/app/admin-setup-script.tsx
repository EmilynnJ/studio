'use client';

import { useEffect } from 'react';

export default function AdminSetupScript() {
  useEffect(() => {
    const setupAdmin = async () => {
      try {
        // Get admin credentials
        const adminEmail = 'emilynn992@gmail.com';
        const adminPassword = 'JayJas1423!';
        
        // Create a simple Firebase app for admin setup
        const { initializeApp } = await import('firebase/app');
        const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
        const { getFirestore, doc, setDoc } = await import('firebase/firestore');
        
        // Firebase configuration
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };
        
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        
        try {
          // Try to create a new admin user
          const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
          const user = userCredential.user;
          
          // Create admin document
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: adminEmail,
            name: 'Admin User',
            role: 'admin',
            createdAt: new Date(),
          });
          
          console.log('Admin account created successfully');
          alert('Admin account created successfully!');
          window.location.href = '/admin';
        } catch (createError: any) {
          // If email already exists, try to sign in and update role
          if (createError.code === 'auth/email-already-in-use') {
            try {
              const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
              const user = userCredential.user;
              
              // Update or create admin document
              await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: adminEmail,
                name: 'Admin User',
                role: 'admin',
                updatedAt: new Date(),
              }, { merge: true });
              
              console.log('Admin role updated successfully');
              alert('Admin role updated successfully!');
              window.location.href = '/admin';
            } catch (signInError: any) {
              console.error('Failed to sign in with admin credentials:', signInError);
              alert(`Failed to sign in with admin credentials: ${signInError.message}`);
            }
          } else {
            console.error('Failed to create admin account:', createError);
            alert(`Failed to create admin account: ${createError.message}`);
          }
        }
      } catch (error: any) {
        console.error('Error setting up admin:', error);
        alert(`Error setting up admin: ${error.message}`);
      }
    };
    
    setupAdmin();
  }, []);
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Setting Up Admin Account</h1>
        <p className="mb-4">Please wait while we set up your admin account...</p>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}