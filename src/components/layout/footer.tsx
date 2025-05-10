import Link from 'next/link';
import { DiscordIcon } from '@/components/icons/discord-icon';
import { PatreonIcon } from '@/components/icons/patreon-icon';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[hsl(var(--background)/0.8)] border-t border-[hsl(var(--border)/0.6)] py-12 text-muted-foreground backdrop-blur-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <h3 className="mb-4 text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">SoulSeer</h3>
            <p className="text-sm font-playfair-display">
              Navigating the spiritual realm, together.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-lg font-semibold font-playfair-display text-foreground">Quick Links</h4>
            <ul className="space-y-2 font-playfair-display text-sm">
              <li><Link href="/about" className="hover:text-[hsl(var(--primary))] transition-colors">About Us</Link></li>
              <li><Link href="/readers" className="hover:text-[hsl(var(--primary))] transition-colors">Our Readers</Link></li>
              <li><Link href="/shop" className="hover:text-[hsl(var(--primary))] transition-colors">Spiritual Shop</Link></li>
              <li><Link href="/community" className="hover:text-[hsl(var(--primary))] transition-colors">Community Forum</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-lg font-semibold font-playfair-display text-foreground">Support</h4>
            <ul className="space-y-2 font-playfair-display text-sm">
              <li><Link href="/help-center" className="hover:text-[hsl(var(--primary))] transition-colors">Help Center</Link></li>
              <li><Link href="/faq" className="hover:text-[hsl(var(--primary))] transition-colors">FAQs</Link></li>
              <li><Link href="/policies" className="hover:text-[hsl(var(--primary))] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-[hsl(var(--primary))] transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-lg font-semibold font-playfair-display text-foreground">Connect</h4>
            <div className="flex space-x-4">
              <Link href="#" aria-label="Discord" className="hover:text-[hsl(var(--primary))] transition-colors">
                <DiscordIcon className="h-6 w-6" />
              </Link>
              <Link href="#" aria-label="Patreon" className="hover:text-[hsl(var(--primary))] transition-colors">
                <PatreonIcon className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
        <Separator className="my-8 bg-[hsl(var(--border)/0.4)]" />
        <div className="text-center text-sm font-playfair-display">
          <p>&copy; {currentYear} SoulSeer. All rights reserved.</p>
          <p className="mt-1">Designed with mystical intentions.</p>
        </div>
      </div>
    </footer>
  );
}
