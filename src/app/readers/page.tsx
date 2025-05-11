import Image from 'next/image';
import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { Button } from '@/components/ui/button';

// Define Reader type based on expected API response
interface Reader {
  id: string;
  name: string;
  photoUrl: string;
  ratePerMinute: number;
  specialties?: string[];
  availability?: string;
  bio?: string;
}

// Fetch readers data from API
async function getReaders(): Promise<Reader[]> {
  try {
    // Use absolute URL in production, relative URL works in development
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const res = await fetch(`${baseUrl}/api/readers`, {
      cache: 'no-store', // Disable caching to always get fresh data
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch readers');
    }
    
    return res.json();
  } catch (error) {
    console.error('Error fetching readers:', error);
    return [];
  }
}

export default async function ReadersPage() {
  const readers = await getReaders();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle>Our Spiritual Readers</PageTitle>
      
      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Connect with our experienced spiritual readers for guidance and insight. 
        Choose a reader below to request a personal session.
      </p>
      
      {readers.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No readers available at the moment</h3>
          <p className="text-muted-foreground">Please check back later for available readers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {readers.map((reader) => (
            <div 
              key={reader.id} 
              className="bg-card rounded-lg shadow-md overflow-hidden border border-[hsl(var(--border)/0.2)] hover:shadow-lg transition-shadow duration-300"
            >
              <div className="relative h-64 w-full">
                <Image
                  src={reader.photoUrl || 'https://via.placeholder.com/300x400?text=No+Image'}
                  alt={reader.name}
                  fill
                  className="object-cover"
                />
              </div>
              
              <div className="p-4">
                <h3 className="text-xl font-playfair-display font-medium mb-2">{reader.name}</h3>
                
                {reader.specialties && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {reader.specialties.slice(0, 3).map((specialty, index) => (
                      <span 
                        key={index} 
                        className="text-xs bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] px-2 py-1 rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    {reader.availability && (
                      <span className="block mb-1">{reader.availability}</span>
                    )}
                    <span className="font-medium text-foreground">
                      ${reader.ratePerMinute.toFixed(2)}/minute
                    </span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)]"
                  asChild
                >
                  <Link href={`/request-session/${reader.id}`}>
                    Request Session
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}