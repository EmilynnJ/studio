'use client';

import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState, useCallback } from 'react';
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

type CallRole = 'caller' | 'callee' | 'unknown';
type CallStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'determining_role' | 'waiting_permission';


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
  const [callRole, setCallRole] = useState<CallRole>('unknown');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  
  // Combined loading state that depends on various async operations
  const isLoading = callStatus === 'idle' || callStatus === 'determining_role' || callStatus === 'waiting_permission' || (callStatus === 'connecting' && !peerConnectionRef.current?.currentRemoteDescription);


  // Request Camera and Microphone Permissions
  useEffect(() => {
    setCallStatus('waiting_permission');
    const getPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
        // Permission granted, next step will be role determination or connection
      } catch (error) {
        console.error('Error accessing camera/microphone:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Permissions Denied',
          description: 'Camera and microphone access is required. Please enable permissions in your browser settings.',
        });
        setCallStatus('error');
      }
    };
    getPermissions();

    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    };
  }, [toast]);


  // Determine Call Role (Caller or Callee)
  useEffect(() => {
    if (!currentUser || !sessionId || hasCameraPermission === false) return;
    if (hasCameraPermission === null) { // Still waiting for permissions
        setCallStatus('waiting_permission');
        return;
    }

    setCallStatus('determining_role');
    const determineRole = async () => {
      try {
        const roomRef = doc(db, 'webrtcRooms', sessionId);
        const roomSnapshot = await getDoc(roomRef);
        if (!roomSnapshot.exists()) {
          setCallRole('caller');
        } else {
          const roomData = roomSnapshot.data();
          if (roomData?.creatorUid === currentUser.uid) {
            setCallRole('caller'); // Creator rejoining or refreshing
          } else if (roomData?.offer && !roomData.answer) {
            setCallRole('callee');
          } else if (roomData?.answer) { // Room active with someone else, or call ended by this creator previously
             toast({ variant: 'destructive', title: 'Session Busy', description: 'This session is already in progress or has concluded.' });
             setCallStatus('error');
             setCallRole('unknown'); // Explicitly mark as unknown to prevent further action
             router.push('/');
             return;
          } else {
             setCallRole('callee'); // Default to callee if room exists but conditions are ambiguous (e.g. creator created but no offer yet)
          }
        }
        setCallStatus('connecting'); // Role determined, proceed to connect
      } catch (error) {
        console.error("Error determining role:", error);
        toast({ variant: 'destructive', title: 'Session Error', description: 'Could not determine session role.' });
        setCallStatus('error');
      }
    };

    determineRole();
  }, [currentUser, sessionId, hasCameraPermission, toast, router]);


  // WebRTC Setup, Signaling, and Connection Management
  useEffect(() => {
    if (!currentUser || !sessionId || callRole === 'unknown' || hasCameraPermission !== true || callStatus !== 'connecting') {
      if (!currentUser && hasCameraPermission === true) {
         toast({ variant: 'destructive', title: 'Authentication Required', description: 'Please log in to start a session.' });
         router.push('/login');
      }
      return;
    }

    const pc = new RTCPeerConnection(servers);
    peerConnectionRef.current = pc;

    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = event => {
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setCallStatus('connected');
      }
    };
    
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
            setCallStatus('connected');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            setCallStatus('disconnected');
        } else if (pc.connectionState === 'connecting') {
            setCallStatus('connecting');
        }
    };

    const roomRef = doc(db, 'webrtcRooms', sessionId);
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

    pc.onicecandidate = event => {
      if (event.candidate) {
        const candidatesCollection = callRole === 'caller' ? callerCandidatesCollection : calleeCandidatesCollection;
        addDoc(candidatesCollection, event.candidate.toJSON()).catch(e => console.error("Error adding ICE candidate: ", e));
      }
    };

    let unsubscribeCallbacks: (() => void)[] = [];

    const setupSignaling = async () => {
      try {
        if (callRole === 'caller') {
          const roomSnapshot = await getDoc(roomRef);
          if (!roomSnapshot.exists()) {
            await setDoc(roomRef, { createdAt: serverTimestamp(), creatorUid: currentUser.uid });
          }
          
          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);
          await updateDoc(roomRef, { offer: { sdp: offerDescription.sdp, type: offerDescription.type }, creatorUid: currentUser.uid });

          unsubscribeCallbacks.push(onSnapshot(roomRef, (snapshot) => {
            const data = snapshot.data();
            if (!pc.currentRemoteDescription && data?.answer) {
              pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(e => console.error("Error setting remote description (answer):", e));
            }
          }));
          unsubscribeCallbacks.push(onSnapshot(calleeCandidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.error("Error adding ICE candidate (callee):", e));
              }
            });
          }));

        } else if (callRole === 'callee') {
          const roomSnapshot = await getDoc(roomRef);
          const roomData = roomSnapshot.data();

          if (roomData?.offer) {
            await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);
            await updateDoc(roomRef, { answer: { sdp: answerDescription.sdp, type: answerDescription.type } });

            unsubscribeCallbacks.push(onSnapshot(callerCandidatesCollection, (snapshot) => {
              snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                  pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.error("Error adding ICE candidate (caller):", e));
                }
              });
            }));
          } else {
            throw new Error('Offer not found for callee.');
          }
        }
      } catch (err) {
        console.error("Signaling setup error:", err);
        toast({variant: 'destructive', title: 'Connection Error', description: 'Failed to set up signaling.'});
        setCallStatus('error');
      }
    };

    setupSignaling();

    return () => {
      unsubscribeCallbacks.forEach(cb => cb());
      unsubscribeCallbacks = [];
      if (peerConnectionRef.current) {
        peerConnectionRef.current.getTransceivers().forEach(transceiver => {
            if (transceiver.sender.track) {
                transceiver.sender.track.stop();
            }
            if (transceiver.receiver.track) {
                transceiver.receiver.track.stop();
            }
            // transceiver.stop(); // Use if needed, might be too aggressive or already handled by track.stop()
        });
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  // Dependencies: currentUser, sessionId, callRole, hasCameraPermission, and callStatus ensure this runs when these critical states are ready.
  // router and toast are stable.
  }, [currentUser, sessionId, callRole, hasCameraPermission, callStatus, router, toast]);


  const handleHangUp = useCallback(async () => {
    setCallStatus('disconnected');
    if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null; // Clear the ref

    if (sessionId && currentUser && callRole === 'caller') { // Only caller cleans up the room
      const roomRef = doc(db, 'webrtcRooms', sessionId);
      try {
        const batch = writeBatch(db);
        const callerCandidatesQuery = query(collection(roomRef, 'callerCandidates'));
        const calleeCandidatesQuery = query(collection(roomRef, 'calleeCandidates'));
        
        const callerDocs = await getDocs(callerCandidatesQuery);
        callerDocs.forEach(docSnapshot => batch.delete(docSnapshot.ref));
        
        const calleeDocs = await getDocs(calleeCandidatesQuery);
        calleeDocs.forEach(docSnapshot => batch.delete(docSnapshot.ref));
        
        batch.delete(roomRef);
        await batch.commit();
        toast({ title: 'Call Ended', description: 'Session data has been cleared.' });
      } catch (error) {
        console.error("Error cleaning up Firestore room:", error);
        // Attempt to delete main room doc as a fallback
        try { await deleteDoc(roomRef); } catch (e) { console.error("Fallback delete failed", e); }
        toast({ variant: 'default', title: 'Call Ended', description: 'Session ended. Minor cleanup issue occurred.'});
      }
    } else if (callRole !== 'caller') {
        toast({ title: 'Call Ended' });
    }
    router.push('/');
  }, [sessionId, currentUser, callRole, router, toast]);

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

  if (isLoading) {
    let loadingMessage = 'Loading session...';
    if (callStatus === 'waiting_permission') loadingMessage = 'Requesting permissions...';
    else if (callStatus === 'determining_role') loadingMessage = 'Determining session role...';
    else if (callStatus === 'connecting') loadingMessage = 'Initiating spiritual connection...';

    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-[hsl(var(--primary))]" />
        <p className="mt-4 text-lg font-playfair-display text-foreground/80">
          {loadingMessage}
        </p>
      </div>
    );
  }
  
  if (hasCameraPermission === false || callStatus === 'error') {
     const title = hasCameraPermission === false ? "Permissions Required" : "Session Error";
     const description = hasCameraPermission === false 
        ? "Please grant permissions to your camera and microphone. You may need to adjust your browser settings."
        : "There was an issue with the video session. This could be due to network problems, or the session may be invalid, already in use, or an unexpected error occurred. Please try again later or contact support.";
     return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        <PageTitle>Video Session Problem</PageTitle>
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-8 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">Go to Homepage</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
      <PageTitle>Video Session</PageTitle>
      
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
              {callStatus === 'connecting' && !peerConnectionRef.current?.currentRemoteDescription && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                      <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--primary))]"/>
                      <p className="mt-3 text-white font-playfair-display">
                        Connecting to peer...
                      </p>
                  </div>
              )}
              {callStatus === 'connected' && (!remoteVideoRef.current?.srcObject || remoteVideoRef.current?.readyState < 3 /* HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA */) && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                    <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--primary))]"/>
                    <p className="mt-3 text-white font-playfair-display">
                        Waiting for video...
                    </p>
                </div>
              )}
              {callStatus !== 'connecting' && callStatus !== 'connected' && (!remoteVideoRef.current?.srcObject || remoteVideoRef.current?.readyState < 3) && (
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
        <Button onClick={toggleMute} variant="outline" size="lg" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]" disabled={callStatus !== 'connected' && callStatus !== 'connecting'}>
          {isMuted ? <MicOff /> : <Mic />} <span className="ml-1 sm:ml-2 font-playfair-display hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
        </Button>
        <Button onClick={toggleVideo} variant="outline" size="lg" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]" disabled={callStatus !== 'connected' && callStatus !== 'connecting'}>
          {isVideoOff ? <VideoOff /> : <Video />} <span className="ml-1 sm:ml-2 font-playfair-display hidden sm:inline">{isVideoOff ? 'Video On' : 'Video Off'}</span>
        </Button>
        <Button onClick={handleHangUp} variant="destructive" size="lg" disabled={callStatus === 'disconnected' || callStatus === 'idle'}>
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
