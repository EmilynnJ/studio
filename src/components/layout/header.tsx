'use client'; // Made component a client component

import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, Home, Users, ShoppingCart, MessageCircle, Video, Info, HelpCircle, LogIn, UserPlus, UserCircle, LogOut, Settings, ShieldQuestion } from 'lucide-react'; 
import { CelestialIcon } from '@/components/icons/celestial-icon';
import { useAuth } from '@/contexts/auth-context'; 

const navLinks = [
  { href: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { href: '/about', label: 'About', icon: <Info className="h-5 w-5" /> },
  { href: '/readers', label: 'Readers', icon: <Users className="h-5 w-5" /> },
  { href: '/live', label: 'Live', icon: <Video className="h-5 w-5" /> },
  { href: '/shop', label: 'Shop', icon: <ShoppingCart className="h-5 w-5" /> },
  { href: '/community', label: 'Community', icon: <MessageCircle className="h-5 w-5" /> }, // Changed from Users to MessageCircle for Community
  { href: '/messages', label: 'Messages', icon: <MessageCircle className="h-5 w-5" /> },
  { href: '/dashboard', label: 'Dashboard', icon: <Settings className="h-5 w-5" /> }, // Using Settings for Dashboard
  { href: '/help-center', label: 'Help Center', icon: <HelpCircle className="h-5 w-5" /> },
  { href: '/policies', label: 'Policies', icon: <ShieldQuestion className="h-5 w-5" /> },
];

export function Header() {
  const { currentUser, logout, loading } = useAuth(); 
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/'); 
  };

  // Simplified loading state for header, full page loader might be better elsewhere
  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border)/0.6)] bg-[hsl(var(--background)/0.8)] backdrop-blur-md shadow-lg">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
             {/* Using text logo styled with Alex Brush as primary, can be replaced by an Image component if actual logo image is available */}
            <span className="text-4xl font-alex-brush text-[hsl(var(--soulseer-logo-pink))]">
              SoulSeer
            </span>
          </Link>
          <div className="h-8 w-24 animate-pulse rounded bg-muted"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border)/0.6)] bg-[hsl(var(--background)/0.9)] backdrop-blur-md shadow-lg">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          {/* Placeholder for actual logo image, if available */}
          {/* <Image src="/path-to-soulseer-logo.png" alt="SoulSeer Logo" width={40} height={40} /> */}
          <span className="text-4xl font-alex-brush text-[hsl(var(--soulseer-logo-pink))] group-hover:text-[hsl(var(--primary)/0.8)] transition-colors">
            SoulSeer
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Button key={link.href} variant="ghost" asChild className="text-foreground/80 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] px-3">
              <Link href={link.href} className="flex items-center gap-1.5 font-playfair-display text-sm">
                {link.icon}
                {link.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {currentUser ? (
            <>
              <Button variant="ghost" asChild className="text-foreground/80 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                <Link href="/profile" className="flex items-center gap-2 font-playfair-display text-sm">
                  <UserCircle className="h-5 w-5" /> Profile
                </Link>
              </Button>
              <Button onClick={handleLogout} variant="outline" className="border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))] font-playfair-display text-sm">
                <LogOut className="h-5 w-5 mr-1.5" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-foreground/80 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                <Link href="/login" className="font-playfair-display text-sm">Login</Link>
              </Button>
              <Button className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display text-sm" asChild>
                <Link href="/signup">Register</Link> {/* Changed from Sign Up to Register */}
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden"> {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground/80 hover:text-[hsl(var(--primary))]">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-background p-6 flex flex-col">
              <Link href="/" className="mb-6 flex items-center gap-2 self-start">
                <span className="text-3xl font-alex-brush text-[hsl(var(--soulseer-logo-pink))]">SoulSeer</span>
              </Link>
              <nav className="flex flex-col gap-2 flex-grow">
                {navLinks.map((link) => (
                  <SheetClose key={link.href} asChild>
                    <Button variant="ghost" asChild className="justify-start text-md text-foreground/90 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] py-3">
                      <Link href={link.href} className="flex items-center gap-3 font-playfair-display">
                        {React.cloneElement(link.icon, { className: "h-5 w-5" })}
                        {link.label}
                      </Link>
                    </Button>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto pt-6 border-t border-[hsl(var(--border)/0.5)] flex flex-col gap-3">
                {currentUser ? (
                  <>
                    <SheetClose asChild>
                      <Button variant="ghost" asChild className="w-full justify-start text-md text-foreground/90 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] py-3">
                        <Link href="/profile" className="flex items-center gap-3 font-playfair-display"><UserCircle className="h-5 w-5"/> Profile</Link>
                      </Button>
                    </SheetClose>
                    <Button onClick={handleLogout} variant="outline" className="w-full border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] text-md py-3">
                       <LogOut className="h-5 w-5 mr-2"/> Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button variant="ghost" asChild className="w-full justify-start text-md text-foreground/90 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] py-3">
                         <Link href="/login" className="flex items-center gap-3 font-playfair-display"> <LogIn className="h-5 w-5"/> Login</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] text-md py-3" asChild>
                        <Link href="/signup" className="flex items-center gap-3 font-playfair-display"><UserPlus className="h-5 w-5"/> Register</Link>
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
