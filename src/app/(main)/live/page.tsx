import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, CalendarDays, Tv } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Placeholder data for live streams
const upcomingStreams = [
  { id: 'ls1', title: 'Full Moon Tarot Reading', reader: 'Mysteria Moon', date: '2024-08-15T19:00:00Z', description: 'Join Mysteria for a special live tarot session under the full moon. Ask your questions live!', imageUrl: 'https://picsum.photos/seed/fullmoontarot/600/350', dataAiHint: 'moon tarot' },
  { id: 'ls2', title: 'Astrology Forecast Q&A', reader: 'Orion Stargazer', date: '2024-08-22T18:00:00Z', description: 'Discover what the stars have in store for the upcoming month and get your astrology questions answered by Orion.', imageUrl: 'https://picsum.photos/seed/astrologyforecast/600/350', dataAiHint: 'astrology chart' },
];

const pastStreams = [
 { id: 'ls3', title: 'Spirit Guide Connection Meditation', reader: 'Seraphina Light', date: '2024-07-20T20:00:00Z', description: 'A guided meditation to help you connect with your spirit guides. Replay available.', imageUrl: 'https://picsum.photos/seed/spiritguide/600/350', dataAiHint: 'meditation aura' },
];


export default function LiveStreamsPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>SoulSeer Live Streams</PageTitle>
      <p className="text-center text-lg text-foreground/80 font-playfair-display max-w-2xl mx-auto mb-12">
        Experience real-time guidance, interactive Q&A sessions, and group readings with our gifted psychics. Connect, learn, and be enlightened.
      </p>

      {/* Current/Upcoming Live Streams Section */}
      <section className="mb-16">
        <h2 className="text-3xl md:text-4xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center mb-10">Upcoming Streams</h2>
        {upcomingStreams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {upcomingStreams.map((stream) => (
              <Card key={stream.id} className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
                <CardHeader className="p-0">
                  <Image src={stream.imageUrl} alt={stream.title} width={600} height={350} className="object-cover w-full h-56" data-ai-hint={stream.dataAiHint}/>
                </CardHeader>
                <CardContent className="p-6">
                  <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-2">{stream.title}</CardTitle>
                  <CardDescription className="font-playfair-display text-foreground/70 mb-1">With: {stream.reader}</CardDescription>
                  <div className="flex items-center text-sm text-muted-foreground font-playfair-display mb-3">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {new Date(stream.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                     {' at '}
                    {new Date(stream.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <p className="text-foreground/80 font-playfair-display mb-4 line-clamp-3">{stream.description}</p>
                  <Button className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">
                    <Video className="mr-2 h-5 w-5" /> Set Reminder {/* Or Join Now if live */}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-[hsl(var(--border)/0.5)] rounded-lg bg-[hsl(var(--card)/0.5)]">
            <Tv className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl font-playfair-display text-foreground/70">No upcoming live streams scheduled at the moment.</p>
            <p className="text-muted-foreground font-playfair-display mt-2">Please check back soon for new events!</p>
          </div>
        )}
      </section>

      {/* Past Live Streams Section */}
      <section>
        <h2 className="text-3xl md:text-4xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center mb-10">Past Streams & Replays</h2>
         {pastStreams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastStreams.map((stream) => (
              <Card key={stream.id} className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="p-0">
                   <Image src={stream.imageUrl} alt={stream.title} width={400} height={225} className="object-cover w-full h-48 rounded-t-lg" data-ai-hint={stream.dataAiHint} />
                </CardHeader>
                <CardContent className="p-4">
                  <h3 className="text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-1 truncate">{stream.title}</h3>
                  <p className="text-sm text-muted-foreground font-playfair-display mb-2">By: {stream.reader}</p>
                  <p className="text-xs text-muted-foreground font-playfair-display mb-3">
                    Originally Aired: {new Date(stream.date).toLocaleDateString()}
                  </p>
                  <Button variant="outline" className="w-full border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                    Watch Replay
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
           <div className="text-center py-10 border border-dashed border-[hsl(var(--border)/0.5)] rounded-lg bg-[hsl(var(--card)/0.5)]">
            <p className="text-xl font-playfair-display text-foreground/70">No past streams available yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
