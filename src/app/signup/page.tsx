import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageTitle } from '@/components/ui/page-title';
import { CelestialIcon } from '@/components/icons/celestial-icon';

export default function SignupPage() {
  // Placeholder for form submission logic
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Implement Appwrite signup logic
    console.log('Signup form submitted');
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-[hsl(var(--primary)/0.1)] to-[hsl(var(--background))]">
      <Card className="w-full max-w-md bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-2xl">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
            <CelestialIcon className="h-16 w-16 text-[hsl(var(--soulseer-pink))]" />
          </div>
          <CardTitle className="text-4xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Join SoulSeer</CardTitle>
          <CardDescription className="font-playfair-display text-muted-foreground">
            Begin your journey of discovery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-playfair-display text-foreground/90">Full Name</Label>
              <Input id="name" type="text" placeholder="Your Spirit Name" required className="bg-input text-foreground placeholder:text-muted-foreground"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-playfair-display text-foreground/90">Email</Label>
              <Input id="email" type="email" placeholder="mystic@example.com" required className="bg-input text-foreground placeholder:text-muted-foreground"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-playfair-display text-foreground/90">Password</Label>
              <Input id="password" type="password" placeholder="Create a sacred password" required className="bg-input text-foreground placeholder:text-muted-foreground"/>
            </div>
             <div className="space-y-2">
              <Label htmlFor="role" className="font-playfair-display text-foreground/90">I am a...</Label>
              <Select name="role" required>
                <SelectTrigger className="w-full bg-input text-foreground">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="client" className="font-playfair-display">Client (Seeking Guidance)</SelectItem>
                  <SelectItem value="reader" className="font-playfair-display">Reader (Offering Guidance)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display text-lg py-3">
              Create Account
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
