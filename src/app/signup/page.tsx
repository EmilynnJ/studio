
'use client'; // Made component a client component

import Link from 'next/link';
import React, { useState } from 'react'; // Added useState
import { useRouter } from 'next/navigation'; // Added useRouter
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CelestialIcon } from '@/components/icons/celestial-icon';
import { signIn } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'reader' | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!role) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select your role.' });
        return;
    }
    
    setIsLoading(true);
    
    try {
      // Call our custom API route to create the user in Prisma
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create account');
      }
      
      // Sign in the user automatically using NextAuth
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      
      if (signInResult?.error) {
        throw new Error(signInResult.error || 'Failed to sign in');
      }
      
      toast({
        title: 'Account created!',
        description: 'Welcome to SoulSeer. Your journey begins now.',
      });
      
      // Redirect based on role
      router.push(role === 'client' ? '/' : '/dashboard');
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-[hsl(var(--primary)/0.1)] to-[hsl(var(--background))]">
      <Card className="w-full max-w-md bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-2xl">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
            <CelestialIcon className="h-16 w-16 text-[hsl(var(--soulseer-header-pink))]" />
          </div>
          <CardTitle className="text-4xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Join SoulSeer</CardTitle>
          <CardDescription className="font-playfair-display text-muted-foreground">
            Begin your journey of discovery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name-signup" className="font-playfair-display text-foreground/90">Full Name</Label>
              <Input 
                id="name-signup" 
                type="text" 
                placeholder="Your Spirit Name" 
                required 
                className="bg-input text-foreground placeholder:text-muted-foreground"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-signup" className="font-playfair-display text-foreground/90">Email</Label>
              <Input 
                id="email-signup" 
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
              <Label htmlFor="password-signup" className="font-playfair-display text-foreground/90">Password</Label>
              <Input 
                id="password-signup" 
                type="password" 
                placeholder="Create a sacred password (min. 6 characters)" 
                required 
                className="bg-input text-foreground placeholder:text-muted-foreground"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="role-signup" className="font-playfair-display text-foreground/90">I am a...</Label>
              <Select 
                name="role" 
                required 
                onValueChange={(value: 'client' | 'reader') => setRole(value)}
                value={role}
                disabled={isLoading}
              >
                <SelectTrigger id="role-signup" className="w-full bg-input text-foreground">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="client" className="font-playfair-display">Client (Seeking Guidance)</SelectItem>
                  <SelectItem value="reader" className="font-playfair-display">Reader (Offering Guidance)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display text-lg py-3" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <p className="text-sm font-playfair-display text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[hsl(var(--primary))] hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

