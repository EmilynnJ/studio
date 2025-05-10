import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Moon, ShoppingCart, Star, Users, Info, HelpCircle, LogIn, UserPlus } from 'lucide-react';
import { CelestialIcon } from '@/components/icons/celestial-icon';

const navLinks = [
  { href: '/', label: 'Home', icon: <Star className="h-5 w-5" /> },
  { href: '/readers', label: 'Readers', icon: <Users className="h-5 w-5" /> },
  { href: '/shop', label: 'Shop', icon: <ShoppingCart className="h-5 w-5" /> },
  { href: '/community', label: 'Community', icon: <Users className="h-5 w-5" /> },
  { href: '/about', label: 'About', icon: <Info className="h-5 w-5" /> },
  { href: '/help-center', label: 'Help Center', icon: <HelpCircle className="h-5 w-5" /> },
];

// Placeholder for auth status
const isAuthenticated = false; 

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border)/0.6)] bg-[hsl(var(--background)/0.8)] backdrop-blur-md shadow-lg">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <CelestialIcon className="h-10 w-10 text-[hsl(var(--soulseer-pink))]" />
          <span className="text-4xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">
            SoulSeer
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <Button key={link.href} variant="ghost" asChild className="text-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
              <Link href={link.href} className="flex items-center gap-2 font-playfair-display text-sm">
                {link.icon}
                {link.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <Button variant="outline" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
              Profile
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                <Link href="/login" className="font-playfair-display text-sm">Login</Link>
              </Button>
              <Button className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display text-sm" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-background p-6">
              <Link href="/" className="mb-8 flex items-center gap-2">
                 <CelestialIcon className="h-8 w-8 text-[hsl(var(--soulseer-pink))]" />
                <span className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">SoulSeer</span>
              </Link>
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Button key={link.href} variant="ghost" asChild className="justify-start text-lg text-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                    <Link href={link.href} className="flex items-center gap-3 font-playfair-display">
                      {link.icon}
                      {link.label}
                    </Link>
                  </Button>
                ))}
              </nav>
              <div className="mt-8 flex flex-col gap-3">
                {isAuthenticated ? (
                   <Button variant="outline" className="w-full border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] text-lg">
                    Profile
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" asChild className="w-full justify-start text-lg text-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                       <Link href="/login" className="flex items-center gap-3 font-playfair-display"> <LogIn className="h-5 w-5"/> Login</Link>
                    </Button>
                    <Button className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] text-lg" asChild>
                      <Link href="/signup" className="flex items-center gap-3 font-playfair-display"><UserPlus className="h-5 w-5"/> Sign Up</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
