'use client'; 

import Link from 'next/link';
import Image from 'next/image'; 
import React from 'react'; 
import { useRouter } from 'next/navigation'; 
import { Button, buttonVariants } from '@/components/ui/button'; // Imported buttonVariants
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, Home, Users, ShoppingCart, MessageCircle, Video, Info, HelpCircle, LogIn, UserPlus, UserCircle as UserIcon, LogOut, Settings, ShieldQuestion } from 'lucide-react'; 
import { useAuth } from '@/contexts/auth-context'; 
import { cn } from '@/lib/utils'; // Imported cn for combining classNames

const navLinks = [
  { href: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { href: '/about', label: 'About', icon: <Info className="h-5 w-5" /> },
  { href: '/readers', label: 'Readers', icon: <Users className="h-5 w-5" /> },
  { href: '/live', label: 'Live', icon: <Video className="h-5 w-5" /> },
  { href: '/shop', label: 'Shop', icon: <ShoppingCart className="h-5 w-5" /> },
  { href: '/community', label: 'Community', icon: <MessageCircle className="h-5 w-5" /> }, 
  { href: '/messages', label: 'Messages', icon: <MessageCircle className="h-5 w-5" /> },
  { href: '/dashboard', label: 'Dashboard', icon: <Settings className="h-5 w-5" /> }, 
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

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border)/0.6)] bg-[hsl(var(--background)/0.8)] backdrop-blur-md shadow-lg">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="https://i.postimg.cc/CKMpFTrj/Soul-Seer-Psychic-Readings-Spiritual-Shop-Community-20250310-060210-0000.png" 
              alt="SoulSeer Logo" 
              width={160} 
              height={40} 
              className="object-contain" 
              priority
              data-ai-hint="logo brand"
            />
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
          <Image 
            src="https://i.postimg.cc/CKMpFTrj/Soul-Seer-Psychic-Readings-Spiritual-Shop-Community-20250310-060210-0000.png" 
            alt="SoulSeer Logo" 
            width={180} 
            height={45} 
            className="object-contain h-auto group-hover:opacity-90 transition-opacity" 
            priority
            data-ai-hint="logo brand"
          />
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
                  <UserIcon className="h-5 w-5" /> Profile
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
                <Link href="/signup">Register</Link> 
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden"> 
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground/80 hover:text-[hsl(var(--primary))]">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-background p-6 flex flex-col">
              <Link href="/" className="mb-6 flex items-center gap-2 self-start">
                 <Image 
                    src="https://i.postimg.cc/CKMpFTrj/Soul-Seer-Psychic-Readings-Spiritual-Shop-Community-20250310-060210-0000.png" 
                    alt="SoulSeer Logo" 
                    width={140} 
                    height={35}
                    className="object-contain h-auto"
                    data-ai-hint="logo brand"
                  />
              </Link>
              <nav className="flex flex-col gap-2 flex-grow">
                {navLinks.map((link) => (
                  <SheetClose key={link.href} asChild>
                    <Link 
                      href={link.href} 
                      className={cn(
                        buttonVariants({ variant: 'ghost' }), 
                        "justify-start text-md text-foreground/90 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] py-3 flex items-center gap-3 font-playfair-display"
                      )}
                    >
                      {React.cloneElement(link.icon, { className: "h-5 w-5" })}
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto pt-6 border-t border-[hsl(var(--border)/0.5)] flex flex-col gap-3">
                {currentUser ? (
                  <>
                    <SheetClose asChild>
                       <Link 
                        href="/profile" 
                        className={cn(
                          buttonVariants({variant: 'ghost'}), 
                          "w-full justify-start text-md text-foreground/90 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] py-3 flex items-center gap-3 font-playfair-display"
                        )}
                      >
                        <UserIcon className="h-5 w-5"/> Profile
                      </Link>
                    </SheetClose>
                    <Button onClick={handleLogout} variant="outline" className="w-full border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] text-md py-3">
                       <LogOut className="h-5 w-5 mr-2"/> Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link 
                        href="/login" 
                        className={cn(
                          buttonVariants({variant: 'ghost'}),
                          "w-full justify-start text-md text-foreground/90 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] py-3 flex items-center gap-3 font-playfair-display"
                        )}
                      >
                         <LogIn className="h-5 w-5"/> Login
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                       <Link 
                        href="/signup"
                        className={cn(
                          buttonVariants({variant: 'default'}), 
                          "w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] text-md py-3 flex items-center justify-center gap-3 font-playfair-display" // Added justify-center for button-like appearance
                         )}
                       >
                        <UserPlus className="h-5 w-5"/> Register
                      </Link>
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
