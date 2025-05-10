'use client'; // Made component a client component

import Link from 'next/link';
import React, { useState } from 'react'; // Added useState
import { useRouter } from 'next/navigation'; // Added useRouter
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CelestialIcon } from '@/components/icons/celestial-icon';
import { useAuth } from '@/contexts/auth-context'; // Added useAuth
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);
    if (success) {
      router.push('/'); // Redirect to homepage on successful login
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-[hsl(var(--primary)/0.1)] to-[hsl(var(--background))]">
      <Card className="w-full max-w-md bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CelestialIcon className="h-16 w-16 text-[hsl(var(--soulseer-pink))]" />
          </div>
          <CardTitle className="text-4xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Login to SoulSeer</CardTitle>
          <CardDescription className="font-playfair-display text-muted-foreground">
            Access your spiritual journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email-login" className="font-playfair-display text-foreground/90">Email</Label>
              <Input 
                id="email-login" 
                type="email" 
                placeholder="mystic@example.com" 
                required 
                className="bg-input text-foreground placeholder:text-muted-foreground"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-login" className="font-playfair-display text-foreground/90">Password</Label>
              <Input 
                id="password-login" 
                type="password" 
                placeholder="Your sacred password" 
                required 
                className="bg-input text-foreground placeholder:text-muted-foreground"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display text-lg py-3" disabled={isLoading}>
              {isLoading ? 'Entering...' : 'Enter the Portal'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <Link href="#" className="text-sm font-playfair-display text-[hsl(var(--primary))] hover:underline">
            Forgot your password?
          </Link>
          <p className="text-sm font-playfair-display text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[hsl(var(--primary))] hover:underline">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
