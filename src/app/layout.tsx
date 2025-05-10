import type {Metadata} from 'next';
import { Alex_Brush, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Assuming Toaster is already set up

const alexBrush = Alex_Brush({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-alex-brush',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-playfair-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SoulSeer - Find Your Path',
  description: 'Connect with gifted readers for spiritual guidance and insight.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${alexBrush.variable} ${playfairDisplay.variable} font-playfair-display antialiased app-background`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
