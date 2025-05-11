'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import PreCallChecks from '@/components/session/PreCallChecks';
import VideoCall from '@/components/session/VideoCall';
import PostCallSummary from '@/components/session/PostCallSummary';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { VideoSessionData } from '@/types/session';

const VideoCallPage = () => {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { data: authSession, status: authStatus } = useSession();
  const { toast } = useToast();

  const [sessionData, setSessionData] = useState<VideoSessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch session data from our API
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }

    const fetchSession = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to fetch session');
        }
        const data: VideoSessionData = await res.json();
        setSessionData(data);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        toast({
          variant: 'destructive',
          title: 'Error loading session',
          description: err.message || 'Could not load session data.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [authStatus, sessionId, router, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <p className="mb-4 text-destructive font-playfair-display">
          {error || 'Session not found.'}
        </p>
        <Button onClick={() => router.push('/dashboard')} className="font-playfair-display">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Determine which component to render based on session status
  switch (sessionData.status) {
    case 'pending':
      return (
        <PreCallChecks
          onContinue={() => router.refresh()}
          onCancel={() => router.push('/dashboard')}
        />
      );
    case 'active':
      return <VideoCall sessionData={sessionData} />;
    case 'ended':
      return <PostCallSummary sessionData={sessionData} />;
    default:
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
          <p className="mb-4 font-playfair-display">Unknown session status.</p>
          <Button onClick={() => router.push('/dashboard')} className="font-playfair-display">
            Back to Dashboard
          </Button>
        </div>
      );
  }
};

export default VideoCallPage;