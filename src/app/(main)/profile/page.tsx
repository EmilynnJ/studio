'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mail, User, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { currentUser, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  if (loading || !currentUser) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <PageTitle>My Profile</PageTitle>
        <Card className="max-w-2xl mx-auto bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-full" />
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-full" />
            </div>
            <Skeleton className="h-10 w-full mt-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>My Profile</PageTitle>
      <Card className="max-w-2xl mx-auto bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl">
        <CardHeader className="items-center text-center">
          <Avatar className="w-24 h-24 mb-4 border-2 border-[hsl(var(--primary))]">
            <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.name || 'User'} />
            <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
              {getInitials(currentUser.name)}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">{currentUser.name || 'Esteemed Seeker'}</CardTitle>
          <CardDescription className="font-playfair-display text-muted-foreground capitalize">{currentUser.role || 'Member'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <div className="flex items-center space-x-4 text-lg font-playfair-display text-foreground/90">
            <Mail className="h-6 w-6 text-[hsl(var(--primary))]" />
            <span>{currentUser.email}</span>
          </div>
          
          <div className="flex items-center space-x-4 text-lg font-playfair-display text-foreground/90">
            <User className="h-6 w-6 text-[hsl(var(--primary))]" />
            <span>UID: {currentUser.uid}</span>
          </div>

          {currentUser.role && (
            <div className="flex items-center space-x-4 text-lg font-playfair-display text-foreground/90">
              <ShieldCheck className="h-6 w-6 text-[hsl(var(--primary))]" />
              <span className="capitalize">Role: {currentUser.role}</span>
            </div>
          )}
          
          {currentUser.createdAt && (
             <p className="text-sm text-muted-foreground font-playfair-display text-center mt-4">
                Joined on: {new Date(currentUser.createdAt.seconds * 1000).toLocaleDateString()}
             </p>
          )}

          <Button 
            onClick={handleLogout} 
            variant="destructive" 
            className="w-full mt-6 font-playfair-display text-lg"
          >
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
