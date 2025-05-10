
'use client';

import 'webrtc-adapter'; // Import for side-effects (browser shimming)
import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { doc, setDoc, getDoc, onSnapshot, collection, addDoc, serverTimestamp, updateDoc, writeBatch, query, getDocs, deleteDoc, Timestamp, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { webrtcServersConfig } from '@/lib/webrtc/config';
import { getMediaPermissions, toggleMuteMedia, toggleVideoMedia, stopMediaStream } from '@/lib/webrtc/mediaHandler';
import { setupDataChannelEventsHandler } from '@/lib/webrtc/dataChannelHandler';

import { VideoFeed } from '@/components/session/VideoFeed';
import { ChatInterface } from '@/components/session/ChatInterface';
import { SessionControls } from '@/components/session/SessionControls';
import { SessionStatusDisplay } from '@/components/session/SessionStatusDisplay';

import type { AppUser } from '@/types/user';
import type { VideoSessionData, ChatMessage, CallRole, CallStatus, OpponentInfo } from '@/types/session';

const BILLING_INTERVAL_MS = 60000; // 1 minute for actual billing
// const BILLING_INTERVAL_MS = 10000; // 10 seconds for testing

const VideoCallPage: NextPage = () => {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const router = useRouter();
  const { currentUser, updateUserBalance } = useAuth();
  const { toast } = useToast();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  
  const [sessionData, setSessionData] = useState<VideoSessionData | null>(null);
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [mediaPermissionsStatus, setMediaPermissionsStatus] = useState<'prompt' | 'granted' | 'denied' | 'not_needed'>('prompt');
  const [callRole, setCallRole] = useState<CallRole>('unknown');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false); 
  const [remoteVideoActuallyOff, setRemoteVideoActuallyOff] = useState(true); 
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sessionTimer, setSessionTimer] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const billingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentAmountCharged, setCurrentAmountCharged] = useState(0);
  const [clientBalance, setClientBalance] = useState<number | undefined>(currentUser?.balance);

  const determinedSessionType = sessionData?.sessionType || 'chat'; 
  const isMediaSession = determinedSessionType === 'video' || determinedSessionType === 'audio';

  useEffect(() => {
    if (currentUser) {
        setClientBalance(currentUser.balance);
    }
  }, [currentUser]);


  // Effect to load session data and determine role
  useEffect(() => {
    if (!currentUser || !sessionId) return;
    setCallStatus('loading_session');
    const sessionDocRef = doc(db, 'videoSessions', sessionId);
    const unsubscribe = onSnapshot(sessionDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as VideoSessionData;
        if (data.status === 'cancelled' || data.status === 'ended') {
            if (callStatus !== 'ended') { // Avoid duplicate toasts if already ended locally
              toast({ title: 'Session Over', description: `This session has been ${data.status}.`});
              router.push('/dashboard');
            }
            return;
        }
        setSessionData(data);
        setCurrentAmountCharged(data.amountCharged || 0);

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
        if (callStatus === 'loading_session' || callStatus === 'idle') {
            setCallStatus('waiting_permission');
        }
      } else {
        toast({ variant: 'destructive', title: 'Session Not Found', description: 'This session does not exist or has been removed.' });
        setCallStatus('error');
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [currentUser, sessionId, router, toast, callStatus]);


  useEffect(() => {
    if (sessionData) {
      const type = sessionData.sessionType;
      if (type === 'audio') setIsVideoOff(true); 
      else if (type === 'chat') {
        setIsVideoOff(true);
        setIsMuted(true); 
      }
    }
  }, [sessionData]);

  // Effect for media permissions
  useEffect(() => {
    if (callStatus !== 'waiting_permission' || callRole === 'unknown' || !sessionData) return;

    const requestPermissions = async () => {
      const { stream, status } = await getMediaPermissions(
        sessionData.sessionType, 
        localVideoRef, 
        isMuted, 
        isVideoOff, 
        toast
      );
      setMediaPermissionsStatus(status);
      if (status === 'granted' && stream) {
        localStreamRef.current = stream;
        setCallStatus('permission_granted');
      } else if (status === 'not_needed') {
        setCallStatus('permission_granted');
      } else if (status === 'denied') {
        setCallStatus('error');
      }
    };
    requestPermissions();
  }, [callStatus, callRole, sessionData, toast, isMuted, isVideoOff]);


  // Effect for WebRTC connection setup and signaling
  useEffect(() => {
    if (!currentUser || !sessionId || callRole === 'unknown' || callStatus !== 'permission_granted' || !sessionData) {
      return;
    }

    setCallStatus('connecting');
    const pc = new RTCPeerConnection(webrtcServersConfig);
    peerConnectionRef.current = pc;

    if (localStreamRef.current && isMediaSession) {
        localStreamRef.current.getTracks().forEach(track => {
          try {
            pc.addTrack(track, localStreamRef.current!);
          } catch (e) {
            console.error("Error adding track:", e);
          }
        });
    }
    
    pc.ondatachannel = (event) => {
      dataChannelRef.current = setupDataChannelEventsHandler(event.channel, setChatMessages, toast);
    };

    if (isMediaSession) {
        pc.ontrack = event => {
          if (remoteVideoRef.current && event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            const videoTrack = event.streams[0].getVideoTracks()[0];
            if (videoTrack) {
              setRemoteVideoActuallyOff(!videoTrack.enabled); 
              videoTrack.onmute = () => { setRemoteVideoActuallyOff(true); };
              videoTrack.onunmute = () => { setRemoteVideoActuallyOff(false); };
            } else {
              setRemoteVideoActuallyOff(true); 
            }
          }
        };
    }
    
    pc.onconnectionstatechange = async () => {
      console.log("Connection state:", pc.connectionState);
      switch (pc.connectionState) {
        case 'connected':
          setCallStatus('connected');
          if (sessionData.status !== 'active' || !sessionData.startedAt) {
            // Placeholder: Check client balance before marking active
            const rate = sessionData.readerRatePerMinute || 0;
            if (callRole === 'callee' && typeof clientBalance === 'number' && clientBalance < rate) {
                toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Your balance is too low to start this session.' });
                await handleHangUp(false, 'ended_insufficient_funds');
                return;
            }
            await updateDoc(doc(db, 'videoSessions', sessionId), { status: 'active', startedAt: serverTimestamp() });
          }
          toast({title: "Connection Established", description: `Connected with ${opponent?.name || 'participant'}.`, variant: "default"});
          if (callRole === 'caller' && !dataChannelRef.current && peerConnectionRef.current) {
             const dc = peerConnectionRef.current.createDataChannel('chat');
             dataChannelRef.current = setupDataChannelEventsHandler(dc, setChatMessages, toast);
          }
          break;
        case 'disconnected': setCallStatus('disconnected'); toast({title: "Disconnected", variant: "destructive"}); break;
        case 'failed': setCallStatus('error'); toast({title: "Connection Failed", variant: "destructive"}); break;
        case 'closed': if (callStatus !== 'ended') console.log("Peer connection closed."); break;
        case 'connecting': setCallStatus('connecting'); break;
      }
    };

    const roomRef = doc(db, 'webrtcRooms', sessionId);
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');
    let iceCandidateListenersUnsub: Unsubscribe[] = [];

    pc.onicecandidate = event => {
      if (event.candidate) {
        const candidatesCollection = callRole === 'caller' ? callerCandidatesCollection : calleeCandidatesCollection;
        addDoc(candidatesCollection, event.candidate.toJSON()).catch(e => console.error("Error adding ICE candidate: ", e));
      }
    };

    let signalingUnsubscribes: Unsubscribe[] = [];

    const setupSignaling = async () => {
      try {
        const roomSnapshot = await getDoc(roomRef);

        if (callRole === 'caller') { 
          if (!roomSnapshot.exists()) { 
            await setDoc(roomRef, { createdAt: serverTimestamp(), creatorUid: currentUser.uid, sessionId: sessionId });
          }
          
          if (!dataChannelRef.current && peerConnectionRef.current) {
             dataChannelRef.current = setupDataChannelEventsHandler(peerConnectionRef.current.createDataChannel('chat'), setChatMessages, toast);
          }

          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);
          await updateDoc(roomRef, { offer: { sdp: offerDescription.sdp, type: offerDescription.type }});

          signalingUnsubscribes.push(onSnapshot(roomRef, (snapshot) => {
            const data = snapshot.data();
            if (data?.answer && (!pc.currentRemoteDescription || pc.currentRemoteDescription.type !== 'answer')) {
              pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(e => console.error("Caller: Error setting remote description (answer):", e));
            }
          }));
          iceCandidateListenersUnsub.push(onSnapshot(calleeCandidatesCollection, (snapshot) => {
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
            signalingUnsubscribes.push(onSnapshot(roomRef, async (snapshot) => {
                const data = snapshot.data();
                if (data?.offer && !pc.currentRemoteDescription && (!pc.localDescription || pc.localDescription.type !== 'answer')) { 
                    await handleOffer(data.offer);
                }
            }));
          }
          iceCandidateListenersUnsub.push(onSnapshot(callerCandidatesCollection, (snapshot) => {
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
      signalingUnsubscribes.forEach(unsub => unsub());
      iceCandidateListenersUnsub.forEach(unsub => unsub());
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
    };
  }, [currentUser, sessionId, callRole, callStatus, sessionData, toast, mediaPermissionsStatus, isMediaSession, clientBalance]);

  // Session Timer Effect
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
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (sessionData?.status !== 'active' && sessionData?.status !== 'pending' && sessionData?.startedAt && sessionData?.endedAt) {
        const elapsed = sessionData.endedAt.seconds - sessionData.startedAt.seconds;
        setSessionTimer(elapsed > 0 ? elapsed : 0);
      } else if (callStatus !== 'connected' && callStatus !== 'connecting') {
         setSessionTimer(0);
      }
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [callStatus, sessionData?.status, sessionData?.startedAt, sessionData?.endedAt]);

  // Billing Timer Effect
  useEffect(() => {
    if (callStatus === 'connected' && sessionData?.status === 'active' && callRole === 'callee' && currentUser && sessionData.readerRatePerMinute && typeof clientBalance === 'number') {
        if (billingIntervalRef.current) clearInterval(billingIntervalRef.current);

        const performBilling = async () => {
            const ratePerMinute = sessionData.readerRatePerMinute || 0;
            if (ratePerMinute <= 0) {
                console.warn("Reader rate is zero or not set, skipping billing cycle.");
                return;
            }

            const costForThisMinute = ratePerMinute;
            // Ensure clientBalance is up-to-date by fetching from context or state if possible.
            // For this example, we'll use the clientBalance state, assuming it's updated by AuthContext.
            const currentBalance = clientBalance;

            if (currentBalance < costForThisMinute) {
                toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Session ending due to low balance.' });
                await handleHangUp(false, 'ended_insufficient_funds');
                return;
            }

            const newBalance = currentBalance - costForThisMinute;
            await updateUserBalance(currentUser.uid, newBalance); // Update in AuthContext and Firestore
            setClientBalance(newBalance); // Update local state for UI

            const newTotalCharged = (currentAmountCharged || 0) + costForThisMinute;
            setCurrentAmountCharged(newTotalCharged);
            
            const sessionDocRef = doc(db, 'videoSessions', sessionId);
            await updateDoc(sessionDocRef, {
                amountCharged: newTotalCharged,
                // lastBilledAt: serverTimestamp() // Optional: track last billing time
            });

            toast({ title: 'Billed', description: `$${costForThisMinute.toFixed(2)} charged for the current minute.`});

            // Check for next minute
            if (newBalance < ratePerMinute) {
                toast({ variant: 'destructive', title: 'Low Balance Warning', description: 'Your balance is low. The session will end soon if not topped up.' });
            }
        };

        // Perform an initial billing for the first minute immediately
        performBilling(); 
        // Then set interval for subsequent minutes
        billingIntervalRef.current = setInterval(performBilling, BILLING_INTERVAL_MS);
    } else {
        if (billingIntervalRef.current) clearInterval(billingIntervalRef.current);
    }

    return () => { if (billingIntervalRef.current) clearInterval(billingIntervalRef.current); };
  }, [callStatus, sessionData, callRole, currentUser, clientBalance, updateUserBalance, toast, sessionId, currentAmountCharged, handleHangUp]);


  const handleHangUp = useCallback(async (isPageUnload = false, reason: VideoSessionData['status'] = 'ended') => {
    if (callStatus === 'ended') return;
    setCallStatus('ended');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (billingIntervalRef.current) clearInterval(billingIntervalRef.current);
    
    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    if (sessionId && currentUser) {
      const videoSessionDocRef = doc(db, 'videoSessions', sessionId);
      const currentSessionSnap = await getDoc(videoSessionDocRef);

      if (currentSessionSnap.exists()) {
        const currentSession = currentSessionSnap.data() as VideoSessionData;
        if(currentSession.status !== 'ended' && currentSession.status !== 'cancelled' && currentSession.status !== 'ended_insufficient_funds') {
            const endTime = Timestamp.now();
            let totalMinutes = 0;
            let finalAmountCharged = currentSession.amountCharged || 0;

            if (currentSession.startedAt) {
                const durationSeconds = endTime.seconds - currentSession.startedAt.seconds;
                totalMinutes = Math.ceil(durationSeconds / 60);
                setSessionTimer(durationSeconds > 0 ? durationSeconds : 0);
                
                // Final billing calculation if not already billed by interval.
                // This ensures even if call drops before a full minute interval, it's accounted for if needed by policy.
                // For strict per-minute: current logic relies on interval.
                // If partial minutes are billed, adjust here.
                // For now, we assume billing interval handled it, or amountCharged is final.
                 if (currentSession.readerRatePerMinute && totalMinutes > (currentSession.amountCharged || 0) / currentSession.readerRatePerMinute) {
                    // This logic is a bit simplistic if intervals are exact.
                    // Let's rely on currentAmountCharged as updated by the billing interval.
                    finalAmountCharged = currentAmountCharged;
                 }

            } else if (currentSession.totalMinutes) { 
                totalMinutes = currentSession.totalMinutes;
            }

            await updateDoc(videoSessionDocRef, { 
                status: reason, 
                endedAt: endTime, 
                totalMinutes,
                amountCharged: finalAmountCharged,
            });
        }
      }
      if (callRole === 'caller') { 
        const roomRef = doc(db, 'webrtcRooms', sessionId);
        try {
          const batch = writeBatch(db);
          const subcollections = ['callerCandidates', 'calleeCandidates'];
          for (const subcoll of subcollections) {
            const q = query(collection(roomRef, subcoll));
            const docsSnap = await getDocs(q);
            docsSnap.forEach(docSnapshot => batch.delete(docSnapshot.ref));
          }
          batch.delete(roomRef);
          await batch.commit();
        } catch (error) { console.error("Error cleaning up Firestore room:", error); }
      }
      if (!isPageUnload) {
        toast({ title: reason === 'ended_insufficient_funds' ? 'Session Ended: Insufficient Funds' : 'Session Ended' });
        router.push('/dashboard'); 
      }
    } else if (!isPageUnload) {
         router.push('/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentUser, callRole, router, toast, callStatus, currentAmountCharged]);

  useEffect(() => {
    const cleanup = () => { if (peerConnectionRef.current || localStreamRef.current || dataChannelRef.current) handleHangUp(true); };
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      // Only call hangup if session is not already considered 'ended' by other means (e.g. Firestore update)
      if (callStatus !== 'ended' && (peerConnectionRef.current || localStreamRef.current || dataChannelRef.current)) {
        handleHangUp(false);
      }
    };
  }, [handleHangUp, callStatus]);

  const handleToggleMute = () => {
    if (determinedSessionType === 'chat') return;
    setIsMuted(prev => toggleMuteMedia(localStreamRef.current, prev));
  };

  const handleToggleVideo = () => {
    if (determinedSessionType !== 'video') return;
    setIsVideoOff(prev => toggleVideoMedia(localStreamRef.current, localVideoRef, prev));
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8 md:py-12">
      <SessionStatusDisplay 
        sessionType={determinedSessionType}
        callStatus={callStatus}
        sessionTimer={sessionTimer}
        opponent={opponent}
        sessionData={sessionData}
        mediaPermissionsStatus={mediaPermissionsStatus}
        clientBalance={clientBalance}
        currentAmountCharged={currentAmountCharged}
      />
      
      <div className={`grid grid-cols-1 ${isMediaSession ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-4 sm:gap-6 items-start`}>
        {isMediaSession && (
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <VideoFeed 
              title="Your View" 
              videoRef={localVideoRef} 
              isLocal={true} 
              mediaStream={localStreamRef.current}
              userInfo={currentUser ? { name: currentUser.name, uid: currentUser.uid, photoURL: currentUser.photoURL } : null}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              sessionType={determinedSessionType}
              callStatus={callStatus}
            />
            <VideoFeed 
              title={`${opponent?.name || 'Participant'}'s View`}
              videoRef={remoteVideoRef} 
              isLocal={false} 
              mediaStream={remoteVideoRef.current?.srcObject as MediaStream || null}
              userInfo={opponent}
              isRemoteVideoOff={remoteVideoActuallyOff}
              sessionType={determinedSessionType}
              callStatus={callStatus}
            />
          </div>
        )}

        <ChatInterface
          messages={chatMessages}
          dataChannel={dataChannelRef.current}
          currentUser={currentUser}
          setChatMessages={setChatMessages}
          isMediaSession={isMediaSession}
          callStatus={callStatus}
        />
      </div>

      <SessionControls
        sessionType={determinedSessionType}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onHangUp={() => handleHangUp(false)}
        callStatus={callStatus}
        mediaPermissionsGranted={mediaPermissionsStatus === 'granted'}
        hasAudioTrack={!!localStreamRef.current?.getAudioTracks().length}
        hasVideoTrack={!!localStreamRef.current?.getVideoTracks().length}
      />
    </div>
  );
};

export default VideoCallPage;

