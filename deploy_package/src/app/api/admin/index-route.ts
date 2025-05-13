import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'SoulSeer Admin API',
    endpoints: [
      '/api/admin/initialize - Create initial admin account',
      '/api/admin/set-admin - Set admin role for existing user',
      '/api/admin/create-reader - Create a new reader account',
      '/api/admin/sync-products - Sync products with Stripe'
    ]
  });
}