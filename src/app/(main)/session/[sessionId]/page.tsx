
// Updated src/app/(main)/session/[sessionId]/page.tsx
'use client';

import 'webrtc-adapter'; // Import for side-effects (browser shimming)
import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState, useCallback, FormEvent } from 'react';
import { doc, setDoc, getDoc, onSnapshot, collection, addDoc, serverTimestamp, updateDoc, writeBatch, query, getDocs, deleteDoc, orderBy, Timestamp, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Video, Mic, MicOff, VideoOff, PhoneOff, Loader2, MessageSquare, Send, User, AlertTriangle, CheckCircle, Users, Ear, EarOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/ui/page-title';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AppUser } from '@/types/user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Default ICE servers
const defaultIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let iceServersList = defaultIceServers;
// Check for custom ICE servers from environment variables
// Note: NEXT_PUBLIC_ prefix is essential for client-side access in Next.js
const iceServerConfigString = process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS;

if (iceServerConfigString) {
  try {
    const parsedIceServers = JSON.parse(iceServerConfigString);
    if (Array.isArray(parsedIceServers) && parsedIceServers.length > 0) {
      iceServersList = parsedIceServers;
      console.log("Using custom ICE servers:", iceServersList);
    } else {
      console.warn("NEXT_PUBLIC_WEBRTC_ICE_SERVERS is not a valid array or is empty. Using default STUN servers.");
    }
  } catch (e) {
    console.error("Failed to parse NEXT_PUBLIC_WEBRTC_ICE_SERVERS. Using default STUN servers. Error:", e);
  }
}

const servers = {
  iceServers: iceServersList,
  iceCandidatePoolSize: 10,
};

type CallRole = 'caller' | 'callee' | 'unknown'; // caller is Reader, callee is Client
type CallStatus = 'idle' | 'loading_session' | 'waiting_permission' | 'permission_granted' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'ended';
type SessionType = 'video' | 'audio' | 'chat';

interface VideoSessionData {
  sessionId: string;
  readerUid: string;
  readerName: string;
  clientUid: string;
  clientName: string;
  status: 'pending' | 'active' | 'ended' | 'cancelled';
  requestedAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  sessionType: SessionType; // Now mandatory
  totalMinutes?: number; 
  amountCharged?: number; 
}

interface ChatMessage {
  id?: string;
  senderUid: string;
  senderName: string;
  text: string;
  timestamp: Timestamp | null;
}

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
  
  const [sessionData, setSessionData] = useState<VideoSessionData | null>(null);
  const [opponent, setOpponent] = useState<Pick<AppUser, 'name' | 'uid' | 'photoURL'> | null>(null);
  const [mediaPermissionsStatus, setMediaPermissionsStatus] = useState<'prompt' | 'granted' | 'denied' | 'not_needed'>('prompt');
  const [callRole, setCallRole] = useState<CallRole>('unknown');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false); 
  const [remoteVideoActuallyOff, setRemoteVideoActuallyOff] = useState(true); 
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sessionTimer, setSessionTimer] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const determinedSessionType = sessionData?.sessionType || 'chat'; // Default to chat if somehow not set

  const isLoading = callStatus === 'idle' || callStatus === 'loading_session' || callStatus === 'waiting_permission';
  const isMediaSession = determinedSessionType === 'video' || determinedSessionType === 'audio';


  useEffect(() => {
    if (!currentUser || !sessionId) return;
    setCallStatus('loading_session');
    const sessionDocRef = doc(db, 'videoSessions', sessionId);
    const unsubscribe = onSnapshot(sessionDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as VideoSessionData;
        if (data.status === 'cancelled' || data.status === 'ended') {
            toast({ title: 'Session Over', description: `This session has been ${data.status}.`});
            router.push('/dashboard');
            return;
        }
        setSessionData(data);

        let determinedRole: CallRole = 'unknown';
        let opponentUid: string | null = null;

        if (currentUser.uid === data.readerUid) {
          determinedRole = 'caller'; 
          opponentUid = data.clientUid;
        } else if (currentUser.uid === data.clientUid) {
          determinedRole = 'callee'; 
          opponentUid = data.readerUid;
        } else {
          toast({ variant: 'destructive', title: 'Unauthorized', description: 'You are not part of this session.' });
          setCallStatus('error');
          router.push('/');
          return;
        }
        setCallRole(determinedRole);
        
        if (opponentUid) {
          const userDoc = await getDoc(doc(db, 'users', opponentUid));
          if (userDoc.exists()) {
            const opponentData = userDoc.data() as AppUser;
            setOpponent({ name: opponentData.name || 'Participant', uid: opponentData.uid, photoURL: opponentData.photoURL });
          }
        }
        if (callStatus === 'loading_session' || callStatus === 'idle') { // Only transition if it's an initial load
            setCallStatus('waiting_permission');
        }
      } else {
        toast({ variant: 'destructive', title: 'Session Not Found', description: 'This session does not exist or has been removed.' });
        setCallStatus('error');
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [currentUser, sessionId, router, toast]);
  
  useEffect(() => {
    // Initialize video/mute state based on session type
    if (sessionData) {
      const type = sessionData.sessionType;
      if (type === 'audio') {
        setIsVideoOff(true); 
      } else if (type === 'chat') {
        setIsVideoOff(true);
        setIsMuted(true); 
      }
    }
  }, [sessionData]);


  useEffect(() => {
    if (callStatus !== 'waiting_permission' || callRole === 'unknown' || !sessionData) return;

    const getPermissions = async () => {
      const type = sessionData.sessionType;
      
      if (type === 'chat') {
        setMediaPermissionsStatus('not_needed');
        setCallStatus('permission_granted'); 
        return;
      }

      const audioRequested = type === 'video' || type === 'audio';
      const videoRequested = type === 'video';

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioRequested, video: videoRequested });
        localStreamRef.current = stream;
        
        stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
        stream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);

        if (localVideoRef.current && type === 'video' && stream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = stream;
        } else if (localVideoRef.current) {
          localVideoRef.current.srcObject = null; 
        }
        setMediaPermissionsStatus('granted');
        setCallStatus('permission_granted');
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setMediaPermissionsStatus('denied');
        const permDeniedMessage = type === 'audio' ? 'Microphone access is required or was denied.' : 'Camera and/or microphone access is required or was denied.';
        toast({ variant: 'destructive', title: 'Permissions Denied', description: permDeniedMessage });
        setCallStatus('error'); 
      }
    };
    
    getPermissions();

  }, [callStatus, callRole, sessionData, toast, isMuted, isVideoOff]);

  useEffect(() => {
    if (!currentUser || !sessionId || callRole === 'unknown' || callStatus !== 'permission_granted' || !sessionData) {
      return;
    }

    if (sessionData.sessionType === 'chat') {
      setCallStatus('connected'); 
      if (sessionData.status !== 'active') {
        updateDoc(doc(db, 'videoSessions', sessionId), { status: 'active', startedAt: serverTimestamp() });
      }
      return; 
    }

    setCallStatus('connecting');
    const pc = new RTCPeerConnection(servers);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          try {
            pc.addTrack(track, localStreamRef.current!);
          } catch (e) {
            console.error("Error adding track:", e);
          }
        });
    }

    pc.ontrack = event => {
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        const videoTrack = event.streams[0].getVideoTracks()[0];
        if (videoTrack) {
          setRemoteVideoActuallyOff(!videoTrack.enabled); // Initial state
          videoTrack.onmute = () => { console.log("Remote video muted"); setRemoteVideoActuallyOff(true); };
          videoTrack.onunmute = () => { console.log("Remote video unmuted"); setRemoteVideoActuallyOff(false); };
        } else {
           setRemoteVideoActuallyOff(true); 
        }
        const audioTrack = event.streams[0].getAudioTracks()[0];
         if (audioTrack) {
            audioTrack.onmute = () => console.log("Remote audio muted");
            audioTrack.onunmute = () => console.log("Remote audio unmuted");
         }

      }
    };
    
    pc.onconnectionstatechange = async () => {
      console.log("Connection state:", pc.connectionState);
      switch (pc.connectionState) {
        case 'connected':
          setCallStatus('connected');
          if (sessionData.status !== 'active' || !sessionData.startedAt) {
            await updateDoc(doc(db, 'videoSessions', sessionId), { status: 'active', startedAt: serverTimestamp() });
          }
          toast({title: "Connection Established", description: `Connected with ${opponent?.name || 'participant'}.`, variant: "default"});
          break;
        case 'disconnected':
          setCallStatus('disconnected');
          toast({title: "Disconnected", description: "Connection lost. Attempting to reconnect...", variant: "destructive"});
          // Consider attempting to reconnect here or prompting user
          break;
        case 'failed':
          setCallStatus('error');
          toast({title: "Connection Failed", description: "Could not establish connection.", variant: "destructive"});
          // handleHangUp(); // Or prompt user before ending
          break;
        case 'closed':
          setCallStatus('ended'); // If closed not by hangup, treat as ended.
          // handleHangUp(); // this might be redundant if hangUp caused the close
          break;
        case 'connecting':
          setCallStatus('connecting');
          break;
        default:
          break;
      }
    };

    const roomRef = doc(db, 'webrtcRooms', sessionId);
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');
    let iceCandidateListeners: Unsubscribe[] = [];

    pc.onicecandidate = event => {
      if (event.candidate) {
        const candidatesCollection = callRole === 'caller' ? callerCandidatesCollection : calleeCandidatesCollection;
        addDoc(candidatesCollection, event.candidate.toJSON()).catch(e => console.error("Error adding ICE candidate: ", e));
      }
    };

    let unsubscribeSignalingCallbacks: Unsubscribe[] = [];

    const setupSignaling = async () => {
      try {
        const roomSnapshot = await getDoc(roomRef);

        if (callRole === 'caller') { 
          if (!roomSnapshot.exists()) { 
            await setDoc(roomRef, { createdAt: serverTimestamp(), creatorUid: currentUser.uid, sessionId: sessionId });
          }
          
          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);
          await updateDoc(roomRef, { offer: { sdp: offerDescription.sdp, type: offerDescription.type }});

          unsubscribeSignalingCallbacks.push(onSnapshot(roomRef, (snapshot) => {
            const data = snapshot.data();
            if (data?.answer && (!pc.currentRemoteDescription || pc.currentRemoteDescription.type !== 'answer')) {
              pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(e => console.error("Caller: Error setting remote description (answer):", e));
            }
          }));
          iceCandidateListeners.push(onSnapshot(calleeCandidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.error("Caller: Error adding ICE candidate (from callee):", e));
              }
            });
          }));

        } else if (callRole === 'callee') { 
          const handleOffer = async (offerData: RTCSessionDescriptionInit) => {
            if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') return; 
            await pc.setRemoteDescription(new RTCSessionDescription(offerData));
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);
            await updateDoc(roomRef, { answer: { sdp: answerDescription.sdp, type: answerDescription.type }});
          };
          
          if (roomSnapshot.exists() && roomSnapshot.data()?.offer) {
             await handleOffer(roomSnapshot.data()!.offer);
          } else {
            console.log("Callee waiting for offer...");
            unsubscribeSignalingCallbacks.push(onSnapshot(roomRef, async (snapshot) => {
                const data = snapshot.data();
                if (data?.offer && !pc.currentRemoteDescription && (!pc.localDescription || pc.localDescription.type !== 'answer')) { 
                    await handleOffer(data.offer);
                }
            }));
          }
          iceCandidateListeners.push(onSnapshot(callerCandidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.error("Callee: Error adding ICE candidate (from caller):", e));
              }
            });
          }));
        }
      } catch (err) {
        console.error("Signaling setup error:", err);
        toast({variant: 'destructive', title: 'Connection Error', description: 'Failed to set up signaling.'});
        setCallStatus('error');
      }
    };

    setupSignaling();

    return () => {
      unsubscribeSignalingCallbacks.forEach(cb => cb());
      iceCandidateListeners.forEach(unsub => unsub());
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, sessionId, callRole, callStatus, sessionData, toast, mediaPermissionsStatus]);


  useEffect(() => {
    if (!sessionId) return;
    const messagesCollectionRef = collection(db, 'webrtcRooms', sessionId, 'messages');
    const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setChatMessages(msgs);
    });

    return () => unsubscribe();
  }, [sessionId]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser || !sessionId) return;

    const messagesCollectionRef = collection(db, 'webrtcRooms', sessionId, 'messages');
    try {
      await addDoc(messagesCollectionRef, {
        senderUid: currentUser.uid,
        senderName: currentUser.name || 'User',
        text: chatInput.trim(),
        timestamp: serverTimestamp(),
      });
      setChatInput('');
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not send message.' });
    }
  };
  
  useEffect(() => {
    if (callStatus === 'connected' && sessionData?.status === 'active' && sessionData?.startedAt) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); 
      
      const updateTimer = () => {
        const now = Timestamp.now();
        const elapsed = now.seconds - (sessionData.startedAt?.seconds || now.seconds);
        setSessionTimer(elapsed > 0 ? elapsed : 0);
      };
      updateTimer(); 
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
       if (sessionData?.status !== 'active' && sessionData?.status !== 'pending') { // if ended or cancelled
        if(sessionData?.startedAt && sessionData?.endedAt) {
            const elapsed = sessionData.endedAt.seconds - sessionData.startedAt.seconds;
            setSessionTimer(elapsed > 0 ? elapsed : 0);
        } else {
            setSessionTimer(0);
        }
      } else if (callStatus !== 'connected' && callStatus !== 'connecting') {
         setSessionTimer(0);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [callStatus, sessionData?.status, sessionData?.startedAt, sessionData?.endedAt]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };


  const handleHangUp = useCallback(async (isPageUnload = false) => {
    if (callStatus === 'ended' || callStatus === 'error') return; // Already ended or in error state

    setCallStatus('ended'); 
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
    }

    if (sessionId && currentUser) {
      const videoSessionDocRef = doc(db, 'videoSessions', sessionId);
      const currentSessionSnap = await getDoc(videoSessionDocRef);
      
      if (currentSessionSnap.exists()) {
        const currentSession = currentSessionSnap.data() as VideoSessionData;
        if(currentSession.status !== 'ended' && currentSession.status !== 'cancelled') {
            let totalMinutes = 0;
            if (currentSession.startedAt) {
                const endTime = Timestamp.now();
                totalMinutes = Math.ceil((endTime.seconds - currentSession.startedAt.seconds) / 60);
                 // Update timer one last time
                const elapsed = endTime.seconds - currentSession.startedAt.seconds;
                setSessionTimer(elapsed > 0 ? elapsed : 0);
            } else if (currentSession.totalMinutes) { // if already ended from other side
                totalMinutes = currentSession.totalMinutes;
            }


            await updateDoc(videoSessionDocRef, { 
                status: 'ended', 
                endedAt: serverTimestamp(),
                totalMinutes: totalMinutes,
                // amountCharged: ... // Stripe billing logic would go here
            });
        }
      }

      if (callRole === 'caller' && isMediaSession) { 
        const roomRef = doc(db, 'webrtcRooms', sessionId);
        try {
          const batch = writeBatch(db);
          const subcollections = ['callerCandidates', 'calleeCandidates', 'messages'];
          for (const subcoll of subcollections) {
            const q = query(collection(roomRef, subcoll));
            const docsSnap = await getDocs(q);
            docsSnap.forEach(docSnapshot => batch.delete(docSnapshot.ref));
          }
          batch.delete(roomRef);
          await batch.commit();
        } catch (error) {
          console.error("Error cleaning up Firestore room:", error);
        }
      }
      if (!isPageUnload) {
        toast({ title: 'Session Ended', description: 'The session has been successfully ended.' });
        router.push('/dashboard'); // Redirect to dashboard or relevant page
      }
    } else if (!isPageUnload) {
         router.push('/');
    }
  }, [sessionId, currentUser, callRole, router, toast, isMediaSession, callStatus]);

  useEffect(() => {
    const cleanup = () => {
      if (peerConnectionRef.current || localStreamRef.current) {
        handleHangUp(true); // Pass true for page unload
      }
    };
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
       if (peerConnectionRef.current || localStreamRef.current) { // Cleanup if component unmounts for other reasons
           handleHangUp(false);
       }
    };
  }, [handleHangUp]);


  const toggleMute = () => {
    if (determinedSessionType === 'chat') return;
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      const newMutedState = !isMuted;
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
      });
      setIsMuted(newMutedState);
    }
  };

  const toggleVideo = () => {
    if (determinedSessionType !== 'video') return; 
    if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
      const newVideoOffState = !isVideoOff;
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !newVideoOffState;
      });
      setIsVideoOff(newVideoOffState);
      // Update local video display immediately
      if (localVideoRef.current) {
        if (newVideoOffState) {
          localVideoRef.current.srcObject = null; // Or show a placeholder/avatar
        } else if (localStreamRef.current) {
          // Ensure the stream with the now-enabled video track is reassigned
          // This might require re-creating a new stream with only the video track if srcObject doesn't update
          // For simplicity, we assume srcObject updates if tracks within it are enabled/disabled
          // However, best practice might involve a more explicit update or using a MediaStreamTrack.onmute/onunmute
           localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  if (isLoading) {
    let loadingMessage = 'Loading session details...';
    if (callStatus === 'waiting_permission') loadingMessage = 'Preparing session & requesting permissions...';
    if (callStatus === 'permission_granted') loadingMessage = 'Permissions granted, initializing connection...';
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,10rem)-var(--footer-height,10rem))]">
        <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-[hsl(var(--primary))]" />
        <p className="mt-4 text-base sm:text-lg font-playfair-display text-foreground/80">
          {loadingMessage}
        </p>
      </div>
    );
  }
  
  if (mediaPermissionsStatus === 'denied' || callStatus === 'error') {
     const title = mediaPermissionsStatus === 'denied' ? "Media Permissions Required" : "Session Error";
     let description = mediaPermissionsStatus === 'denied' 
        ? "Please grant permissions to your camera and/or microphone. You may need to adjust your browser settings."
        : "There was an issue with the session. Please try again or contact support.";
      if (mediaPermissionsStatus === 'denied' && determinedSessionType === 'audio') {
        description = "Please grant permissions to your microphone. You may need to adjust your browser settings.";
      }

     return (
      <div className="container mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        <PageTitle>
            {determinedSessionType === 'chat' ? 'Chat Session Issue' : 
             determinedSessionType === 'audio' ? 'Audio Session Issue' : 'Video Session Issue'}
        </PageTitle>
        <Alert variant="destructive" className="max-w-md mt-4 sm:mt-6">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/dashboard')} className="mt-6 sm:mt-8 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">Go to Dashboard</Button>
      </div>
    );
  }
  
  const SessionInfoBar = () => (
    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[hsl(var(--card)/0.7)] rounded-lg border border-[hsl(var(--border)/0.5)] shadow-md text-center">
      <p className="font-alex-brush text-2xl sm:text-3xl text-[hsl(var(--soulseer-header-pink))]">
        {determinedSessionType.charAt(0).toUpperCase() + determinedSessionType.slice(1)} Session with {opponent?.name || 'Participant'}
      </p>
      {(callStatus === 'connected' || (callStatus === 'ended' && sessionData?.startedAt)) && (
        <p className="font-playfair-display text-xl sm:text-2xl text-[hsl(var(--accent))] mt-1 sm:mt-2">
          Session Time: {formatTime(sessionTimer)}
        </p>
      )}
      {callStatus === 'connecting' && isMediaSession && (
        <p className="font-playfair-display text-base sm:text-lg text-foreground/80 mt-1 sm:mt-2 animate-pulse">
          Attempting to connect to {opponent?.name || 'participant'}...
        </p>
      )}
      {callStatus === 'waiting_permission' && isMediaSession && (
         <p className="font-playfair-display text-base sm:text-lg text-foreground/80 mt-1 sm:mt-2">
          Waiting for media permissions...
        </p>
      )}
       {callStatus === 'disconnected' && (
        <p className="font-playfair-display text-base sm:text-lg text-destructive mt-1 sm:mt-2">
          Connection lost. Attempting to reconnect...
        </p>
      )}
    </div>
  );

  const VideoFeedCard = ({ userType, videoRef, isLocal, mediaStream, photoURL, name }: { 
    userType: 'Your View' | 'Remote View', 
    videoRef: React.RefObject<HTMLVideoElement> | null, 
    isLocal: boolean,
    mediaStream: MediaStream | null, // Pass the stream directly
    photoURL?: string | null,
    name?: string | null,
  }) => {
    const isVideoCurrentlyOn = isLocal ? !isVideoOff : !remoteVideoActuallyOff;
    const showVideoElement = determinedSessionType === 'video' && isVideoCurrentlyOn && mediaStream && mediaStream.getVideoTracks().some(t => t.enabled && !t.muted);
    const showAvatar = (determinedSessionType !== 'video' || !isVideoCurrentlyOn || !mediaStream || mediaStream.getVideoTracks().every(t => !t.enabled || t.muted));
    
    const currentName = isLocal ? (currentUser?.name || 'You') : (name || 'Participant');

    return (
      <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl relative overflow-hidden w-full">
        <CardHeader className="py-2 px-3 sm:py-3 sm:px-4">
          <CardTitle className="text-base sm:text-lg font-alex-brush text-[hsl(var(--soulseer-header-pink))]">
            {userType} ({currentName}) {determinedSessionType === 'audio' && "(Audio Only)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-3">
          <div className="aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center relative">
            {determinedSessionType === 'video' && <video ref={videoRef} className={`w-full h-full object-cover ${showVideoElement ? 'block' : 'hidden'}`} autoPlay playsInline muted={isLocal} />}
            {showAvatar && (
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 text-4xl sm:text-5xl md:text-6xl">
                <AvatarImage src={photoURL || undefined} alt={currentName || 'User'} />
                <AvatarFallback className="bg-muted text-muted-foreground">{getInitials(currentName)}</AvatarFallback>
              </Avatar>
            )}
            {(!isLocal && callStatus === 'connecting' && isMediaSession && !peerConnectionRef.current?.currentRemoteDescription) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-2">
                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 animate-spin text-[hsl(var(--primary))]"/>
                    <p className="mt-2 sm:mt-3 text-white font-playfair-display text-xs sm:text-sm text-center">Connecting to {opponent?.name || 'participant'}...</p>
                </div>
            )}
            {isLocal && isMediaSession && mediaPermissionsStatus === 'granted' && !mediaStream && callStatus !== 'connecting' && callStatus !== 'connected' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-2">
                    <p className="text-white font-playfair-display text-xs sm:text-sm text-center">Local media stream not available.</p>
                </div>
            )}
            {isLocal && isVideoOff && determinedSessionType === 'video' && (
                 <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-playfair-display">Video Off</div>
            )}
            {isLocal && isMuted && isMediaSession && (
                 <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-playfair-display">Muted</div>
            )}
             {!isLocal && remoteVideoActuallyOff && determinedSessionType === 'video' && callStatus === 'connected' && (
                 <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-playfair-display">{opponent?.name || 'Participant'}&apos;s Video Off</div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };
  

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8 md:py-12">
      <SessionInfoBar />
      
      <div className={`grid grid-cols-1 ${isMediaSession ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-4 sm:gap-6 items-start`}>
        {isMediaSession && (
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <VideoFeedCard 
                    userType="Your View" 
                    videoRef={localVideoRef} 
                    isLocal={true} 
                    mediaStream={localStreamRef.current}
                    photoURL={currentUser?.photoURL}
                    name={currentUser?.name}
                />
                <VideoFeedCard 
                    userType="Remote View" 
                    videoRef={remoteVideoRef} 
                    isLocal={false} 
                    mediaStream={remoteVideoRef.current?.srcObject as MediaStream || null}
                    photoURL={opponent?.photoURL}
                    name={opponent?.name}
                />
            </div>
        )}

        <Card className={`lg:col-span-${isMediaSession ? '1' : '3'} bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl flex flex-col ${determinedSessionType === 'chat' && !isMediaSession ? 'h-[calc(80vh-var(--header-height)-var(--footer-height)-7rem)] min-h-[400px]' : 'max-h-[calc(var(--video-card-height,300px)*1.5)] sm:max-h-[calc(var(--video-card-height,350px)*1.5)]'} w-full`}>
          <CardHeader className="py-2 px-3 sm:py-3 sm:px-4">
            <CardTitle className="text-base sm:text-lg md:text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] flex items-center"><MessageSquare className="mr-2 h-4 w-4 sm:h-5 sm:w-5"/> Session Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className={`${determinedSessionType === 'chat' && !isMediaSession ? 'h-[calc(100%-110px)]' : 'h-[200px] sm:h-[250px] md:h-[300px] lg:h-[calc(100%-70px)]'} p-2 sm:p-3 md:p-4`}>
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`mb-2 sm:mb-3 p-2 sm:p-3 rounded-lg max-w-[85%] shadow-sm ${msg.senderUid === currentUser?.uid ? 'ml-auto bg-[hsl(var(--primary)/0.3)] text-right' : 'mr-auto bg-[hsl(var(--muted))] text-left'}`}>
                  <p className="text-xs text-muted-foreground font-semibold">{msg.senderName} <span className="text-xs opacity-70 ml-1">{msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span></p>
                  <p className="text-sm font-playfair-display text-foreground/90 break-words whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
               {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground font-playfair-display py-4 flex flex-col items-center justify-center h-full">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 mb-2 sm:mb-3 text-muted-foreground/50" />
                  No messages yet.
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <form onSubmit={handleSendMessage} className="p-2 sm:p-3 md:p-4 border-t border-[hsl(var(--border)/0.5)] flex gap-2 items-center">
            <Input 
              type="text" 
              placeholder="Type your message..." 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="bg-input text-foreground flex-grow h-9 sm:h-10 text-sm"
              disabled={callStatus !== 'connected'}
            />
            <Button type="submit" size="icon" className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0" disabled={callStatus !== 'connected' || !chatInput.trim()}>
              <Send className="h-4 w-4 sm:h-5 sm:w-5"/>
            </Button>
          </form>
        </Card>
      </div>

      <div className="mt-6 sm:mt-8 flex flex-wrap justify-center items-center gap-2 sm:gap-3 md:gap-4">
        { isMediaSession && (
            <Button 
                onClick={toggleMute} 
                variant="outline" 
                size="default" 
                className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] px-3 py-2 sm:px-4" 
                disabled={(callStatus !== 'connected' && callStatus !== 'connecting') || !localStreamRef.current?.getAudioTracks().length || mediaPermissionsStatus !== 'granted'}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
            {isMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />} 
            <span className="ml-1 sm:ml-2 font-playfair-display text-xs sm:text-sm hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
            </Button>
        )}
        { determinedSessionType === 'video' && ( 
            <Button 
                onClick={toggleVideo} 
                variant="outline" 
                size="default" 
                className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] px-3 py-2 sm:px-4" 
                disabled={(callStatus !== 'connected' && callStatus !== 'connecting') || !localStreamRef.current?.getVideoTracks().length || mediaPermissionsStatus !== 'granted'}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
            {isVideoOff ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />} 
            <span className="ml-1 sm:ml-2 font-playfair-display text-xs sm:text-sm hidden sm:inline">{isVideoOff ? 'Video On' : 'Video Off'}</span>
            </Button>
        )}
        <Button 
            onClick={() => handleHangUp(false)} 
            variant="destructive" 
            size="default" 
            className="px-3 py-2 sm:px-4" 
            disabled={callStatus === 'ended' || callStatus === 'error'} // Disable if already ended or errored
            title="End Session"
        >
          <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" /> <span className="ml-1 sm:ml-2 font-playfair-display text-xs sm:text-sm">End Session</span>
        </Button>
      </div>

      {callStatus === 'ended' && sessionData?.status === 'ended' && (
        <Alert className="mt-6 sm:mt-8 max-w-md mx-auto bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)]">
            <CheckCircle className="h-5 w-5 text-green-500"/>
            <AlertTitle className="font-alex-brush text-lg sm:text-xl text-[hsl(var(--soulseer-header-pink))]">Session Ended</AlertTitle>
            <AlertDescription className="font-playfair-display text-sm sm:text-base text-foreground/80">
                The session has concluded. Total time: {formatTime(sessionData.totalMinutes ? sessionData.totalMinutes * 60 : sessionTimer)}.
                {/* Billing info placeholder: Amount charged: $XX.XX */}
            </AlertDescription>
             <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Back to Dashboard</Button>
        </Alert>
      )}
    </div>
  );
};

export default VideoCallPage;

