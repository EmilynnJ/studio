import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageCircle, Video, Zap } from 'lucide-react';

export interface Reader {
  id: string;
  name: string;
  specialties: string; // Comma-separated or array
  rating: number;
  imageUrl: string;
  status?: 'online' | 'offline' | 'busy';
  shortBio?: string;
  dataAiHint?: string;
}

interface ReaderCardProps {
  reader: Reader;
}

export function ReaderCard({ reader }: ReaderCardProps) {
  const specialtiesArray = typeof reader.specialties === 'string' ? reader.specialties.split(',').map(s => s.trim()) : reader.specialties;

  return (
    <Card className="flex flex-col overflow-hidden bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-lg hover:shadow-xl transition-shadow duration-300 h-full group">
      <CardHeader className="p-0 relative">
        <Image
          src={reader.imageUrl}
          alt={reader.name}
          width={400}
          height={300}
          className="object-cover w-full h-56 md:h-64 opacity-90 group-hover:opacity-100 transition-opacity duration-300"
          data-ai-hint={reader.dataAiHint || 'spiritual reader'}
        />
        {reader.status === 'online' && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold font-playfair-display flex items-center gap-1 shadow-md">
            <Zap className="w-3 h-3" /> Online
          </div>
        )}
        {reader.status === 'busy' && (
          <div className="absolute top-3 right-3 bg-yellow-500 text-background px-3 py-1 rounded-full text-xs font-semibold font-playfair-display shadow-md">
            Busy
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <CardTitle className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-1">{reader.name}</CardTitle>
        <div className="flex items-center mb-3">
          {[...Array(Math.floor(reader.rating))].map((_, i) => (
            <Star key={`full-${i}`} className="h-5 w-5 text-[hsl(var(--soulseer-gold))]" fill="hsl(var(--soulseer-gold))" />
          ))}
          {reader.rating % 1 !== 0 && (
             <Star key="half" className="h-5 w-5 text-[hsl(var(--soulseer-gold))]" fill="url(#halfGradient)" />
             // SVG gradient for half star if needed, or use a library icon
          )}
          {[...Array(5 - Math.ceil(reader.rating))].map((_, i) => (
            <Star key={`empty-${i}`} className="h-5 w-5 text-[hsl(var(--soulseer-gold))]" />
          ))}
          <span className="ml-2 text-sm text-muted-foreground font-playfair-display">({reader.rating.toFixed(1)})</span>
        </div>
        <div className="mb-3 space-x-1">
          {specialtiesArray.slice(0,3).map((spec, idx) => (
            <span key={idx} className="inline-block bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))] px-2 py-0.5 rounded-full text-xs font-playfair-display">
              {spec}
            </span>
          ))}
        </div>
        {reader.shortBio && <CardDescription className="text-sm text-foreground/80 font-playfair-display line-clamp-3 mb-2">{reader.shortBio}</CardDescription>}
      </CardContent>
      <CardFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-2">
        <Button asChild variant="outline" className="w-full sm:w-auto flex-grow border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] font-playfair-display">
          <Link href={`/readers/${reader.id}`}>View Profile</Link>
        </Button>
        <Button className="w-full sm:w-auto flex-grow bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display">
          Request Session
        </Button>
      </CardFooter>
       {/* SVG definitions for gradients if used */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="halfGradient">
            <stop offset="50%" stopColor="hsl(var(--soulseer-gold))" />
            <stop offset="50%" stopColor="hsl(var(--border))" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
    </Card>
  );
}
