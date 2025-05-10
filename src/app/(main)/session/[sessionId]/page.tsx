// Updated src/app/(main)/session/[sessionId]/page.tsx
'use client';

import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState, useCallback, FormEvent } from 'react';
import { doc, setDoc, getDoc, onSnapshot, collection, addDoc, serverTimestamp, updateDoc, writeBatch, query, getDocs, deleteDoc, orderBy, Timestamp, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Mic, MicOff, VideoOff, PhoneOff, Loader2, MessageSquare, Send, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/ui/page-title';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AppUser } from '@/types/user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const servers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
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
  status: 'pending' | 'active' | 'ended';
  requestedAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  sessionType?: SessionType;
  totalMinutes?: number; // For future billing
  amountCharged?: number; // For future billing
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
  const [isVideoOff, setIsVideoOff] = useState(false); // User-controlled video status
  const [remoteVideoActuallyOff, setRemoteVideoActuallyOff] = useState(true); // Reflects actual remote video state
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sessionTimer, setSessionTimer] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const determinedSessionType = sessionData?.sessionType || 'video';

  const isLoading = callStatus === 'idle' || callStatus === 'loading_session' || callStatus === 'waiting_permission' || callStatus === 'determining_role';
  const isMediaSession = determinedSessionType === 'video' || determinedSessionType === 'audio';


  // 1. Fetch Session Data and Determine Role
  useEffect(() => {
    if (!currentUser || !sessionId) return;
    setCallStatus('loading_session');
    const sessionDocRef = doc(db, 'videoSessions', sessionId);
    const unsubscribe = onSnapshot(sessionDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as VideoSessionData;
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
        setCallStatus('waiting_permission');
      } else {
        toast({ variant: 'destructive', title: 'Session Not Found', description: 'This session does not exist or has been removed.' });
        setCallStatus('error');
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [currentUser, sessionId, router, toast]);
  
  // Set initial Mute/VideoOff states based on sessionType
  useEffect(() => {
    if (sessionData) {
      const type = sessionData.sessionType || 'video';
      if (type === 'audio') {
        setIsVideoOff(true); // Start with video off for audio sessions
      } else if (type === 'chat') {
        setIsVideoOff(true);
        setIsMuted(true); 
      }
    }
  }, [sessionData]);


  // 2. Request Camera/Microphone Permissions based on sessionType
  useEffect(() => {
    if (callStatus !== 'waiting_permission' || callRole === 'unknown' || !sessionData) return;

    const getPermissions = async () => {
      const type = sessionData.sessionType || 'video';
      
      if (type === 'chat') {
        setMediaPermissionsStatus('not_needed');
        setCallStatus('permission_granted'); // Effectively, permission granted
        return;
      }

      let audioRequested = type === 'video' || type === 'audio';
      let videoRequested = type === 'video';

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioRequested, video: videoRequested });
        localStreamRef.current = stream;
        
        // Apply initial mute/video off state to the stream
        if (type === 'audio' || isVideoOff) { // if audio session OR user wants video off
            stream.getVideoTracks().forEach(track => track.enabled = false);
        }
        if (isMuted) {
            stream.getAudioTracks().forEach(track => track.enabled = false);
        }

        if (localVideoRef.current && stream.getVideoTracks().length > 0 && stream.getVideoTracks().some(t => t.enabled)) {
          localVideoRef.current.srcObject = stream;
        } else if (localVideoRef.current) {
          localVideoRef.current.srcObject = null; // Explicitly null if no active video track
        }
        setMediaPermissionsStatus('granted');
        setCallStatus('permission_granted');
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setMediaPermissionsStatus('denied');
        const permDeniedMessage = type === 'audio' ? 'Microphone access is required or was denied.' : 'Camera and/or microphone access is required or was denied.';
        toast({ variant: 'destructive', title: 'Permissions Denied', description: permDeniedMessage });
        setCallStatus('error'); // Or a specific permissions_denied status
      }
    };
    
    getPermissions();

    // No return cleanup here; stream is cleaned up in hangUp or unmount
  }, [callStatus, callRole, sessionData, toast, isMuted, isVideoOff]);

  // 3. WebRTC Setup, Signaling, and Connection Management
  useEffect(() => {
    if (!currentUser || !sessionId || callRole === 'unknown' || callStatus !== 'permission_granted' || !sessionData) {
      return;
    }

    if (sessionData.sessionType === 'chat') {
      setCallStatus('connected'); // Chat is "connected" once permissions are "not_needed" / "granted"
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
          pc.addTrack(track, localStreamRef.current!);
        });
    }

    pc.ontrack = event => {
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        // Check if the track is a video track and if it's enabled
        const videoTrack = event.streams[0].getVideoTracks()[0];
        if (videoTrack) {
          setRemoteVideoActuallyOff(!videoTrack.enabled);
          // Listen for changes in the enabled state of the remote video track
          videoTrack.onmute = () => setRemoteVideoActuallyOff(true);
          videoTrack.onunmute = () => setRemoteVideoActuallyOff(false);
        } else {
           setRemoteVideoActuallyOff(true); // No video track
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
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          setCallStatus('disconnected');
          // Optionally trigger hangUp or notify user
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
            if (!pc.currentRemoteDescription && data?.answer) {
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
          const handleOffer = async (offerData: any) => {
            if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') return; // Avoid race conditions
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
  }, [currentUser, sessionId, callRole, callStatus, sessionData, toast, mediaPermissionsStatus]);


  // 4. Chat functionality
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
  
  // 5. Session Timer
  useEffect(() => {
    if (callStatus === 'connected' && sessionData?.startedAt) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); 
      
      const updateTimer = () => {
        const now = Timestamp.now();
        const elapsed = now.seconds - (sessionData.startedAt?.seconds || now.seconds);
        setSessionTimer(elapsed > 0 ? elapsed : 0);
      };
      updateTimer(); // Initial set
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (callStatus !== 'connected' && callStatus !== 'connecting') {
        // If not connected or connecting, timer should be 0 unless it's from a previous ended session
        if (sessionData?.status !== 'ended') setSessionTimer(0);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [callStatus, sessionData?.startedAt, sessionData?.status]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };


  const handleHangUp = useCallback(async () => {
    if (callStatus === 'disconnected' || callStatus === 'ended') return; 

    const previousStatus = callStatus;
    setCallStatus('ended'); // Use 'ended' for user-initiated hangup
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    if (isMediaSession && peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
    }

    if (sessionId && currentUser) {
      const videoSessionDocRef = doc(db, 'videoSessions', sessionId);
      const currentSession = (await getDoc(videoSessionDocRef)).data() as VideoSessionData | undefined;
      let totalMinutes = 0;
      if (currentSession?.startedAt) {
        const endTime = Timestamp.now();
        totalMinutes = Math.ceil((endTime.seconds - currentSession.startedAt.seconds) / 60);
      }

      await updateDoc(videoSessionDocRef, { 
        status: 'ended', 
        endedAt: serverTimestamp(),
        totalMinutes: totalMinutes,
        // amountCharged: placeholder for Stripe logic
      });

      if (callRole === 'caller' && isMediaSession) { 
        const roomRef = doc(db, 'webrtcRooms', sessionId);
        try {
          const batch = writeBatch(db);
          const subcollections = ['callerCandidates', 'calleeCandidates', 'messages'];
          for (const subcoll of subcollections) {
            const q = query(collection(roomRef, subcoll));
            const docs = await getDocs(q);
            docs.forEach(docSnapshot => batch.delete(docSnapshot.ref));
          }
          batch.delete(roomRef);
          await batch.commit();
        } catch (error) {
          console.error("Error cleaning up Firestore room:", error);
        }
      }
      toast({ title: 'Session Ended', description: 'The session has been successfully ended.' });
    }
    router.push('/');
  }, [sessionId, currentUser, callRole, router, toast, callStatus, isMediaSession]);

  // Cleanup on component unmount (e.g. browser back button)
  useEffect(() => {
    return () => {
      if (callStatus !== 'ended' && callStatus !== 'error' && callStatus !== 'idle' && callStatus !== 'loading_session') {
        // If session is active/connecting and user navigates away, treat as hangup
        handleHangUp();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus]); // Only run if callStatus changes, to avoid calling hangup on every render. handleHangUp is memoized.


  const toggleMute = () => {
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      const newMutedState = !isMuted;
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
      });
      setIsMuted(newMutedState);
    }
  };

  const toggleVideo = () => {
    if (determinedSessionType !== 'video') return; // Only for video sessions
    if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
      const newVideoOffState = !isVideoOff;
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !newVideoOffState;
      });
      setIsVideoOff(newVideoOffState);
      if (newVideoOffState && localVideoRef.current) {
        localVideoRef.current.srcObject = null; // Clear video display
      } else if (!newVideoOffState && localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current; // Restore video display
      }
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  if (isLoading) {
    let loadingMessage = 'Loading session...';
    if (callStatus === 'waiting_permission') loadingMessage = 'Preparing session...';
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-[hsl(var(--primary))]" />
        <p className="mt-4 text-lg font-playfair-display text-foreground/80">
          {loadingMessage}
        </p>
      </div>
    );
  }
  
  if (mediaPermissionsStatus === 'denied' || callStatus === 'error') {
     const title = mediaPermissionsStatus === 'denied' ? "Permissions Required" : "Session Error";
     let description = mediaPermissionsStatus === 'denied' 
        ? "Please grant permissions to your camera and/or microphone. You may need to adjust your browser settings."
        : "There was an issue with the session. Please try again or contact support.";
      if (mediaPermissionsStatus === 'denied' && determinedSessionType === 'audio') {
        description = "Please grant permissions to your microphone. You may need to adjust your browser settings.";
      }

     return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        <PageTitle>
            {determinedSessionType === 'chat' ? 'Chat Session Issue' : 
             determinedSessionType === 'audio' ? 'Audio Session Issue' : 'Video Session Issue'}
        </PageTitle>
        <Alert variant="destructive" className="max-w-md mt-6">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-8 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">Go to Homepage</Button>
      </div>
    );
  }
  
  const SessionInfoBar = () => (
    <div className="mb-6 p-4 bg-[hsl(var(--card)/0.7)] rounded-lg border border-[hsl(var(--border)/0.5)] shadow-md text-center">
      <p className="font-alex-brush text-3xl text-[hsl(var(--soulseer-header-pink))]">
        {determinedSessionType.charAt(0).toUpperCase() + determinedSessionType.slice(1)} Session with {opponent?.name || 'Participant'}
      </p>
      {callStatus === 'connected' && (
        <p className="font-playfair-display text-2xl text-[hsl(var(--accent))] mt-2">
          Session Time: {formatTime(sessionTimer)}
        </p>
      )}
      {callStatus === 'connecting' && isMediaSession && (
        <p className="font-playfair-display text-lg text-foreground/80 mt-2 animate-pulse">
          Attempting to connect...
        </p>
      )}
       {callStatus === 'disconnected' && (
        <p className="font-playfair-display text-lg text-destructive mt-2">
          Connection lost. Attempting to reconnect or session may end.
        </p>
      )}
    </div>
  );

  const VideoFeedCard = ({ userType, videoRef, isLocal, streamActive, photoURL, name, isAudioOnlySession }: { 
    userType: 'Your View' | 'Remote View', 
    videoRef: React.RefObject<HTMLVideoElement> | null, 
    isLocal: boolean,
    streamActive: boolean,
    photoURL?: string | null,
    name?: string | null,
    isAudioOnlySession?: boolean,
  }) => {
    const showVideo = streamActive && videoRef?.current?.srcObject && ((isLocal && !isVideoOff) || (!isLocal && !remoteVideoActuallyOff)) && determinedSessionType === 'video';
    const showAvatar = !showVideo || isAudioOnlySession;
    const currentName = isLocal ? (currentUser?.name || 'You') : (name || 'Participant');

    return (
      <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl relative overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">
            {userType} ({currentName}) {isAudioOnlySession && determinedSessionType !== 'chat' && "(Audio Only)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center relative">
            {determinedSessionType === 'video' && <video ref={videoRef} className={`w-full h-full object-cover ${showVideo ? 'block' : 'hidden'}`} autoPlay playsInline muted={isLocal} />}
            {showAvatar && (
              <Avatar className="w-32 h-32 text-6xl">
                <AvatarImage src={photoURL || undefined} alt={currentName || 'User'} />
                <AvatarFallback className="bg-muted text-muted-foreground">{getInitials(currentName)}</AvatarFallback>
              </Avatar>
            )}
             {(!isLocal && callStatus === 'connecting' && isMediaSession && !peerConnectionRef.current?.currentRemoteDescription) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                    <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--primary))]"/>
                    <p className="mt-3 text-white font-playfair-display">Connecting to {opponent?.name || 'participant'}...</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };
  

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
      <SessionInfoBar />
      
      <div className={`grid grid-cols-1 ${isMediaSession ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 items-start`}>
        {isMediaSession && (
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <VideoFeedCard 
                    userType="Your View" 
                    videoRef={localVideoRef} 
                    isLocal={true} 
                    streamActive={!!localStreamRef.current}
                    photoURL={currentUser?.photoURL}
                    name={currentUser?.name}
                    isAudioOnlySession={determinedSessionType === 'audio'}
                />
                <VideoFeedCard 
                    userType="Remote View" 
                    videoRef={remoteVideoRef} 
                    isLocal={false} 
                    streamActive={!!remoteVideoRef.current?.srcObject}
                    photoURL={opponent?.photoURL}
                    name={opponent?.name}
                    isAudioOnlySession={determinedSessionType === 'audio'}
                />
            </div>
        )}

        <Card className={`lg:col-span-${isMediaSession ? '1' : '3'} bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl flex flex-col ${determinedSessionType === 'chat' ? 'min-h-[70vh]' : 'max-h-[calc(2*var(--video-card-height,350px)+1.5rem)]'}`}>
          <CardHeader>
            <CardTitle className="text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] flex items-center"><MessageSquare className="mr-2 h-5 w-5"/> Session Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className={`${determinedSessionType === 'chat' ? 'h-[calc(70vh-160px)]' : 'h-[calc(100%-70px)] sm:h-[calc(100%-70px)] md:h-[calc(100%-70px)] lg:h-[300px]'} p-4`}>
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`mb-3 p-3 rounded-lg max-w-[85%] shadow-sm ${msg.senderUid === currentUser?.uid ? 'ml-auto bg-[hsl(var(--primary)/0.3)] text-right' : 'mr-auto bg-[hsl(var(--muted))] text-left'}`}>
                  <p className="text-xs text-muted-foreground font-semibold">{msg.senderName} <span className="text-xs opacity-70 ml-1">{msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span></p>
                  <p className="text-sm font-playfair-display text-foreground/90 break-words whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
               {chatMessages.length === 0 && (
                <p className="text-center text-muted-foreground font-playfair-display py-4">No messages yet. Start chatting!</p>
              )}
            </ScrollArea>
          </CardContent>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-[hsl(var(--border)/0.5)] flex gap-2 items-center">
            <Input 
              type="text" 
              placeholder="Type your message..." 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="bg-input text-foreground flex-grow h-10"
              disabled={callStatus !== 'connected'}
            />
            <Button type="submit" size="icon" className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] h-10 w-10" disabled={callStatus !== 'connected' || !chatInput.trim()}>
              <Send className="h-5 w-5"/>
            </Button>
          </form>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap justify-center items-center gap-2 sm:gap-4">
        { isMediaSession && (
            <Button onClick={toggleMute} variant="outline" size="lg" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]" disabled={(callStatus !== 'connected' && callStatus !== 'connecting') || !localStreamRef.current?.getAudioTracks().length}>
            {isMuted ? <MicOff /> : <Mic />} <span className="ml-1 sm:ml-2 font-playfair-display hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
            </Button>
        )}
        { determinedSessionType === 'video' && ( 
            <Button onClick={toggleVideo} variant="outline" size="lg" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]" disabled={(callStatus !== 'connected' && callStatus !== 'connecting') || !localStreamRef.current?.getVideoTracks().length}>
            {isVideoOff ? <VideoOff /> : <Video />} <span className="ml-1 sm:ml-2 font-playfair-display hidden sm:inline">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
            </Button>
        )}
        <Button onClick={handleHangUp} variant="destructive" size="lg" disabled={callStatus === 'ended' || callStatus === 'idle' || callStatus === 'error' || callStatus === 'loading_session'}>
          <PhoneOff /> <span className="ml-1 sm:ml-2 font-playfair-display">End Session</span>
        </Button>
      </div>

      {callStatus === 'ended' && (
        <Alert className="mt-8 max-w-md mx-auto bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)]">
            <CheckCircle className="h-5 w-5 text-green-500"/>
            <AlertTitle className="font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Session Ended</AlertTitle>
            <AlertDescription className="font-playfair-display text-foreground/80">The session has concluded. Total time: {formatTime(sessionTimer)}.</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default VideoCallPage;
