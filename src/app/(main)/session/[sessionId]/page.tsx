'use client';

import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, getDoc, onSnapshot, collection, addDoc, serverTimestamp, updateDoc, writeBatch, query, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Mic, MicOff, VideoOff, PhoneOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/ui/page-title';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const servers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

const VideoCallPage: NextPage = () => {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCallerRole, setIsCallerRole] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(true);

  // Camera Permission Effect
  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera and microphone permissions in your browser settings.',
        });
        setCallStatus('error');
        setIsLoading(false);
      }
    };
    getCameraPermission();

    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [toast]);


  // WebRTC Setup and Signaling Effect
  useEffect(() => {
    if (!currentUser || !sessionId || hasCameraPermission === false) {
      if (!currentUser && hasCameraPermission !== null && hasCameraPermission !== false) { // Not logged in but permissions are resolved or not denied
         toast({ variant: 'destructive', title: 'Authentication Required', description: 'Please log in to start a session.' });
         router.push('/login');
      }
      // if camera permission is false, isLoading should be false from camera effect
      // if camera permission is null, still loading for permission
      if(hasCameraPermission === false || (hasCameraPermission !== null && !currentUser)) setIsLoading(false);
      return;
    }
    if (hasCameraPermission === null) return; // Wait for permission check

    setIsLoading(true);
    setCallStatus('connecting');

    const pc = new RTCPeerConnection(servers);
    peerConnectionRef.current = pc;

    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = event => {
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setCallStatus('connected');
        setIsLoading(false); 
      }
    };

    const roomRef = doc(db, 'webrtcRooms', sessionId);
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

    pc.onicecandidate = event => {
      if (event.candidate) {
        if (isCallerRole) {
          addDoc(callerCandidatesCollection, event.candidate.toJSON());
        } else {
          addDoc(calleeCandidatesCollection, event.candidate.toJSON());
        }
      }
    };

    const setupCall = async () => {
      const roomSnapshot = await getDoc(roomRef);

      if (!roomSnapshot.exists()) { // Current user is the caller
        setIsCallerRole(true);
        await setDoc(roomRef, { createdAt: serverTimestamp(), creatorUid: currentUser.uid });
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);
        const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
        await updateDoc(roomRef, { offer });

        const unsubAnswer = onSnapshot(roomRef, (snapshot) => {
          const data = snapshot.data();
          if (!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription);
          }
        });

        const unsubCalleeCandidates = onSnapshot(calleeCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            }
          });
        });
        setIsLoading(false);
        return () => { unsubAnswer(); unsubCalleeCandidates(); };

      } else { // Room exists
        const roomData = roomSnapshot.data();
        if (roomData.creatorUid === currentUser.uid) { // Creator rejoining/refreshing
            setIsCallerRole(true);
            if (!roomData.offer && pc.signalingState !== 'have-local-offer') { // Offer might not have been set or lost
                const offerDescription = await pc.createOffer();
                await pc.setLocalDescription(offerDescription);
                await updateDoc(roomRef, { offer: { sdp: offerDescription.sdp, type: offerDescription.type } });
            } else if (roomData.offer && !pc.localDescription) { // Ensure local desc is set if offer exists
                 await pc.setLocalDescription(new RTCSessionDescription(roomData.offer));
            }


            const unsubAnswer = onSnapshot(roomRef, (snapshot) => {
                const data = snapshot.data();
                if (!pc.currentRemoteDescription && data?.answer) {
                    pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                }
            });
            const unsubCalleeCandidates = onSnapshot(calleeCandidatesCollection, (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                });
            });
            // If already connected, remote stream might be there or coming via ontrack
            if(pc.currentRemoteDescription) setCallStatus('connected');
            setIsLoading(false);
            return () => { unsubAnswer(); unsubCalleeCandidates(); };

        } else if (roomData.offer && !roomData.answer) { // Callee joining
            setIsCallerRole(false);
            await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);
            await updateDoc(roomRef, { answer: { sdp: answerDescription.sdp, type: answerDescription.type } });

            const unsubCallerCandidates = onSnapshot(callerCandidatesCollection, (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                });
            });
            //isLoading will be set to false in ontrack or if connection fails
            return () => { unsubCallerCandidates(); };
        } else if (roomData.answer) { // Room already has an answer
            toast({ variant: 'destructive', title: 'Session Busy', description: 'This session is already in progress or has ended.'});
            setCallStatus('error');
            setIsLoading(false);
            router.push('/');
        } else { // Offer not ready from creator, or other error
            toast({ variant: 'destructive', title: 'Session Error', description: 'Could not join. The session may not be ready.'});
            setCallStatus('error');
            setIsLoading(false);
        }
      }
    };
    
    let unsubscribeSignaling: (() => void) | undefined;
    setupCall().then(unsub => { unsubscribeSignaling = unsub; }).catch(err => {
      console.error("Setup call error:", err);
      toast({variant: 'destructive', title: 'Connection Error', description: 'Failed to set up the call.'});
      setCallStatus('error');
      setIsLoading(false);
    });

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            setCallStatus('disconnected');
            setIsLoading(false);
        } else if (pc.connectionState === 'connected') {
            setCallStatus('connected');
            setIsLoading(false);
        }
    }


    return () => {
      unsubscribeSignaling?.();
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };

  }, [currentUser, sessionId, hasCameraPermission, router, toast, isCallerRole]);

  const handleHangUp = async () => {
    setCallStatus('disconnected');
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach(track => track.stop());

    if (sessionId) {
      const roomRef = doc(db, 'webrtcRooms', sessionId);
      try {
        const batch = writeBatch(db);
        const callerCandidatesQuery = query(collection(roomRef, 'callerCandidates'));
        const calleeCandidatesQuery = query(collection(roomRef, 'calleeCandidates'));
        
        const callerDocs = await getDocs(callerCandidatesQuery);
        callerDocs.forEach(docSnapshot => batch.delete(docSnapshot.ref));
        
        const calleeDocs = await getDocs(calleeCandidatesQuery);
        calleeDocs.forEach(docSnapshot => batch.delete(docSnapshot.ref));
        
        batch.delete(roomRef); // Delete the main room document
        await batch.commit();
        toast({ title: 'Call Ended', description: 'Session data cleaned up.' });
      } catch (error) {
        console.error("Error cleaning up Firestore room:", error);
        // Fallback to individual deletes if batch fails or if only main doc needs deleting
        try {
            await deleteDoc(roomRef);
        } catch (delError) {
            console.error("Error deleting room document directly:", delError);
        }
        toast({ variant: 'destructive', title: 'Cleanup Issue', description: 'Could not fully clean up session data.'});
      }
    }
    router.push('/');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(prev => !prev);
    }
  };

  if (isLoading && hasCameraPermission !== false && callStatus !== 'error') {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-[hsl(var(--primary))]" />
        <p className="mt-4 text-lg font-playfair-display text-foreground/80">
          {callStatus === 'connecting' ? 'Initiating spiritual connection...' : 'Loading session...'}
        </p>
      </div>
    );
  }
  
  if (hasCameraPermission === false) {
     return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        <PageTitle>Video Session Error</PageTitle>
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Camera and Microphone Required</AlertTitle>
          <AlertDescription>
            Please grant permissions to your camera and microphone to start the video session.
            You may need to adjust your browser settings.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-8 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">Go to Homepage</Button>
      </div>
    );
  }
  
  if (callStatus === 'error') {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        <PageTitle>Session Error</PageTitle>
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Connection Problem</AlertTitle>
          <AlertDescription>
            There was an issue establishing the video session. This could be due to network problems, or the session may be invalid or already in use. Please try again later or contact support.
          </AlertDescription>
        </Alert>
         <Button onClick={() => router.push('/')} className="mt-8 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">Go to Homepage</Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
      <PageTitle>Video Session</PageTitle> {/* Session ID removed for privacy/cleanliness: {sessionId.substring(0,8)}...*/}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Your View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-black rounded-md overflow-hidden">
              <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Remote View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-black rounded-md overflow-hidden relative">
              <video ref={remoteVideoRef} className="w-full h-full object-cover" autoPlay playsInline />
              {(callStatus === 'connecting' || (callStatus === 'connected' && !remoteVideoRef.current?.srcObject && !remoteVideoRef.current?.HAVE_ENOUGH_DATA)) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                      <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--primary))]"/>
                      <p className="mt-3 text-white font-playfair-display">
                        {callStatus === 'connecting' ? 'Connecting to peer...' : 'Waiting for video...'}
                      </p>
                  </div>
              )}
               {callStatus !== 'connecting' && callStatus !== 'connected' && !remoteVideoRef.current?.srcObject && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                    <VideoOff className="h-12 w-12 text-muted-foreground"/>
                    <p className="mt-3 text-muted-foreground font-playfair-display">
                        Remote video unavailable
                    </p>
                </div>
               )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex justify-center space-x-2 sm:space-x-4">
        <Button onClick={toggleMute} variant="outline" size="lg" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
          {isMuted ? <MicOff /> : <Mic />} <span className="ml-1 sm:ml-2 font-playfair-display hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
        </Button>
        <Button onClick={toggleVideo} variant="outline" size="lg" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
          {isVideoOff ? <VideoOff /> : <Video />} <span className="ml-1 sm:ml-2 font-playfair-display hidden sm:inline">{isVideoOff ? 'Video On' : 'Video Off'}</span>
        </Button>
        <Button onClick={handleHangUp} variant="destructive" size="lg">
          <PhoneOff /> <span className="ml-1 sm:ml-2 font-playfair-display">End Call</span>
        </Button>
      </div>

      {callStatus === 'disconnected' && (
        <Alert className="mt-8 max-w-md mx-auto bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)]">
            <PhoneOff className="h-5 w-5 text-[hsl(var(--primary))]"/>
            <AlertTitle className="font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Call Ended</AlertTitle>
            <AlertDescription className="font-playfair-display text-foreground/80">The video session has been disconnected.</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default VideoCallPage;
