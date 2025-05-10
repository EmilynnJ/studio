'use client';

import 'webrtc-adapter'; // Import for side-effects (browser shimming)
import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { doc, setDoc, getDoc, onSnapshot, collection, addDoc, serverTimestamp, updateDoc, writeBatch, query, getDocs, deleteDoc, Timestamp, Unsubscribe, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { webrtcServersConfig } from '@/lib/webrtc/config';
import { getMediaPermissions, toggleMuteMedia, toggleVideoMedia, stopMediaStream } from '@/lib/webrtc/mediaHandler';
import { setupDataChannelEventsHandler } from '@/lib/webrtc/dataChannelHandler'; // Removed sendChatMessageViaDataChannel as it's part of ChatInterface now

import { VideoFeed } from '@/components/session/VideoFeed';
import { ChatInterface } from '@/components/session/ChatInterface';
import { SessionControls } from '@/components/session/SessionControls';
import { SessionStatusDisplay } from '@/components/session/SessionStatusDisplay';

import type { AppUser } from '@/types/user';
import type { VideoSessionData, ChatMessage, CallRole, CallStatus, OpponentInfo } from '@/types/session';

const BILLING_INTERVAL_MS = 60000; // 1 minute for actual billing

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
  const [currentAmountCharged, setCurrentAmountCharged] = useState(0);
  const [clientBalance, setClientBalance] = useState<number | undefined>(currentUser?.balance);

  // Refs for state values needed in async/callback contexts to avoid stale closures
  const stateRefs = useRef({
    callRole,
    sessionData,
    clientBalance,
    opponent,
    callStatus,
    currentAmountCharged,
    isHangingUp: false,
    sessionId,
    currentUser,
    chatMessages,
  });

  useEffect(() => {
    stateRefs.current = {
      callRole, sessionData, clientBalance, opponent, callStatus, currentAmountCharged, 
      isHangingUp: stateRefs.current.isHangingUp, // Preserve isHangingUp
      sessionId, currentUser, chatMessages,
    };
  }, [callRole, sessionData, clientBalance, opponent, callStatus, currentAmountCharged, sessionId, currentUser, chatMessages]);


  const determinedSessionType = sessionData?.sessionType || 'chat'; 
  const isMediaSession = determinedSessionType === 'video' || determinedSessionType === 'audio';

  useEffect(() => {
    if (currentUser) {
        setClientBalance(currentUser.balance);
    }
  }, [currentUser]);


  // Effect to load session data and determine role
  useEffect(() => {
    if (!stateRefs.current.currentUser || !stateRefs.current.sessionId) return;
    setCallStatus('loading_session');
    const sessionDocRef = doc(db, 'videoSessions', stateRefs.current.sessionId);

    const unsubscribe = onSnapshot(sessionDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as VideoSessionData;
        setSessionData(data);
        setCurrentAmountCharged(data.amountCharged || 0);

        if (data.status === 'cancelled' || data.status === 'ended' || data.status === 'ended_insufficient_funds') {
            if (stateRefs.current.callStatus !== 'ended' && stateRefs.current.callStatus !== 'error') { 
              toast({ title: 'Session Over', description: `This session has been ${data.status}. Redirecting to dashboard.`});
              router.push('/dashboard');
            }
            return;
        }
        
        let determinedRole: CallRole = 'unknown';
        let opponentUid: string | null = null;

        if (stateRefs.current.currentUser?.uid === data.readerUid) {
          determinedRole = 'caller'; 
          opponentUid = data.clientUid;
        } else if (stateRefs.current.currentUser?.uid === data.clientUid) {
          determinedRole = 'callee'; 
          opponentUid = data.readerUid;
        } else {
          toast({ variant: 'destructive', title: 'Unauthorized', description: 'You are not part of this session.' });
          setCallStatus('error');
          router.push('/');
          return;
        }
        setCallRole(determinedRole);
        
        if (opponentUid && (!stateRefs.current.opponent || stateRefs.current.opponent.uid !== opponentUid)) {
          const userDoc = await getDoc(doc(db, 'users', opponentUid));
          if (userDoc.exists()) {
            const opponentData = userDoc.data() as AppUser;
            setOpponent({ name: opponentData.name || 'Participant', uid: opponentData.uid, photoURL: opponentData.photoURL });
          } else {
            setOpponent({ name: 'Participant', uid: opponentUid, photoURL: null });
          }
        }
        
        if (stateRefs.current.callStatus === 'loading_session' || stateRefs.current.callStatus === 'idle') {
             if(data.status === 'pending' && determinedRole === 'caller') {
                setCallStatus('waiting_permission');
             } else if (data.status === 'pending' && determinedRole === 'callee'){
                // UI will show waiting for reader, SessionStatusDisplay handles this
             } else if (data.status === 'accepted_by_reader') {
                 setCallStatus('waiting_permission');
             } else if (data.status === 'active') {
                 setCallStatus('waiting_permission'); 
             }
        }
      } else {
        toast({ variant: 'destructive', title: 'Session Not Found', description: 'This session does not exist or has been removed.' });
        setCallStatus('error');
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router, toast]); // Dependencies: currentUser and sessionId are now via stateRefs within the effect

  useEffect(() => {
    if (stateRefs.current.sessionData) {
      const type = stateRefs.current.sessionData.sessionType;
      if (type === 'audio') setIsVideoOff(true); 
      else if (type === 'chat') {
        setIsVideoOff(true); 
        setIsMuted(true); 
      }
    }
  }, [sessionData?.sessionType]); // Depend on specific part of sessionData

  // Effect for media permissions
  useEffect(() => {
    if (stateRefs.current.callStatus !== 'waiting_permission' || stateRefs.current.callRole === 'unknown' || !stateRefs.current.sessionData) return;

    const requestPermissions = async () => {
      const { stream, status } = await getMediaPermissions(
        stateRefs.current.sessionData!.sessionType, 
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
        toast({variant: 'destructive', title: 'Media Permissions Denied', description: 'Cannot proceed without media permissions for this session type.'});
      }
    };
    requestPermissions();
  }, [callStatus, isMuted, isVideoOff, toast]); // isMuted, isVideoOff are direct state dependencies


  // Effect for WebRTC connection setup and signaling
  useEffect(() => {
    if (!stateRefs.current.currentUser || !stateRefs.current.sessionId || stateRefs.current.callRole === 'unknown' || stateRefs.current.callStatus !== 'permission_granted' || !stateRefs.current.sessionData) {
      return;
    }

    setCallStatus('connecting');
    const pc = new RTCPeerConnection(webrtcServersConfig);
    peerConnectionRef.current = pc;

    if (localStreamRef.current && isMediaSession) {
        localStreamRef.current.getTracks().forEach(track => {
          try {
            pc.addTrack(track, localStreamRef.current!);
          } catch (e) { console.error("Error adding track:", e); }
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
              videoTrack.onmute = () => setRemoteVideoActuallyOff(true);
              videoTrack.onunmute = () => setRemoteVideoActuallyOff(false);
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
          if (stateRefs.current.sessionData && (stateRefs.current.sessionData.status !== 'active' || !stateRefs.current.sessionData.startedAt)) {
            const rate = stateRefs.current.sessionData.readerRatePerMinute || 0;
            const currentClientBalance = stateRefs.current.clientBalance;

            if (stateRefs.current.callRole === 'callee' && typeof currentClientBalance === 'number' && currentClientBalance < rate && rate > 0) {
                toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Your balance is too low to start this session.' });
                // Use the callback version of handleHangUp to ensure fresh stateRefs are used if needed
                handleHangUp(false, 'ended_insufficient_funds');
                return;
            }
            const sessionDocRef = doc(db, 'videoSessions', stateRefs.current.sessionId);
            const currentSessionSnap = await getDoc(sessionDocRef);
            if (currentSessionSnap.exists() && currentSessionSnap.data().status !== 'active') {
                 await updateDoc(sessionDocRef, { status: 'active', startedAt: serverTimestamp() });
            }
          }
          toast({title: "Connection Established", description: `Connected with ${stateRefs.current.opponent?.name || 'participant'}.`, variant: "default"});
          if (stateRefs.current.callRole === 'caller' && !dataChannelRef.current && peerConnectionRef.current) {
             const dc = peerConnectionRef.current.createDataChannel('chat', {reliable: true});
             dataChannelRef.current = setupDataChannelEventsHandler(dc, setChatMessages, toast);
          }
          break;
        case 'disconnected': 
          setCallStatus('disconnected'); 
          toast({title: "Disconnected", description: "Connection lost. Attempting to reconnect...", variant: "destructive"}); 
          break;
        case 'failed': 
          setCallStatus('error'); 
          toast({title: "Connection Failed", description: "Could not establish connection.", variant: "destructive"}); 
          handleHangUp(false, 'ended'); 
          break;
        case 'closed': 
          if (stateRefs.current.callStatus !== 'ended' && stateRefs.current.callStatus !== 'error' && !stateRefs.current.isHangingUp) {
            console.log("Peer connection closed unexpectedly.");
            setCallStatus('disconnected'); 
          }
          break;
        case 'connecting': setCallStatus('connecting'); break;
        default: console.log("Unhandled connection state:", pc.connectionState); break;
      }
    };

    const roomRef = doc(db, 'webrtcRooms', stateRefs.current.sessionId);
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');
    let iceCandidateListenersUnsub: Unsubscribe[] = [];

    pc.onicecandidate = event => {
      if (event.candidate) {
        const candidatesCollection = stateRefs.current.callRole === 'caller' ? callerCandidatesCollection : calleeCandidatesCollection;
        addDoc(candidatesCollection, event.candidate.toJSON()).catch(e => console.error("Error adding ICE candidate: ", e));
      }
    };

    let signalingUnsubscribes: Unsubscribe[] = [];
    
    const setupSignaling = async () => {
      try {
        const roomSnapshot = await getDoc(roomRef);

        if (stateRefs.current.callRole === 'caller') { 
          if (!roomSnapshot.exists() && stateRefs.current.currentUser) { 
            await setDoc(roomRef, { createdAt: serverTimestamp(), creatorUid: stateRefs.current.currentUser.uid, sessionId: stateRefs.current.sessionId });
          }
          
          if (!dataChannelRef.current && peerConnectionRef.current) {
             const dc = peerConnectionRef.current.createDataChannel('chat', {reliable: true});
             dataChannelRef.current = setupDataChannelEventsHandler(dc, setChatMessages, toast);
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
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.warn("Caller: Error adding ICE candidate (from callee):", e));
              }
            });
          }));

        } else if (stateRefs.current.callRole === 'callee') { 
          const handleOffer = async (offerData: RTCSessionDescriptionInit) => {
            if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
                console.warn("Cannot set remote offer in current signaling state:", pc.signalingState);
                return;
            }
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
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.warn("Callee: Error adding ICE candidate (from caller):", e));
              }
            });
          }));
        }
      } catch (err) {
        console.error("Signaling setup error:", err);
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
  }, [callStatus, isMediaSession, toast]); // Only direct state dependencies needed here if others are through refs


  // Session Timer Effect
  useEffect(() => {
    if (stateRefs.current.callStatus === 'connected' && stateRefs.current.sessionData?.status === 'active' && stateRefs.current.sessionData?.startedAt) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      const updateTimer = () => {
        const now = Timestamp.now();
        const startedAtSeconds = stateRefs.current.sessionData?.startedAt?.seconds || now.seconds;
        const elapsed = now.seconds - startedAtSeconds;
        setSessionTimer(elapsed > 0 ? elapsed : 0);
      };
      updateTimer(); 
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (stateRefs.current.sessionData?.status !== 'active' && stateRefs.current.sessionData?.status !== 'pending' && stateRefs.current.sessionData?.startedAt && stateRefs.current.sessionData?.endedAt) {
        const elapsed = stateRefs.current.sessionData.endedAt.seconds - stateRefs.current.sessionData.startedAt.seconds;
        setSessionTimer(elapsed > 0 ? elapsed : 0);
      } else if (stateRefs.current.callStatus !== 'connected' && stateRefs.current.callStatus !== 'connecting') {
         setSessionTimer(0);
      }
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [callStatus]); 

  // Billing Timer Effect
  useEffect(() => {
    if (stateRefs.current.callStatus === 'connected' && 
        stateRefs.current.sessionData?.status === 'active' && 
        stateRefs.current.callRole === 'callee' && 
        stateRefs.current.currentUser && 
        stateRefs.current.sessionData.readerRatePerMinute && 
        typeof stateRefs.current.clientBalance === 'number') {
        
        if (billingIntervalRef.current) clearInterval(billingIntervalRef.current);

        const performBilling = async () => {
            const { sessionData: currentSessionData, currentUser: currentCUser, clientBalance: currentCliBalance, currentAmountCharged: currentAmtCharged, sessionId: currentSessionId } = stateRefs.current;

            if (!currentSessionData || !currentCUser) return; 
            const ratePerMinute = currentSessionData.readerRatePerMinute || 0;
            if (ratePerMinute <= 0) return;

            const costForThisMinute = ratePerMinute;
            
            if (typeof currentCliBalance !== 'number' || currentCliBalance < costForThisMinute) {
                toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Session ending due to low balance.' });
                handleHangUp(false, 'ended_insufficient_funds');
                return;
            }

            const newBalance = currentCliBalance - costForThisMinute;
            await updateUserBalance(currentCUser.uid, newBalance); 
            
            const newTotalCharged = (currentAmtCharged || 0) + costForThisMinute;
            setCurrentAmountCharged(newTotalCharged); 
            
            const sessionDocRef = doc(db, 'videoSessions', currentSessionId);
            await updateDoc(sessionDocRef, { amountCharged: newTotalCharged });

            toast({ title: 'Billed', description: `$${costForThisMinute.toFixed(2)} charged for the current minute.`});

            if (newBalance < ratePerMinute) {
                toast({ variant: 'destructive', title: 'Low Balance Warning', description: 'Your balance is low. The session will end soon if not topped up.' });
            }
        };
        
        performBilling(); 
        billingIntervalRef.current = setInterval(performBilling, BILLING_INTERVAL_MS);
    } else {
        if (billingIntervalRef.current) clearInterval(billingIntervalRef.current);
    }

    return () => { if (billingIntervalRef.current) clearInterval(billingIntervalRef.current); };
  }, [callStatus, updateUserBalance, toast]);


  const handleHangUp = useCallback(async (isPageUnload = false, reason: VideoSessionData['status'] = 'ended') => {
    const currentRefs = stateRefs.current; // Capture current refs at the time of call
    if (currentRefs.isHangingUp) return;
    stateRefs.current.isHangingUp = true; // Mutate the ref directly
    
    const previousCallStatus = currentRefs.callStatus;
    setCallStatus(reason === 'ended_insufficient_funds' ? 'error' : 'ended'); 

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

    if (currentRefs.sessionId && currentRefs.currentUser) {
      const videoSessionDocRef = doc(db, 'videoSessions', currentRefs.sessionId);
      try {
        await runTransaction(db, async (transaction) => {
            const currentSessionSnap = await transaction.get(videoSessionDocRef);
            if (!currentSessionSnap.exists()) {
                console.warn("Session document does not exist for hangup processing.");
                return;
            }
            const currentDbSessionData = currentSessionSnap.data() as VideoSessionData;
            
            if(currentDbSessionData.status === 'ended' || currentDbSessionData.status === 'cancelled' || currentDbSessionData.status === 'ended_insufficient_funds') {
                 console.log("Session already ended, no further updates needed for hangup:", currentDbSessionData.status);
                 setSessionData(currentDbSessionData); // Sync local state
                 if(sessionTimer === 0 && currentDbSessionData.startedAt && currentDbSessionData.endedAt) {
                    const finalDuration = currentDbSessionData.endedAt.seconds - currentDbSessionData.startedAt.seconds;
                    setSessionTimer(finalDuration > 0 ? finalDuration : 0);
                 }
                 return;
            }

            const endTime = Timestamp.now();
            let totalMinutesCalculated = currentDbSessionData.totalMinutes || 0;
            let finalAmountCharged = currentRefs.currentAmountCharged; // Use amount charged from state ref

            if (currentDbSessionData.startedAt) {
                const durationSeconds = endTime.seconds - currentDbSessionData.startedAt.seconds;
                const effectiveDurationSeconds = (previousCallStatus === 'connected' && sessionTimer > 0) ? sessionTimer : durationSeconds;
                totalMinutesCalculated = Math.ceil(effectiveDurationSeconds / 60); 
                
                if (sessionTimer === 0 && previousCallStatus !== 'connected' && durationSeconds > 0) { 
                    setSessionTimer(durationSeconds);
                }
                if (previousCallStatus === 'connected' && totalMinutesCalculated === 0 && currentDbSessionData.readerRatePerMinute && currentDbSessionData.readerRatePerMinute > 0) {
                    totalMinutesCalculated = 1;
                }
                if(finalAmountCharged === 0 && totalMinutesCalculated > 0 && currentDbSessionData.readerRatePerMinute && currentDbSessionData.readerRatePerMinute > 0){
                   finalAmountCharged = currentDbSessionData.readerRatePerMinute * totalMinutesCalculated; // Bill for all calculated minutes if not already done
                }
            } else if (reason !== 'cancelled' && reason !== 'pending') {
                totalMinutesCalculated = 0;
            }
            
            const updatePayload: Partial<VideoSessionData> = { 
                status: reason, 
                endedAt: endTime, 
                totalMinutes: totalMinutesCalculated,
                amountCharged: finalAmountCharged,
            };
            transaction.update(videoSessionDocRef, updatePayload);
            setSessionData(prev => prev ? ({...prev, ...updatePayload } as VideoSessionData) : null);
        });

      } catch (error) {
          console.error("Transaction failed for hangup:", error);
          try {
            const currentSessionSnapFallback = await getDoc(videoSessionDocRef);
            if (currentSessionSnapFallback.exists() && currentSessionSnapFallback.data().status !== 'ended' && currentSessionSnapFallback.data().status !== 'ended_insufficient_funds') {
                 const endTime = Timestamp.now();
                 let totalMinutesCalculated = currentRefs.sessionData?.totalMinutes || 0;
                 if(currentRefs.sessionData?.startedAt) totalMinutesCalculated = Math.ceil((endTime.seconds - currentRefs.sessionData.startedAt.seconds) / 60);
                 
                 await updateDoc(videoSessionDocRef, { 
                    status: reason, 
                    endedAt: endTime, 
                    totalMinutes: totalMinutesCalculated,
                    amountCharged: currentRefs.currentAmountCharged,
                });
            }
          } catch (updateError) {
            console.error("Fallback update failed for hangup:", updateError);
          }
      }
      
      if (currentRefs.callRole === 'caller') { 
        const roomDocRef = doc(db, 'webrtcRooms', currentRefs.sessionId);
        try {
          const batch = writeBatch(db);
          const subcollections = ['callerCandidates', 'calleeCandidates'];
          for (const subcoll of subcollections) {
            const q = query(collection(roomDocRef, subcoll));
            const docsSnap = await getDocs(q);
            docsSnap.forEach(docSnapshot => batch.delete(docSnapshot.ref));
          }
          batch.delete(roomDocRef); 
          await batch.commit();
        } catch (error) { console.error("Error cleaning up Firestore room:", error); }
      }

      if (!isPageUnload) {
        const finalReason = stateRefs.current.sessionData?.status || reason;
        toast({ title: finalReason === 'ended_insufficient_funds' ? 'Session Ended: Low Balance' : 'Session Ended' });
        router.push('/dashboard'); 
      }
    } else if (!isPageUnload) {
         router.push('/'); 
    }
     // Reset isHangingUp after operations are complete or if an error occurs that halts further processing
     // Consider placing this in a finally block if the async operations were wrapped in try/catch/finally.
     // For now, setting it here means it's reset once the primary path completes.
     // If an early return due to error, ensure it's reset or handled.
     // This line may need to be moved depending on how errors are handled to ensure it always resets.
     // For now, this will reset after the main execution path.
     // stateRefs.current.isHangingUp = false; // Re-enable hangup if needed, or manage more carefully
  }, [router, toast, sessionTimer, updateUserBalance]); // sessionTimer, updateUserBalance are direct stateful deps

  // Cleanup on unmount or page navigation
  useEffect(() => {
    const cleanup = (isUnloading = false) => { 
      if (stateRefs.current.callStatus !== 'ended' && stateRefs.current.callStatus !== 'error' && !stateRefs.current.isHangingUp) {
         handleHangUp(isUnloading);
      }
    };
    
    window.addEventListener('beforeunload', () => cleanup(true));
    
    return () => {
      window.removeEventListener('beforeunload', () => cleanup(true));
      cleanup(false); 
    };
  }, [handleHangUp]);


  const handleToggleMute = () => {
    if (determinedSessionType === 'chat' || !isMediaSession) return; 
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
      
      <div className={`grid grid-cols-1 ${isMediaSession ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-4 sm:gap-6 items-start mt-4`}>
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
        mediaPermissionsGranted={mediaPermissionsStatus === 'granted' || mediaPermissionsStatus === 'not_needed'}
        hasAudioTrack={!!localStreamRef.current?.getAudioTracks().length}
        hasVideoTrack={!!localStreamRef.current?.getVideoTracks().length}
      />
    </div>
  );
};

export default VideoCallPage;
