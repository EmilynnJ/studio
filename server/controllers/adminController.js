// server/controllers/adminController.js
const { admin, auth, firestore } = require('../firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create a new reader account
exports.createReader = async (req, res) => {
  try {
    const { email, password, displayName, bio, specialties, ratePerMinute, photoURL } = req.body;
    
    // Validate required fields
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      photoURL: photoURL || null,
      emailVerified: false,
    });
    
    // Set custom claims for role
    await auth.setCustomUserClaims(userRecord.uid, { role: 'reader' });
    
    // Create user document in Firestore
    await firestore.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name: displayName,
      role: 'reader',
      bio: bio || '',
      specialties: specialties || '',
      ratePerMinute: ratePerMinute || 5,
      photoURL: photoURL || null,
      status: 'offline',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Create user in Prisma database
    await prisma.user.create({
      data: {
        id: userRecord.uid,
        email,
        name: displayName,
        role: 'READER',
        bio: bio || '',
        specialties: specialties || '',
        hourlyRate: ratePerMinute ? ratePerMinute * 60 : 300, // Convert to hourly rate
        image: photoURL || null,
      },
    });
    
    // Create Stripe Connect account for the reader
    const stripeAccount = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        name: displayName,
        product_description: 'Psychic reading services',
      },
    });
    
    // Update user with Stripe account ID
    await firestore.collection('users').doc(userRecord.uid).update({
      stripeAccountId: stripeAccount.id,
    });
    
    await prisma.user.update({
      where: { id: userRecord.uid },
      data: { stripeAccountId: stripeAccount.id },
    });
    
    // Generate onboarding link for the reader
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      refresh_url: `${process.env.FRONTEND_URL}/reader-onboarding?refresh=true`,
      return_url: `${process.env.FRONTEND_URL}/reader-dashboard`,
      type: 'account_onboarding',
    });
    
    res.status(201).json({ 
      uid: userRecord.uid, 
      stripeAccountId: stripeAccount.id,
      onboardingUrl: accountLink.url
    });
  } catch (error) {
    console.error('Error creating reader account:', error);
    res.status(500).json({ error: error.message || 'Failed to create reader account' });
  }
};

// Sync products from Stripe
exports.syncProducts = async (req, res) => {
  try {
    // Fetch all products from Stripe
    const stripeProducts = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });
    
    // Format products for our database
    const formattedProducts = await Promise.all(
      stripeProducts.data.map(async (product) => {
        const price = product.default_price;
        
        // Update or create product in Prisma
        const existingProduct = await prisma.product.findUnique({
          where: { stripeProductId: product.id },
        });
        
        if (existingProduct) {
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: product.name,
              description: product.description || '',
              price: price?.unit_amount || 0,
              image: product.images?.[0] || '',
              active: product.active,
              updatedAt: new Date(),
            },
          });
        } else {
          await prisma.product.create({
            data: {
              stripeProductId: product.id,
              stripePriceId: price?.id,
              name: product.name,
              description: product.description || '',
              price: price?.unit_amount || 0,
              image: product.images?.[0] || '',
              active: product.active,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
        
        // Also update in Firestore for frontend access
        await firestore.collection('products').doc(product.id).set({
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: price?.unit_amount || 0,
          image: product.images?.[0] || '',
          active: product.active,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        
        return {
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: price?.unit_amount || 0,
          image: product.images?.[0] || '',
          active: product.active,
        };
      })
    );
    
    res.status(200).json({ products: formattedProducts });
  } catch (error) {
    console.error('Error syncing products from Stripe:', error);
    res.status(500).json({ error: error.message || 'Failed to sync products' });
  }
};

// Get platform analytics
exports.getAnalytics = async (req, res) => {
  try {
    // Get total users count
    const [clientCount, readerCount, sessionCount, totalRevenue] = await Promise.all([
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.user.count({ where: { role: 'READER' } }),
      prisma.session.count(),
      prisma.session.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'COMPLETED' },
      }),
    ]);
    
    // Get recent sessions
    const recentSessions = await prisma.session.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { name: true, email: true } },
        reader: { select: { name: true, email: true } },
      },
    });
    
    // Get top readers by earnings
    const topReaders = await prisma.session.groupBy({
      by: ['readerId'],
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5,
      where: { status: 'COMPLETED' },
    });
    
    const topReadersWithDetails = await Promise.all(
      topReaders.map(async (item) => {
        const reader = await prisma.user.findUnique({
          where: { id: item.readerId },
          select: { name: true, email: true, image: true },
        });
        
        return {
          id: item.readerId,
          name: reader?.name,
          email: reader?.email,
          image: reader?.image,
          totalEarnings: item._sum.totalAmount,
        };
      })
    );
    
    res.status(200).json({
      userStats: {
        totalClients: clientCount,
        totalReaders: readerCount,
        totalUsers: clientCount + readerCount,
      },
      sessionStats: {
        totalSessions: sessionCount,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      },
      recentSessions,
      topReaders: topReadersWithDetails,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch analytics' });
  }
};