
'use client'; 

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Zap, Video, Mic, MessageSquare, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid'; 

export interface Reader {
  id: string; 
  name: string;
  specialties: string | string[]; 
  rating: number;
  imageUrl: string;
  status?: 'online' | 'offline' | 'busy';
  shortBio?: string;
  ratePerMinute?: number; // Added rate per minute
  dataAiHint?: string;
  email?: string; 
  role?: 'reader'; 
}

interface ReaderCardProps {
  reader: Reader;
}

export function ReaderCard({ reader }: ReaderCardProps) {
  const specialtiesArray = typeof reader.specialties === 'string' 
    ? reader.specialties.split(',').map(s => s.trim()) 
    : Array.isArray(reader.specialties) ? reader.specialties.map(s => s.trim()) : [];

  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleRequestSession = async (sessionType: 'video' | 'audio' | 'chat') => {
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Login Required', description: 'Please log in to request a session.' });
      router.push('/login');
      return;
    }
    if (currentUser.uid === reader.id) {
      toast({ variant: 'destructive', title: 'Invalid Action', description: 'You cannot request a session with yourself.' });
      return;
    }
    if (reader.status !== 'online') {
      toast({ variant: 'destructive', title: 'Reader Offline', description: 'This reader is currently not available for new sessions.' });
      return;
    }

    const sessionId = uuidv4();
    try {
      const sessionDocRef = doc(db, 'videoSessions', sessionId);
      await setDoc(sessionDocRef, {
        sessionId,
        readerUid: reader.id,
        readerName: reader.name,
        readerPhotoURL: reader.imageUrl, 
        readerRatePerMinute: reader.ratePerMinute, // Store reader's rate
        clientUid: currentUser.uid,
        clientName: currentUser.name || 'Client',
        clientPhotoURL: currentUser.photoURL || null, 
        status: 'pending', 
        requestedAt: serverTimestamp(),
        sessionType: sessionType, 
      });
      
      toast({ title: 'Session Requested', description: `Waiting for ${reader.name} to accept your ${sessionType} session...` });
      router.push(`/session/${sessionId}`);
    } catch (error) {
      console.error("Error requesting session:", error);
      toast({ variant: 'destructive', title: 'Session Request Failed', description: 'Could not initiate the session. Please try again.' });
    }
  };

  const getStatusIndicator = () => {
    switch (reader.status) {
      case 'online':
        return (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold font-playfair-display flex items-center gap-1 shadow-md">
            <Zap className="w-3 h-3" /> Online
          </div>
        );
      case 'busy':
        return (
          <div className="absolute top-3 right-3 bg-yellow-500 text-background px-3 py-1 rounded-full text-xs font-semibold font-playfair-display shadow-md flex items-center gap-1">
            <Clock className="w-3 h-3" /> Busy
          </div>
        );
      case 'offline':
         return (
          <div className="absolute top-3 right-3 bg-slate-500 text-white px-3 py-1 rounded-full text-xs font-semibold font-playfair-display shadow-md">
            Offline
          </div>
        );
      default:
        return null;
    }
  };
  
  const canRequestSession = reader.status === 'online' && currentUser && currentUser.uid !== reader.id;

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
        {getStatusIndicator()}
      </CardHeader>
      <CardContent className="p-4 sm:p-6 flex-grow">
        <CardTitle className="text-2xl sm:text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-1">{reader.name}</CardTitle>
        <div className="flex items-center mb-3">
          {[...Array(Math.floor(reader.rating))].map((_, i) => (
            <Star key={`full-${i}`} className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(var(--soulseer-gold))]" fill="hsl(var(--soulseer-gold))" />
          ))}
          {reader.rating % 1 !== 0 && (
             <Star key="half" className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(var(--soulseer-gold))]" fill="url(#halfGradientReaderCard)" />
          )}
          {[...Array(5 - Math.ceil(reader.rating))].map((_, i) => (
            <Star key={`empty-${i}`} className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(var(--soulseer-gold))]" />
          ))}
          <span className="ml-2 text-xs sm:text-sm text-muted-foreground font-playfair-display">({reader.rating.toFixed(1)})</span>
        </div>
        <div className="mb-3 space-x-1 flex flex-wrap gap-1">
          {specialtiesArray.slice(0,3).map((spec, idx) => (
            <span key={idx} className="inline-block bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))] px-2 py-0.5 rounded-full text-xs font-playfair-display">
              {spec}
            </span>
          ))}
        </div>
        {reader.shortBio && <CardDescription className="text-xs sm:text-sm text-foreground/80 font-playfair-display line-clamp-3 mb-2">{reader.shortBio}</CardDescription>}
        {reader.ratePerMinute !== undefined && (
          <p className="text-sm font-semibold text-[hsl(var(--soulseer-gold))] font-playfair-display mb-2">
            Rate: ${reader.ratePerMinute.toFixed(2)}/min
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 sm:p-6 pt-0 flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] font-playfair-display text-sm">
          <Link href={`/readers/${reader.id}`}>View Profile</Link>
        </Button>
        
        <div className="w-full grid grid-cols-3 gap-1 sm:gap-2">
          <Button 
            onClick={() => handleRequestSession('video')}
            disabled={!canRequestSession}
            className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm px-1 sm:px-2 py-1.5 sm:py-2 flex items-center justify-center gap-1"
            title="Request Video Session"
          >
            <Video className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Video</span>
          </Button>
          <Button 
            onClick={() => handleRequestSession('audio')}
            disabled={!canRequestSession}
            className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm px-1 sm:px-2 py-1.5 sm:py-2 flex items-center justify-center gap-1"
            title="Request Audio Session"
          >
            <Mic className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Audio</span>
          </Button>
          <Button 
            onClick={() => handleRequestSession('chat')}
            disabled={!canRequestSession}
            className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm px-1 sm:px-2 py-1.5 sm:py-2 flex items-center justify-center gap-1"
            title="Request Chat Session"
          >
            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Chat</span>
          </Button>
        </div>
      </CardFooter>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="halfGradientReaderCard">
            <stop offset="50%" stopColor="hsl(var(--soulseer-gold))" />
            <stop offset="50%" stopColor="hsl(var(--border))" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
    </Card>
  );
}


