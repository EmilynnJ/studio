
'use client'; 

import Link from 'next/link';
import Image from 'next/image'; 
import React from 'react'; 
import { useRouter, usePathname } from 'next/navigation'; 
import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, Home, Users, ShoppingCart, MessageSquare, Video, Info, HelpCircle, LogIn, UserPlus, UserCircle as UserIcon, LogOut, Settings, ShieldQuestion, Briefcase } from 'lucide-react'; 
import { useAuth } from '@/contexts/auth-context'; 
import { cn } from '@/lib/utils';

const navLinksBase = [
  { href: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { href: '/about', label: 'About', icon: <Info className="h-5 w-5" /> },
  { href: '/readers', label: 'Readers', icon: <Users className="h-5 w-5" /> },
  { href: '/live', label: 'Live', icon: <Video className="h-5 w-5" /> },
  { href: '/shop', label: 'Shop', icon: <ShoppingCart className="h-5 w-5" /> },
  { href: '/community', label: 'Community', icon: <MessageSquare className="h-5 w-5" /> }, 
];

const userNavLinks = [
  { href: '/messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" />, authRequired: true },
  { href: '/dashboard', label: 'Dashboard', icon: <Briefcase className="h-5 w-5" />, authRequired: true },
];

const helpNavLinks = [
  { href: '/help-center', label: 'Help Center', icon: <HelpCircle className="h-5 w-5" /> },
  { href: '/policies', label: 'Policies', icon: <ShieldQuestion className="h-5 w-5" /> },
];

export function Header() {
  const { currentUser, logout, loading } = useAuth(); 
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push('/'); 
  };
  
  const allNavLinks = [
    ...navLinksBase,
    ...(currentUser ? userNavLinks : []),
    ...helpNavLinks,
  ];


  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border)/0.6)] bg-[hsl(var(--background)/0.8)] backdrop-blur-md shadow-lg">
        <div className="container mx-auto flex h-16 sm:h-20 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="https://i.postimg.cc/CKMpFTrj/Soul-Seer-Psychic-Readings-Spiritual-Shop-Community-20250310-060210-0000.png" 
              alt="SoulSeer Logo" 
              width={140} 
              height={35} 
              className="object-contain h-auto w-auto max-h-[35px] sm:max-h-[45px]" 
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
      <div className="container mx-auto flex h-16 sm:h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <h1 className="font-alex-brush text-[26px] sm:text-[32px] md:text-[36px] text-peachPink text-halo-white select-none cursor-pointer">
            SoulSeer
          </h1>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:gap-1 md:flex">
          {navLinksBase.map((link) => (
            <Button 
              key={link.href} 
              variant={pathname === link.href ? "secondary" : "ghost"} 
              asChild 
              className={cn(
                "text-foreground/80 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] px-2 lg:px-3 py-1.5 text-xs lg:text-sm",
                pathname === link.href && "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]"
              )}
            >
              <Link href={link.href} className="flex items-center gap-1.5 font-playfair-display">
                {React.cloneElement(link.icon, { className: "h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" })}
                {link.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-1 sm:gap-2 md:flex">
          {currentUser ? (
            <>
              <Button 
                variant={pathname === "/profile" ? "secondary" : "ghost"}
                asChild 
                className={cn(
                    "text-foreground/80 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] px-2 lg:px-3 py-1.5 text-xs lg:text-sm",
                     pathname === "/profile" && "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]"
                )}
              >
                <Link href="/profile" className="flex items-center gap-1.5 font-playfair-display">
                  <UserIcon className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" /> Profile
                </Link>
              </Button>
              <Button onClick={handleLogout} variant="outline" className="border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))] font-playfair-display px-2 lg:px-3 py-1.5 text-xs lg:text-sm">
                <LogOut className="h-4 w-4 lg:h-5 lg:w-5 mr-1 lg:mr-1.5 flex-shrink-0" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-foreground/80 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] px-2 lg:px-3 py-1.5 text-xs lg:text-sm">
                <Link href="/login" className="font-playfair-display">Login</Link>
              </Button>
              <Button className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display px-2 lg:px-3 py-1.5 text-xs lg:text-sm" asChild>
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
            <SheetContent side="right" className="w-[280px] bg-background p-4 sm:p-6 flex flex-col">
              <Link href="/" className="mb-4 sm:mb-6 flex items-center gap-2 self-start">
                 <Image 
                    src="https://i.postimg.cc/CKMpFTrj/Soul-Seer-Psychic-Readings-Spiritual-Shop-Community-20250310-060210-0000.png" 
                    alt="SoulSeer Logo" 
                    width={140} 
                    height={35}
                    className="object-contain h-auto w-auto max-h-[35px]"
                    data-ai-hint="logo brand"
                  />
              </Link>
              <nav className="flex flex-col gap-1.5 flex-grow overflow-y-auto">
                {allNavLinks.map((link) => {
                   if (link.authRequired && !currentUser) return null;
                   return (
                    <SheetClose key={link.href} asChild>
                      <Link 
                        href={link.href} 
                        className={cn(
                          buttonVariants({ variant: pathname === link.href ? "secondary" : "ghost" }), 
                          "justify-start text-sm sm:text-md text-foreground/90 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] py-2.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 font-playfair-display",
                          pathname === link.href && "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]"
                        )}
                      >
                        {React.cloneElement(link.icon, { className: "h-5 w-5 flex-shrink-0" })}
                        {link.label}
                      </Link>
                    </SheetClose>
                   );
                })}
              </nav>
              <div className="mt-auto pt-4 sm:pt-6 border-t border-[hsl(var(--border)/0.5)] flex flex-col gap-2.5 sm:gap-3">
                {currentUser ? (
                  <>
                    <SheetClose asChild>
                       <Link 
                        href="/profile" 
                        className={cn(
                          buttonVariants({variant: pathname === "/profile" ? "secondary" : "ghost"}), 
                          "w-full justify-start text-sm sm:text-md text-foreground/90 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] py-2.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 font-playfair-display",
                          pathname === "/profile" && "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]"
                        )}
                      >
                        <UserIcon className="h-5 w-5 flex-shrink-0"/> Profile
                      </Link>
                    </SheetClose>
                    <Button onClick={handleLogout} variant="outline" className="w-full border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] text-sm sm:text-md py-2.5 sm:py-3 flex items-center justify-center gap-2">
                       <LogOut className="h-5 w-5 flex-shrink-0 mr-1 sm:mr-2"/> Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link 
                        href="/login" 
                        className={cn(
                          buttonVariants({variant: 'ghost'}),
                          "w-full justify-start text-sm sm:text-md text-foreground/90 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] py-2.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 font-playfair-display"
                        )}
                      >
                         <LogIn className="h-5 w-5 flex-shrink-0"/> Login
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                       <Link 
                        href="/signup"
                        className={cn(
                          buttonVariants({variant: 'default'}), 
                          "w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] text-sm sm:text-md py-2.5 sm:py-3 flex items-center justify-center gap-2.5 sm:gap-3 font-playfair-display"
                         )}
                       >
                        <UserPlus className="h-5 w-5 flex-shrink-0"/> Register
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

