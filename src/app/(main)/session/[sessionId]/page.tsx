'use client';

import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState, useCallback, FormEvent } from 'react';
import { doc, setDoc, getDoc, onSnapshot, collection, addDoc, serverTimestamp, updateDoc, writeBatch, query, getDocs, deleteDoc, orderBy, Timestamp, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Mic, MicOff, VideoOff, PhoneOff, Loader2, MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/ui/page-title';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AppUser } from '@/types/user';

const servers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

type CallRole = 'caller' | 'callee' | 'unknown'; // caller is Reader, callee is Client
type CallStatus = 'idle' | 'loading_session' | 'waiting_permission' | 'determining_role' | 'connecting' | 'connected' | 'disconnected' | 'error';

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
  const [opponent, setOpponent] = useState<Pick<AppUser, 'name' | 'uid'> | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [callRole, setCallRole] = useState<CallRole>('unknown');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sessionTimer, setSessionTimer] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isLoading = callStatus === 'idle' || callStatus === 'loading_session' || callStatus === 'waiting_permission' || callStatus === 'determining_role' || (callStatus === 'connecting' && !peerConnectionRef.current?.currentRemoteDescription);

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
          determinedRole = 'caller'; // Reader is caller
          opponentUid = data.clientUid;
        } else if (currentUser.uid === data.clientUid) {
          determinedRole = 'callee'; // Client is callee
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
            setOpponent({ name: opponentData.name || 'Participant', uid: opponentData.uid });
          }
        }
        // Proceed to permission request after role is known
        setCallStatus('waiting_permission');

      } else {
        toast({ variant: 'destructive', title: 'Session Not Found', description: 'This video session does not exist or has been removed.' });
        setCallStatus('error');
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [currentUser, sessionId, router, toast]);
  

  // 2. Request Camera/Microphone Permissions
  useEffect(() => {
    if (callStatus !== 'waiting_permission' || callRole === 'unknown') return;

    const getPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
        setCallStatus('connecting'); // Permissions granted, proceed to connect
      } catch (error) {
        console.error('Error accessing camera/microphone:', error);
        setHasCameraPermission(false);
        toast({ variant: 'destructive', title: 'Permissions Denied', description: 'Camera and microphone access is required.' });
        setCallStatus('error');
      }
    };
    getPermissions();
    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [callStatus, callRole, toast]);

  // 3. WebRTC Setup, Signaling, and Connection Management
  useEffect(() => {
    if (!currentUser || !sessionId || callRole === 'unknown' || hasCameraPermission !== true || callStatus !== 'connecting' || !sessionData) {
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
      }
    };
    
    pc.onconnectionstatechange = async () => {
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
        if (sessionData.status !== 'active') {
          await updateDoc(doc(db, 'videoSessions', sessionId), { status: 'active', startedAt: serverTimestamp() });
        }
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setCallStatus('disconnected');
      } else if (pc.connectionState === 'connecting') {
        setCallStatus('connecting');
      }
    };

    const roomRef = doc(db, 'webrtcRooms', sessionId);
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates'); // Reader's candidates
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates'); // Client's candidates

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

        if (callRole === 'caller') { // Reader is caller
          if (!roomSnapshot.exists()) { // Create room if it doesn't exist (reader is first)
            await setDoc(roomRef, { createdAt: serverTimestamp(), creatorUid: currentUser.uid });
          }
          
          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);
          await updateDoc(roomRef, { offer: { sdp: offerDescription.sdp, type: offerDescription.type }, creatorUid: currentUser.uid });

          // Listen for answer from callee (Client)
          unsubscribeSignalingCallbacks.push(onSnapshot(roomRef, (snapshot) => {
            const data = snapshot.data();
            if (!pc.currentRemoteDescription && data?.answer) {
              pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(e => console.error("Caller: Error setting remote description (answer):", e));
            }
          }));
          // Listen for ICE candidates from callee (Client)
          unsubscribeSignalingCallbacks.push(onSnapshot(calleeCandidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.error("Caller: Error adding ICE candidate (from callee):", e));
              }
            });
          }));

        } else if (callRole === 'callee') { // Client is callee
          if (roomSnapshot.exists() && roomSnapshot.data()?.offer) {
            const roomData = roomSnapshot.data();
            await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);
            await updateDoc(roomRef, { answer: { sdp: answerDescription.sdp, type: answerDescription.type }, calleeUid: currentUser.uid });

            // Listen for ICE candidates from caller (Reader)
            unsubscribeSignalingCallbacks.push(onSnapshot(callerCandidatesCollection, (snapshot) => {
              snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                  pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.error("Callee: Error adding ICE candidate (from caller):", e));
                }
              });
            }));
          } else {
            // Offer not found yet, callee should wait. Room listener above will handle it.
            console.log("Callee waiting for offer...");
             unsubscribeSignalingCallbacks.push(onSnapshot(roomRef, async (snapshot) => {
                const data = snapshot.data();
                if (data?.offer && !pc.currentRemoteDescription && !pc.localDescription?.sdp.includes('answer')) { // ensure not already processed
                    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                    const answerDescription = await pc.createAnswer();
                    await pc.setLocalDescription(answerDescription);
                    await updateDoc(roomRef, { answer: { sdp: answerDescription.sdp, type: answerDescription.type }, calleeUid: currentUser.uid });
                }
            }));
             unsubscribeSignalingCallbacks.push(onSnapshot(callerCandidatesCollection, (snapshot) => {
              snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                  pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.error("Callee: Error adding ICE candidate (from caller):", e));
                }
              });
            }));
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
      unsubscribeSignalingCallbacks.forEach(cb => cb());
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [currentUser, sessionId, callRole, hasCameraPermission, callStatus, sessionData, toast]);

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
    if (callStatus === 'connected') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); // Clear existing timer
      
      const updateTimer = () => setSessionTimer(prev => prev + 1);
      timerIntervalRef.current = setInterval(updateTimer, 1000);
      
      // If startedAt is available, calculate initial timer value
      if (sessionData?.startedAt) {
         const now = Timestamp.now();
         const secondsElapsed = now.seconds - sessionData.startedAt.seconds;
         setSessionTimer(secondsElapsed > 0 ? secondsElapsed : 0);
      } else {
         setSessionTimer(0); // Start from 0 if no startedAt
      }

    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [callStatus, sessionData?.startedAt]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };


  const handleHangUp = useCallback(async () => {
    if (callStatus === 'disconnected') return; // Already disconnected

    setCallStatus('disconnected');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach(track => track.stop());

    if (sessionId && currentUser) {
      const videoSessionDocRef = doc(db, 'videoSessions', sessionId);
      await updateDoc(videoSessionDocRef, { status: 'ended', endedAt: serverTimestamp() });

      // Only caller (Reader) cleans up the WebRTC room signaling data
      if (callRole === 'caller') { 
        const roomRef = doc(db, 'webrtcRooms', sessionId);
        try {
          const batch = writeBatch(db);
          const callerCandidatesQuery = query(collection(roomRef, 'callerCandidates'));
          const calleeCandidatesQuery = query(collection(roomRef, 'calleeCandidates'));
          
          const callerDocs = await getDocs(callerCandidatesQuery);
          callerDocs.forEach(docSnapshot => batch.delete(docSnapshot.ref));
          
          const calleeDocs = await getDocs(calleeCandidatesQuery);
          calleeDocs.forEach(docSnapshot => batch.delete(docSnapshot.ref));
          
          // Optionally delete chat messages, or keep them for record
          // const messagesQuery = query(collection(roomRef, 'messages'));
          // const messageDocs = await getDocs(messagesQuery);
          // messageDocs.forEach(docSnapshot => batch.delete(docSnapshot.ref));

          batch.delete(roomRef); // Delete the main WebRTC signaling room
          await batch.commit();
          toast({ title: 'Call Ended', description: 'Session data has been cleared.' });
        } catch (error) {
          console.error("Error cleaning up Firestore room:", error);
          toast({ variant: 'default', title: 'Call Ended', description: 'Session ended. Minor cleanup issue occurred.'});
        }
      } else {
          toast({ title: 'Call Ended' });
      }
    }
    router.push('/');
  }, [sessionId, currentUser, callRole, router, toast, callStatus]);

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
  
  // UI Rendering
  if (isLoading) {
    let loadingMessage = 'Loading session...';
    if (callStatus === 'waiting_permission') loadingMessage = 'Requesting permissions...';
    else if (callStatus === 'determining_role' || callStatus === 'loading_session') loadingMessage = 'Initializing session...';
    else if (callStatus === 'connecting') loadingMessage = `Connecting to ${opponent?.name || 'participant'}...`;

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
        : "There was an issue with the video session. Please try again or contact support.";
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
      <PageTitle>Video Session with {opponent?.name || 'Participant'}</PageTitle>
      {callStatus === 'connected' && <p className="text-center font-playfair-display text-2xl text-[hsl(var(--accent))] mb-4">Session Time: {formatTime(sessionTimer)}</p>}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl relative overflow-hidden">
            <CardHeader>
                <CardTitle className="text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Your View ({currentUser?.name})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="aspect-video bg-black rounded-md overflow-hidden">
                <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                </div>
            </CardContent>
            </Card>

            <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl relative overflow-hidden">
            <CardHeader>
                <CardTitle className="text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Remote View ({opponent?.name})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                <video ref={remoteVideoRef} className="w-full h-full object-cover" autoPlay playsInline />
                {(callStatus === 'connecting' && !peerConnectionRef.current?.currentRemoteDescription) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                        <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--primary))]"/>
                        <p className="mt-3 text-white font-playfair-display">Connecting...</p>
                    </div>
                )}
                {(callStatus === 'connected' && (!remoteVideoRef.current?.srcObject || remoteVideoRef.current?.readyState < 3 )) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                        <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--primary))]"/>
                        <p className="mt-3 text-white font-playfair-display">Waiting for video...</p>
                    </div>
                )}
                {callStatus !== 'connecting' && callStatus !== 'connected' && (!remoteVideoRef.current?.srcObject || remoteVideoRef.current?.readyState < 3) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                        <VideoOff className="h-12 w-12 text-muted-foreground"/>
                        <p className="mt-3 text-muted-foreground font-playfair-display">Remote video unavailable</p>
                    </div>
                )}
                </div>
            </CardContent>
            </Card>
        </div>

        {/* Chat Section */}
        <Card className="lg:col-span-1 bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl flex flex-col max-h-[calc(2*var(--video-card-height,350px)+1.5rem)]"> {/* Approx height of 2 video cards + gap */}
          <CardHeader>
            <CardTitle className="text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] flex items-center"><MessageSquare className="mr-2 h-5 w-5"/> Session Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className="h-[300px] md:h-[400px] p-4"> {/* Adjust height as needed */}
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`mb-3 p-2 rounded-lg max-w-[85%] ${msg.senderUid === currentUser?.uid ? 'ml-auto bg-[hsl(var(--primary)/0.3)] text-right' : 'mr-auto bg-[hsl(var(--muted))] text-left'}`}>
                  <p className="text-xs text-muted-foreground font-semibold">{msg.senderName} <span className="text-xs opacity-70 ml-1">{msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString() : ''}</span></p>
                  <p className="text-sm font-playfair-display text-foreground/90">{msg.text}</p>
                </div>
              ))}
               {chatMessages.length === 0 && (
                <p className="text-center text-muted-foreground font-playfair-display">No messages yet. Start chatting!</p>
              )}
            </ScrollArea>
          </CardContent>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-[hsl(var(--border)/0.5)] flex gap-2">
            <Input 
              type="text" 
              placeholder="Type your message..." 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="bg-input text-foreground flex-grow"
              disabled={callStatus !== 'connected'}
            />
            <Button type="submit" size="icon" className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" disabled={callStatus !== 'connected' || !chatInput.trim()}>
              <Send className="h-5 w-5"/>
            </Button>
          </form>
        </Card>
      </div>


      <div className="mt-8 flex justify-center space-x-2 sm:space-x-4">
        <Button onClick={toggleMute} variant="outline" size="lg" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]" disabled={callStatus !== 'connected' && callStatus !== 'connecting'}>
          {isMuted ? <MicOff /> : <Mic />} <span className="ml-1 sm:ml-2 font-playfair-display hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
        </Button>
        <Button onClick={toggleVideo} variant="outline" size="lg" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]" disabled={callStatus !== 'connected' && callStatus !== 'connecting'}>
          {isVideoOff ? <VideoOff /> : <Video />} <span className="ml-1 sm:ml-2 font-playfair-display hidden sm:inline">{isVideoOff ? 'Video On' : 'Video Off'}</span>
        </Button>
        <Button onClick={handleHangUp} variant="destructive" size="lg" disabled={callStatus === 'disconnected' || callStatus === 'idle' || callStatus === 'error'}>
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
