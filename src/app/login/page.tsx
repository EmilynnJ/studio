import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageTitle } from '@/components/ui/page-title';
import { CelestialIcon } from '@/components/icons/celestial-icon';

export default function LoginPage() {
  // Placeholder for form submission logic
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Implement Appwrite login logic
    console.log('Login form submitted');
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
              <Label htmlFor="email" className="font-playfair-display text-foreground/90">Email</Label>
              <Input id="email" type="email" placeholder="mystic@example.com" required className="bg-input text-foreground placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-playfair-display text-foreground/90">Password</Label>
              <Input id="password" type="password" placeholder="Your sacred password" required className="bg-input text-foreground placeholder:text-muted-foreground"/>
            </div>
            <Button type="submit" className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display text-lg py-3">
              Enter the Portal
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
