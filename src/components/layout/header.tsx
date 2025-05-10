'use client'; // Made component a client component

import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Added useRouter
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'; // Added SheetClose
import { Menu, Moon, ShoppingCart, Star, Users, Info, HelpCircle, LogIn, UserPlus, UserCircle, LogOut } from 'lucide-react'; // Added UserCircle, LogOut
import { CelestialIcon } from '@/components/icons/celestial-icon';
import { useAuth } from '@/contexts/auth-context'; // Added useAuth

const navLinks = [
  { href: '/', label: 'Home', icon: <Star className="h-5 w-5" /> },
  { href: '/readers', label: 'Readers', icon: <Users className="h-5 w-5" /> },
  { href: '/shop', label: 'Shop', icon: <ShoppingCart className="h-5 w-5" /> },
  { href: '/community', label: 'Community', icon: <Users className="h-5 w-5" /> },
  { href: '/about', label: 'About', icon: <Info className="h-5 w-5" /> },
  { href: '/help-center', label: 'Help Center', icon: <HelpCircle className="h-5 w-5" /> },
];

export function Header() {
  const { currentUser, logout, loading } = useAuth(); // Use useAuth hook
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/'); // Redirect to home after logout
  };

  if (loading) {
    // Optional: render a loading state or a minimal header
    return (
      <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border)/0.6)] bg-[hsl(var(--background)/0.8)] backdrop-blur-md shadow-lg">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <CelestialIcon className="h-10 w-10 text-[hsl(var(--soulseer-pink))]" />
            <span className="text-4xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">
              SoulSeer
            </span>
          </Link>
          {/* Placeholder for loading state */}
          <div className="h-8 w-24 animate-pulse rounded bg-muted"></div>
        </div>
      </header>
    );
  }

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
          {currentUser ? (
            <>
              <Button variant="ghost" asChild className="text-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                <Link href="/profile" className="flex items-center gap-2 font-playfair-display text-sm">
                  <UserCircle className="h-5 w-5" /> Profile
                </Link>
              </Button>
              <Button onClick={handleLogout} variant="outline" className="border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))] font-playfair-display text-sm">
                <LogOut className="h-5 w-5 mr-2" /> Logout
              </Button>
            </>
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
                  <SheetClose key={link.href} asChild>
                    <Button variant="ghost" asChild className="justify-start text-lg text-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                      <Link href={link.href} className="flex items-center gap-3 font-playfair-display">
                        {link.icon}
                        {link.label}
                      </Link>
                    </Button>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-8 flex flex-col gap-3">
                {currentUser ? (
                  <>
                    <SheetClose asChild>
                      <Button variant="ghost" asChild className="w-full justify-start text-lg text-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                        <Link href="/profile" className="flex items-center gap-3 font-playfair-display"><UserCircle className="h-5 w-5"/> Profile</Link>
                      </Button>
                    </SheetClose>
                    <Button onClick={handleLogout} variant="outline" className="w-full border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] text-lg">
                       <LogOut className="h-5 w-5 mr-2"/> Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button variant="ghost" asChild className="w-full justify-start text-lg text-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                         <Link href="/login" className="flex items-center gap-3 font-playfair-display"> <LogIn className="h-5 w-5"/> Login</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] text-lg" asChild>
                        <Link href="/signup" className="flex items-center gap-3 font-playfair-display"><UserPlus className="h-5 w-5"/> Sign Up</Link>
                      </Button>
                    </SheetClose>
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
