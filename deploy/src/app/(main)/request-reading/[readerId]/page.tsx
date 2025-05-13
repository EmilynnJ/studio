'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { AppUser } from '@/types/user';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

export default function RequestReadingPage() {
  const { readerId } = useParams();
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [reader, setReader] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionType, setSessionType] = useState<'video' | 'audio' | 'chat'>('video');
  const [notes, setNotes] = useState('');
  
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      
      if (currentUser.role !== 'client') {
        router.push('/');
        return;
      }
      
      fetchReaderData();
    }
  }, [currentUser, loading, router, readerId]);
  
  const fetchReaderData = async () => {
    if (!readerId || typeof readerId !== 'string') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Invalid reader ID',
      });
      router.push('/readers');
      return;
    }
    
    try {
      const readerDocRef = doc(db, 'users', readerId);
      const readerDocSnap = await getDoc(readerDocRef);
      
      if (!readerDocSnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Reader not found',
        });
        router.push('/readers');
        return;
      }
      
      const readerData = readerDocSnap.data() as AppUser;
      
      // Verify this is a reader account
      if (readerData.role !== 'reader') {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Invalid reader account',
        });
        router.push('/readers');
        return;
      }
      
      setReader(readerData);
    } catch (error) {
      console.error('Error fetching reader data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load reader information',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRequestReading = async () => {
    if (!currentUser || !reader) return;
    
    setIsSubmitting(true);
    
    try {
      // Check if user has sufficient balance
      if ((currentUser.balance || 0) < (reader.ratePerMinute || 0)) {
        toast({
          variant: 'destructive',
          title: 'Insufficient Balance',
          description: 'Please add funds to your account before requesting a reading.',
        });
        return;
      }
      
      // Generate a unique session ID
      const sessionId = uuidv4();
      
      // Create session document in Firestore
      const sessionData = {
        sessionId,
        readerUid: reader.uid,
        readerName: reader.name,
        readerPhotoURL: reader.photoURL,
        clientUid: currentUser.uid,
        clientName: currentUser.name,
        clientPhotoURL: currentUser.photoURL,
        status: 'pending',
        requestedAt: serverTimestamp(),
        sessionType,
        notes,
        readerRatePerMinute: reader.ratePerMinute,
      };
      
      await addDoc(collection(db, 'videoSessions'), sessionData);
      
      toast({
        title: 'Reading Requested',
        description: 'Your request has been sent to the reader.',
      });
      
      // Redirect to the client dashboard
      router.push('/client-dashboard');
      
    } catch (error) {
      console.error('Error requesting reading:', error);
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: 'Failed to send reading request. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading || isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!reader) {
    return <div className="flex items-center justify-center min-h-screen">Reader not found</div>;
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Request a Reading</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Reader Profile</CardTitle>
              <CardDescription>
                Learn more about your selected reader
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  {reader.photoURL ? (
                    <img src={reader.photoURL} alt={reader.name || ''} />
                  ) : (
                    <div className="bg-primary text-white flex items-center justify-center h-full w-full text-xl">
                      {reader.name?.charAt(0) || 'R'}
                    </div>
                  )}
                </Avatar>
                
                <div>
                  <h3 className="font-medium text-lg">{reader.name}</h3>
                  <div className="flex items-center space-x-2">
                    <Badge variant={reader.status === 'online' ? 'default' : 'outline'}>
                      {reader.status || 'Offline'}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      ${reader.ratePerMinute}/minute
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium">About</h3>
                <p className="text-sm">{reader.bio}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Specialties</h3>
                <p className="text-sm">{reader.specialties}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Reading Details</CardTitle>
              <CardDescription>
                Choose your preferred reading format and provide any specific questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Select Reading Type</h3>
                <RadioGroup 
                  value={sessionType} 
                  onValueChange={(value) => setSessionType(value as 'video' | 'audio' | 'chat')}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div>
                    <RadioGroupItem value="video" id="video" className="peer sr-only" />
                    <Label
                      htmlFor="video"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      <div className="text-center">
                        <p className="font-medium">Video</p>
                        <p className="text-sm text-gray-500">Face-to-face reading</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div>
                    <RadioGroupItem value="audio" id="audio" className="peer sr-only" />
                    <Label
                      htmlFor="audio"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                      </svg>
                      <div className="text-center">
                        <p className="font-medium">Audio</p>
                        <p className="text-sm text-gray-500">Voice-only reading</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div>
                    <RadioGroupItem value="chat" id="chat" className="peer sr-only" />
                    <Label
                      htmlFor="chat"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <div className="text-center">
                        <p className="font-medium">Chat</p>
                        <p className="text-sm text-gray-500">Text-based reading</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label htmlFor="notes" className="font-medium">
                  Questions or Topics (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Share any specific questions or topics you'd like to discuss during your reading..."
                  className="mt-2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Reading Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Reader:</span>
                    <span className="font-medium">{reader.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium capitalize">{sessionType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span className="font-medium">${reader.ratePerMinute}/minute</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Your Balance:</span>
                    <span className="font-medium">${currentUser?.balance || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Time:</span>
                    <span className="font-medium">
                      ~{Math.floor((currentUser?.balance || 0) / (reader.ratePerMinute || 1))} minutes
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => router.push('/readers')}
              >
                Back to Readers
              </Button>
              <Button 
                onClick={handleRequestReading} 
                disabled={
                  isSubmitting || 
                  reader.status !== 'online' || 
                  (currentUser?.balance || 0) < (reader.ratePerMinute || 0)
                }
              >
                {isSubmitting ? 'Sending Request...' : 'Request Reading'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}