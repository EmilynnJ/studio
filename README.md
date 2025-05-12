# SoulSeer - Psychic Reading Platform

SoulSeer is a premium platform connecting spiritual readers with clients seeking guidance. The app embodies a mystical yet professional atmosphere while providing robust functionality for seamless spiritual consultations.

## Features

- **User Roles**: Client, Reader, and Admin roles with specific dashboards and capabilities
- **WebRTC Integration**: Custom-built WebRTC system for video, audio, and chat sessions
- **Pay-Per-Minute Billing**: Real-time Stripe billing system that charges clients per minute
- **Live Streaming**: Readers can go live and receive gifts from viewers
- **Shop Integration**: Products synced with Stripe for e-commerce functionality

## Tech Stack

- **Frontend**: React (Next.js), TailwindCSS
- **Backend**: Node.js + Express (for signaling server)
- **Database**: PostgreSQL (via Neon)
- **Authentication**: Firebase Authentication
- **Real-time Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Payment Processing**: Stripe Connect
- **WebRTC**: Custom implementation using native WebRTC APIs

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Neon account)
- Firebase project
- Stripe account with Connect enabled

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/soulseer.git
   cd soulseer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase, Stripe, and database credentials

4. Set up the database:
   ```
   npx prisma migrate dev
   ```

5. Run the development server:
   ```
   npm run dev
   ```

6. In a separate terminal, run the signaling server:
   ```
   node server/index.js
   ```

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/components` - Reusable React components
- `/src/contexts` - React context providers
- `/src/lib` - Utility functions and configurations
- `/src/services` - Service classes for WebRTC, Stripe, etc.
- `/prisma` - Database schema and migrations
- `/server` - WebRTC signaling server

## WebRTC Implementation

The platform uses a custom WebRTC implementation with the following components:

- **Signaling Server**: Handles WebRTC signaling using Socket.io
- **WebRTCProvider**: React context for managing WebRTC connections
- **StripeBillingService**: Handles real-time billing during sessions
- **ICE/STUN/TURN**: Configured for NAT traversal and reliable connections

## Role-Specific Dashboards

### Client Dashboard
- View account balance
- Browse available readers
- Request readings
- View past and upcoming sessions
- Add funds to account

### Reader Dashboard
- Toggle online/offline status
- View earnings and session history
- Accept or decline reading requests
- Go live for streaming sessions
- Manage profile and specialties

### Admin Dashboard
- Add new reader accounts
- Sync products with Stripe
- View platform analytics
- Manage users and content

## License

This project is licensed under the MIT License - see the LICENSE file for details.