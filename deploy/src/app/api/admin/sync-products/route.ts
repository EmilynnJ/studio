import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15',
});

export async function POST(request: Request) {
  try {
    // Check if the current user is an admin (you might want to implement this)
    // This is a simplified version - in production, you'd verify the admin status
    
    // Fetch all products from Stripe
    const stripeProducts = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });
    
    // Format products for our database
    const formattedProducts = await Promise.all(
      stripeProducts.data.map(async (product) => {
        const price = product.default_price as Stripe.Price;
        
        return {
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: price?.unit_amount || 0,
          image: product.images?.[0] || '',
          active: product.active,
          metadata: product.metadata,
        };
      })
    );
    
    return NextResponse.json({ products: formattedProducts });
    
  } catch (error: any) {
    console.error('Error syncing products from Stripe:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync products' }, { status: 500 });
  }
}