'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

// Define the reader type to match what's used in the homepage
interface Reader {
  id: string;
  name: string;
  specialties: string;
  rating: number;
  imageUrl: string;
  status: 'online' | 'offline' | 'busy';
  shortBio: string;
  dataAiHint?: string;
  sessionType?: 'video' | 'chat' | 'voice';
  photoURL?: string;
  bio?: string;
  ratePerMinute?: number;
}

interface ReaderCardProps {
  reader: Reader;
}

export function ReaderCard({ reader }: ReaderCardProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const isLoggedIn = !!currentUser;
  
  // Get status badge color
  const getStatusBadge = () => {
    switch (reader.status) {
      case 'online':
        return <Badge className="bg-green-500">Online</Badge>;
      case 'busy':
        return <Badge className="bg-yellow-500">Busy</Badge>;
      case 'offline':
      default:
        return <Badge variant="outline">Offline</Badge>;
    }
  };
  
  // Truncate text to a certain length
  const truncate = (text: string | null | undefined, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  // Format specialties as tags
  const formatSpecialties = (specialties: string | null | undefined) => {
    if (!specialties) return [];
    
    // Split by commas or semicolons and trim whitespace
    return specialties
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const handleRequestReading = () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    
    router.push(`/request-reading/${reader.id}`);
  };
  
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="relative">
        {/* Cover image or gradient background */}
        <div className="h-24 bg-gradient-to-r from-purple-500 to-pink-500"></div>
        
        {/* Avatar */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <Avatar className="h-20 w-20 border-4 border-white">
            {reader.photoURL || reader.imageUrl ? (
              <img src={reader.photoURL || reader.imageUrl} alt={reader.name || ''} />
            ) : (
              <div className="bg-primary text-white flex items-center justify-center h-full w-full text-xl">
                {reader.name?.charAt(0) || 'R'}
              </div>
            )}
          </Avatar>
        </div>
      </div>
      
      <CardHeader className="pt-12 pb-2 text-center">
        <div className="flex items-center justify-center space-x-2 mb-1">
          <h3 className="text-xl font-bold">{reader.name}</h3>
          {getStatusBadge()}
        </div>
        <p className="text-sm text-gray-500">
          ${reader.ratePerMinute || 5}/minute
        </p>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <p className="text-sm mb-4">
          {truncate(reader.bio || reader.shortBio, 150)}
        </p>
        
        {reader.specialties && (
          <div className="flex flex-wrap gap-1">
            {formatSpecialties(reader.specialties).slice(0, 4).map((specialty, index) => (
              <Badge key={index} variant="outline" className="bg-gray-100">
                {specialty}
              </Badge>
            ))}
            {formatSpecialties(reader.specialties).length > 4 && (
              <Badge variant="outline" className="bg-gray-100">
                +{formatSpecialties(reader.specialties).length - 4} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleRequestReading}
          disabled={reader.status !== 'online' || !isLoggedIn}
        >
          {!isLoggedIn ? 'Login to Request' : 
            reader.status === 'online' ? 'Request Reading' : 'Currently Unavailable'}
        </Button>
      </CardFooter>
    </Card>
  );
}