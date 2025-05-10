import Link from 'next/link';
import { Instagram, Facebook, Youtube, Twitter, Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTitle } from '../ui/page-title'; // For consistent h3 styling if needed

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[hsl(var(--card)/0.5)] border-t border-[hsl(var(--border)/0.4)] py-12 md:py-16 text-muted-foreground backdrop-blur-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 mb-10">
          {/* Column 1: SoulSeer Info */}
          <div>
            <h3 className="mb-4 text-2xl font-alex-brush text-[hsl(var(--soulseer-logo-pink))]">SoulSeer</h3>
            <p className="text-sm font-playfair-display leading-relaxed text-foreground/70">
              Connecting souls through ethereal guidance and authentic psychic readings. Discover your path with us.
            </p>
            <div className="mt-6 flex space-x-4">
              <Link href="#" aria-label="Instagram" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">
                <Instagram className="h-6 w-6" />
              </Link>
              <Link href="#" aria-label="Facebook" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">
                <Facebook className="h-6 w-6" />
              </Link>
              <Link href="#" aria-label="YouTube" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">
                <Youtube className="h-6 w-6" />
              </Link>
              <Link href="#" aria-label="Twitter" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">
                <Twitter className="h-6 w-6" />
              </Link>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="mb-4 text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Explore</h4>
            <ul className="space-y-2 font-playfair-display text-sm">
              <li><Link href="/about" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">About Us</Link></li>
              <li><Link href="/readers" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">Our Readers</Link></li>
              <li><Link href="/live" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">Live Streams</Link></li>
              <li><Link href="/shop" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">Spiritual Shop</Link></li>
              <li><Link href="/community" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">Community Forum</Link></li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h4 className="mb-4 text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Support</h4>
            <ul className="space-y-2 font-playfair-display text-sm">
              <li><Link href="/help-center" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">Help Center</Link></li>
              <li><Link href="/faq" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">FAQs</Link></li>
              <li><Link href="/policies" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">Terms of Service</Link></li>
              <li><Link href="/contact" className="text-foreground/70 hover:text-[hsl(var(--primary))] transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          
          {/* Column 4: Newsletter */}
          <div>
            <h4 className="mb-4 text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Join Our Newsletter</h4>
            <p className="text-sm font-playfair-display text-foreground/70 mb-4">
              Stay updated with the latest spiritual guidance and offers.
            </p>
            <form className="flex gap-2">
              <Input 
                type="email" 
                placeholder="Your email" 
                className="bg-input text-foreground placeholder:text-muted-foreground flex-grow" 
                aria-label="Email for newsletter"
              />
              <Button type="submit" size="icon" className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] shrink-0">
                <Send className="h-5 w-5" />
                <span className="sr-only">Subscribe</span>
              </Button>
            </form>
          </div>
        </div>

        <Separator className="my-8 bg-[hsl(var(--border)/0.3)]" />
        
        <div className="text-center text-sm font-playfair-display text-foreground/60">
          <p>&copy; {currentYear} SoulSeer. All rights reserved. Made with 💜 for spiritual seekers.</p>
          <p className="mt-1">Readings are for entertainment purposes. You must be 18+ to use this service.</p>
        </div>
      </div>
    </footer>
  );
}
