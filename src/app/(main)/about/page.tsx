import Image from 'next/image';
import { PageTitle } from '@/components/ui/page-title';
import { Separator } from '@/components/ui/separator';
import { Users, Compass, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>About SoulSeer</PageTitle>
      
      <div className="max-w-3xl mx-auto text-center mb-12">
        <p className="text-xl md:text-2xl text-foreground/90 font-playfair-display leading-relaxed">
          SoulSeer is a sacred space dedicated to fostering spiritual growth, connection, and enlightenment. We believe that everyone deserves access to guidance that illuminates their path and empowers their journey.
        </p>
      </div>

      <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden shadow-2xl mb-16 border-2 border-[hsl(var(--soulseer-gold)/0.5)]">
        <Image
          src="https://picsum.photos/seed/aboutpage/1200/600"
          alt="Mystical gathering representing community and connection"
          layout="fill"
          objectFit="cover"
          className="opacity-80"
          data-ai-hint="mystical gathering"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background)/0.7)] to-transparent"></div>
        <div className="absolute bottom-8 left-8">
          <h2 className="text-3xl md:text-4xl font-alex-brush text-white drop-shadow-md">Connect. Explore. Evolve.</h2>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
        <div>
          <h3 className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-6">Our Mission</h3>
          <p className="text-lg text-foreground/80 font-playfair-display leading-loose mb-4">
            Our mission is to provide a trusted and accessible platform where individuals can connect with gifted spiritual readers from around the world. We aim to demystify spiritual practices and make profound wisdom available to all who seek it, fostering a supportive community for exploration and personal development.
          </p>
          <p className="text-lg text-foreground/80 font-playfair-display leading-loose">
            At SoulSeer, we champion authenticity, integrity, and compassion. Each reader is carefully vetted to ensure they align with our core values, offering genuine insight and heartfelt support.
          </p>
        </div>
        <div className="flex justify-center">
           <Image
            src="https://picsum.photos/seed/mission/400/400"
            alt="Symbol of spiritual mission, e.g., a glowing crystal or intricate mandala"
            width={400}
            height={400}
            className="rounded-full shadow-2xl border-2 border-[hsl(var(--soulseer-gold)/0.5)]"
            data-ai-hint="glowing crystal"
          />
        </div>
      </div>
      
      <Separator className="my-16 bg-[hsl(var(--border)/0.5)]" />

      <h3 className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center mb-12">What We Offer</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="p-6 bg-[hsl(var(--card))] rounded-lg shadow-lg border border-[hsl(var(--border)/0.7)]">
          <Compass className="mx-auto h-12 w-12 text-[hsl(var(--primary))] mb-4" />
          <h4 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-2">Diverse Readings</h4>
          <p className="text-foreground/80 font-playfair-display">
            Access a wide range of spiritual services including tarot, astrology, clairvoyance, mediumship, and more.
          </p>
        </div>
        <div className="p-6 bg-[hsl(var(--card))] rounded-lg shadow-lg border border-[hsl(var(--border)/0.7)]">
          <Users className="mx-auto h-12 w-12 text-[hsl(var(--primary))] mb-4" />
          <h4 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-2">Supportive Community</h4>
          <p className="text-foreground/80 font-playfair-display">
            Join our forums to share experiences, ask questions, and connect with a vibrant community of seekers and guides.
          </p>
        </div>
        <div className="p-6 bg-[hsl(var(--card))] rounded-lg shadow-lg border border-[hsl(var(--border)/0.7)]">
          <Sparkles className="mx-auto h-12 w-12 text-[hsl(var(--primary))] mb-4" />
          <h4 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-2">Spiritual Shop</h4>
          <p className="text-foreground/80 font-playfair-display">
            Explore curated spiritual items, tools, and resources to support your practice and well-being.
          </p>
        </div>
      </div>

      <div className="mt-20 text-center">
        <p className="text-xl text-foreground/90 font-playfair-display">
          Embark on your journey with SoulSeer, and let us illuminate the way.
        </p>
      </div>
    </div>
  );
}
