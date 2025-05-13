# SoulSeer - Spiritual Reading Platform

SoulSeer is a premium platform connecting spiritual readers with clients seeking guidance. The app embodies a mystical yet professional atmosphere while providing robust functionality for seamless spiritual consultations.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase account
- Stripe account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` and fill in your Firebase and Stripe credentials
   - Make sure to set `ADMIN_EMAIL` and `ADMIN_PASSWORD` for the admin account

### Running the Application

```bash
npm run dev
```

Or to start with admin initialization:

```bash
./scripts/start-with-admin.sh
```

## Admin Setup

To set up the admin account:

1. Make sure `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in your `.env` file
2. Run the admin initialization script:
   ```bash
   node scripts/init-admin.js
   ```
3. Access the admin dashboard at `/admin`

## Features

- User accounts with role-based access (client, reader, admin)
- Real-time WebRTC-based reading sessions (chat, voice, video)
- Pay-per-minute billing system
- Live streaming with virtual gifting
- Marketplace for spiritual products
- Community forums and messaging

## Tech Stack

- Frontend: Next.js, React, TailwindCSS
- Backend: Node.js, Express
- Database: Firebase Firestore
- Authentication: Firebase Auth
- Payments: Stripe
- Real-time Communication: WebRTC

## License

This project is proprietary and confidential.