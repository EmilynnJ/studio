
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Video, ShoppingBag, MessageSquare, Star, TvIcon } from 'lucide-react'; // Added TvIcon for Live Streams
import { ReaderCard } from '@/components/readers/reader-card';
import { ProductCard, type Product } from '@/components/shop/product-card';

// Placeholder data - in a real app, this would come from a backend/CMS
const featuredReaders = [
  { id: '1', name: 'Mysteria Moon', specialties: 'Tarot, Crystal Ball', rating: 4.9, imageUrl: 'https://picsum.photos/seed/mysteria/400/300', status: 'online' as const, shortBio: 'Guiding souls through the veil with ancient wisdom and intuitive insights.', dataAiHint: 'mystic woman oracle', sessionType: 'video' as const},
  { id: '2', name: 'Orion Stargazer', specialties: 'Astrology, Numerology', rating: 4.8, imageUrl: 'https://picsum.photos/seed/orion/400/300', status: 'offline' as const, shortBio: 'Unveiling cosmic blueprints and life path numbers for clarity and direction.', dataAiHint: 'celestial wizard', sessionType: 'chat' as const },
];

const featuredProducts: Product[] = [
  { id: 'prod1', name: 'Enchanted Tarot Deck', description: 'Unlock ancient secrets with this beautifully illustrated tarot deck.', price: 35.00, imageUrl: 'https://picsum.photos/seed/tarotdeck/400/300', category: 'Divination Tools', dataAiHint: 'tarot cards' },
  { id: 'prod2', name: 'Celestial Amulet', description: 'A powerful amulet infused with cosmic energies for protection and guidance.', price: 75.00, imageUrl: 'https://picsum.photos/seed/amulet/400/300', category: 'Spiritual Jewelry', dataAiHint: 'magic amulet' },
  { id: 'prod3', name: 'Sacred Sage Bundle', description: 'Cleanse your space and spirit with this hand-tied sacred sage bundle.', price: 18.50, imageUrl: 'https://picsum.photos/seed/sagesmudge/400/300', category: 'Cleansing', dataAiHint: 'sage bundle' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center text-foreground">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-20 relative text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] drop-shadow-lg mb-4 sm:mb-6">
          SoulSeer
        </h1>
        <div className="flex justify-center mb-4 sm:mb-6">
          <Image 
            src="https://i.postimg.cc/L8cmRbKD/HERO-IMAGE.jpg" 
            alt="SoulSeer Hero Image - A mystical woman with flowing hair and celestial elements" 
            width={200} 
            height={200}
            className="rounded-full shadow-2xl border-2 border-[hsl(var(--soulseer-gold)/0.5)] object-cover w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] md:w-[250px] md:h-[250px]"
            data-ai-hint="mystical woman celestial"
            priority
          />
        </div>
        <p className="mt-2 sm:mt-3 max-w-lg sm:max-w-xl mx-auto text-lg sm:text-xl soulseer-tagline px-4">
          A Community of Gifted Psychics
        </p>
      </section>

      {/* Main Content Tabs */}
      <section className="w-full container mx-auto px-4 md:px-6 py-8">
        <Tabs defaultValue="readers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-0 bg-transparent border-b-2 border-[hsl(var(--border)/0.3)] rounded-none p-0 mb-8 overflow-x-auto sm:overflow-x-visible">
            <TabsTrigger value="readers" className="soulseer-tabs-trigger text-base sm:text-lg font-playfair-display font-semibold text-foreground/70 hover:text-[hsl(var(--soulseer-gold))] data-[state=active]:text-[hsl(var(--soulseer-gold))] data-[state=active]:border-b-2 data-[state=active]:border-[hsl(var(--soulseer-gold))] data-[state=active]:bg-transparent rounded-none whitespace-nowrap px-3 py-2.5 sm:px-4">Readers</TabsTrigger>
            <TabsTrigger value="live" className="soulseer-tabs-trigger text-base sm:text-lg font-playfair-display font-semibold text-foreground/70 hover:text-[hsl(var(--soulseer-gold))] data-[state=active]:text-[hsl(var(--soulseer-gold))] data-[state=active]:border-b-2 data-[state=active]:border-[hsl(var(--soulseer-gold))] data-[state=active]:bg-transparent rounded-none whitespace-nowrap px-3 py-2.5 sm:px-4">Live Streams</TabsTrigger>
            <TabsTrigger value="shop" className="soulseer-tabs-trigger text-base sm:text-lg font-playfair-display font-semibold text-foreground/70 hover:text-[hsl(var(--soulseer-gold))] data-[state=active]:text-[hsl(var(--soulseer-gold))] data-[state=active]:border-b-2 data-[state=active]:border-[hsl(var(--soulseer-gold))] data-[state=active]:bg-transparent rounded-none whitespace-nowrap px-3 py-2.5 sm:px-4">Shop</TabsTrigger>
            <TabsTrigger value="community" className="soulseer-tabs-trigger text-base sm:text-lg font-playfair-display font-semibold text-foreground/70 hover:text-[hsl(var(--soulseer-gold))] data-[state=active]:text-[hsl(var(--soulseer-gold))] data-[state=active]:border-b-2 data-[state=active]:border-[hsl(var(--soulseer-gold))] data-[state=active]:bg-transparent rounded-none whitespace-nowrap px-3 py-2.5 sm:px-4">Community</TabsTrigger>
          </TabsList>

          <TabsContent value="readers" className="py-6">
            <div className="text-center p-6 sm:p-8 border border-[hsl(var(--border)/0.5)] rounded-lg bg-[hsl(var(--card)/0.8)] shadow-xl">
              <Users className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-[hsl(var(--primary))] mb-4" />
              <h3 className="text-xl sm:text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">Connect with a Reader</h3>
              <p className="text-foreground/80 font-playfair-display mb-6 text-sm sm:text-base">
                No readers are online at the moment. Check back later or browse all our talented psychics.
              </p>
              <Button size="lg" asChild className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] shadow-md text-sm sm:text-base">
                <Link href="/readers">View All Readers</Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="live" className="py-6">
             <div className="text-center p-6 sm:p-8 border border-[hsl(var(--border)/0.5)] rounded-lg bg-[hsl(var(--card)/0.8)] shadow-xl">
              <TvIcon className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-[hsl(var(--primary))] mb-4" />
              <h3 className="text-xl sm:text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">Join a Live Stream</h3>
              <p className="text-foreground/80 font-playfair-display mb-6 text-sm sm:text-base">
                No live streams are active at the moment. Check back later or browse scheduled events.
              </p>
              <Button size="lg" asChild className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] shadow-md text-sm sm:text-base">
                <Link href="/live">See Upcoming Streams</Link>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="shop" className="py-6">
            <div className="text-center p-6 sm:p-8 border border-[hsl(var(--border)/0.5)] rounded-lg bg-[hsl(var(--card)/0.8)] shadow-xl">
              <ShoppingBag className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-[hsl(var(--primary))] mb-4" />
              <h3 className="text-xl sm:text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">Explore Our Treasures</h3>
              <p className="text-foreground/80 font-playfair-display mb-6 text-sm sm:text-base">
                Discover tools and talismans to aid your spiritual journey.
              </p>
              <Button size="lg" asChild className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] shadow-md text-sm sm:text-base">
                <Link href="/shop">Visit the Shop</Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="community" className="py-6">
            <div className="text-center p-6 sm:p-8 border border-[hsl(var(--border)/0.5)] rounded-lg bg-[hsl(var(--card)/0.8)] shadow-xl">
              <MessageSquare className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-[hsl(var(--primary))] mb-4" />
              <h3 className="text-xl sm:text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">Join the Conversation</h3>
              <p className="text-foreground/80 font-playfair-display mb-6 text-sm sm:text-base">
                Share experiences, ask questions, and connect with like-minded souls in our community forum.
              </p>
              <Button size="lg" asChild className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] shadow-md text-sm sm:text-base">
                <Link href="/community">Enter Community Forum</Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Online Readers Section */}
      {featuredReaders.filter(r => r.status === 'online').length > 0 && (
        <section className="w-full py-12 md:py-16 bg-[hsl(var(--background)/0.5)]">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="soulseer-section-title text-center md:text-left text-[hsl(var(--soulseer-header-pink))]">Online Readers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {featuredReaders.filter(r => r.status === 'online').slice(0,3).map((reader) => (
                <ReaderCard key={reader.id} reader={reader} />
              ))}
            </div>
            <div className="text-center mt-10 md:mt-12">
              <Button size="lg" asChild className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] text-sm sm:text-base">
                <Link href="/readers">View All Readers</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      <section className="w-full py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="soulseer-section-title text-[hsl(var(--soulseer-header-pink))]">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="text-center mt-10 md:mt-12">
            <Button size="lg" variant="outline" asChild className="border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))] shadow-md text-sm sm:text-base">
              <Link href="/shop">Explore All Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full py-12 md:py-16 bg-[hsl(var(--card)/0.7)]">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center mb-10 md:mb-12">Whispers of Wisdom</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { id: 't1', quote: "An enlightening experience that brought so much clarity. Truly gifted!", author: "Seraphina V.", rating: 5 },
              { id: 't2', quote: "SoulSeer helped me find guidance during a difficult time. Forever grateful.", author: "Elias R.", rating: 5 },
              { id: 't3', quote: "The connection was profound, and the insights resonated deeply. Highly recommend!", author: "Lyra B.", rating: 5 },
            ].map((testimonial) => (
              <Card key={testimonial.id} className="bg-[hsl(var(--background))] border-[hsl(var(--border)/0.7)] shadow-lg flex flex-col p-6">
                <CardContent className="pt-0 flex-grow">
                  <div className="flex mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-[hsl(var(--soulseer-gold))]" fill="hsl(var(--soulseer-gold))" />
                    ))}
                  </div>
                  <p className="text-foreground/80 italic font-playfair-display text-base sm:text-lg">&quot;{testimonial.quote}&quot;</p>
                </CardContent>
                <CardFooter className="pt-4 pb-0">
                  <p className="text-sm sm:text-md font-semibold text-foreground font-playfair-display">- {testimonial.author}</p>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

