import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PageTitle } from '@/components/ui/page-title';
import { Star, Users, MessageSquare, Zap } from 'lucide-react';
import { ReaderCard } from '@/components/readers/reader-card'; // Placeholder, create this component

// Placeholder data
const featuredReaders = [
  { id: '1', name: 'Seraphina Moon', specialties: 'Tarot, Astrology', rating: 5, imageUrl: 'https://picsum.photos/seed/reader1/300/300', dataAiHint: 'mystic woman' },
  { id: '2', name: 'Orion Sage', specialties: 'Clairvoyance, Runes', rating: 4.8, imageUrl: 'https://picsum.photos/seed/reader2/300/300', dataAiHint: 'wise man' },
  { id: '3', name: 'Luna Starlight', specialties: 'Mediumship, Dream Analysis', rating: 4.9, imageUrl: 'https://picsum.photos/seed/reader3/300/300', dataAiHint: 'ethereal person' },
];

const testimonials = [
  { id: '1', quote: "SoulSeer connected me with a reader who truly understood my journey. Life-changing!", author: "Alex P.", rating: 5 },
  { id: '2', quote: "The insights I gained were invaluable. I feel more aligned and at peace.", author: "Jamie L.", rating: 5 },
  { id: '3', quote: "A beautiful platform with gifted individuals. Highly recommend!", author: "Casey R.", rating: 5 },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-32 bg-gradient-to-br from-[hsl(var(--primary)/0.2)] to-[hsl(var(--background))] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" data-ai-hint="celestial pattern subtle">
          {/* Placeholder for subtle celestial pattern */}
        </div>
        <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
          <PageTitle>Welcome to SoulSeer</PageTitle>
          <p className="mt-4 max-w-2xl mx-auto text-xl md:text-2xl text-foreground/90 font-playfair-display leading-relaxed">
            Discover clarity, guidance, and connection on your spiritual path.
            Connect with gifted readers and explore a community of like-minded souls.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] shadow-lg transform hover:scale-105 transition-transform duration-300">
              <Link href="/readers">Find a Reader</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))] shadow-lg transform hover:scale-105 transition-transform duration-300">
              <Link href="/community">Join Our Community</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="w-full py-16 md:py-24 bg-[hsl(var(--background))]">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center mb-12">How SoulSeer Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="items-center">
                <Users className="w-12 h-12 mb-4 text-[hsl(var(--primary))]" />
                <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Explore Readers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-foreground/80 font-playfair-display">Browse profiles of gifted spiritual advisors. Find the perfect match for your needs.</p>
              </CardContent>
            </Card>
            <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="items-center">
                <Zap className="w-12 h-12 mb-4 text-[hsl(var(--primary))]" />
                <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Connect Instantly</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-foreground/80 font-playfair-display">Request a session via chat, call, or video. Get insights when you need them most.</p>
              </CardContent>
            </Card>
            <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="items-center">
                <MessageSquare className="w-12 h-12 mb-4 text-[hsl(var(--primary))]" />
                <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Gain Clarity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-foreground/80 font-playfair-display">Receive personalized guidance to navigate life's questions and challenges.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Readers Section */}
      <section className="w-full py-16 md:py-24 bg-[hsl(var(--background)/0.9)]">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center mb-12">Meet Our Readers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredReaders.map((reader) => (
              <ReaderCard key={reader.id} reader={reader} />
            ))}
          </div>
          <div className="text-center mt-12">
            <Button size="lg" asChild className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">
              <Link href="/readers">View All Readers</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full py-16 md:py-24 bg-[hsl(var(--card))]">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center mb-12">Words from Our Community</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="bg-[hsl(var(--background))] border-[hsl(var(--border)/0.7)] shadow-lg flex flex-col">
                <CardContent className="pt-6 flex-grow">
                  <div className="flex mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-[hsl(var(--accent))]" fill="hsl(var(--accent))" />
                    ))}
                  </div>
                  <p className="text-foreground/80 italic font-playfair-display">&quot;{testimonial.quote}&quot;</p>
                </CardContent>
                <CardFooter>
                  <p className="text-sm font-semibold text-foreground font-playfair-display">- {testimonial.author}</p>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
