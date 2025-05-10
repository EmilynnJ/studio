
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
import { setupDataChannelEventsHandler, sendChatMessageViaDataChannel } from '@/lib/webrtc/dataChannelHandler';

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

  // Refs for state values needed in async/callback contexts to avoid stale closures
  const callRoleRef = useRef(callRole);
  const sessionDataRef = useRef(sessionData);
  const clientBalanceRef = useRef(clientBalance);
  const opponentRef = useRef(opponent);
  const callStatusRef = useRef(callStatus);
  const currentAmountChargedRef = useRef(currentAmountCharged);
  const isHangingUpRef = useRef(false); // Prevents multiple hangup executions

  useEffect(() => { callRoleRef.current = callRole; }, [callRole]);
  useEffect(() => { sessionDataRef.current = sessionData; }, [sessionData]);
  useEffect(() => { clientBalanceRef.current = clientBalance; }, [clientBalance]);
  useEffect(() => { opponentRef.current = opponent; }, [opponent]);
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
  useEffect(() => { currentAmountChargedRef.current = currentAmountCharged; }, [currentAmountCharged]);


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
        setSessionData(data); // Update local state first
        setCurrentAmountCharged(data.amountCharged || 0);

        if (data.status === 'cancelled' || data.status === 'ended' || data.status === 'ended_insufficient_funds') {
            if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'error') { 
              toast({ title: 'Session Over', description: `This session has been ${data.status}. Redirecting to dashboard.`});
              router.push('/dashboard');
            }
            return;
        }
        

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
        
        if (opponentUid && (!opponentRef.current || opponentRef.current.uid !== opponentUid)) {
          const userDoc = await getDoc(doc(db, 'users', opponentUid));
          if (userDoc.exists()) {
            const opponentData = userDoc.data() as AppUser;
            setOpponent({ name: opponentData.name || 'Participant', uid: opponentData.uid, photoURL: opponentData.photoURL });
          } else {
            setOpponent({ name: 'Participant', uid: opponentUid, photoURL: null });
          }
        }
        
        // Transition to waiting for permissions if session is loaded and role determined
        if (callStatusRef.current === 'loading_session' || callStatusRef.current === 'idle') {
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
  }, [currentUser, sessionId, router, toast]);


  useEffect(() => {
    if (sessionDataRef.current) {
      const type = sessionDataRef.current.sessionType;
      if (type === 'audio') {
         setIsVideoOff(true); 
      } else if (type === 'chat') {
        setIsVideoOff(true); 
        setIsMuted(true); 
      }
    }
  }, []); // Run once on initial sessionData load

  // Effect for media permissions
  useEffect(() => {
    if (callStatusRef.current !== 'waiting_permission' || callRoleRef.current === 'unknown' || !sessionDataRef.current) return;

    const requestPermissions = async () => {
      const { stream, status } = await getMediaPermissions(
        sessionDataRef.current!.sessionType, 
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
  }, [callStatus, isMuted, isVideoOff, toast]);


  // Effect for WebRTC connection setup and signaling
  useEffect(() => {
    if (!currentUser || !sessionId || callRoleRef.current === 'unknown' || callStatusRef.current !== 'permission_granted' || !sessionDataRef.current) {
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
          if (sessionDataRef.current && (sessionDataRef.current.status !== 'active' || !sessionDataRef.current.startedAt)) {
            const rate = sessionDataRef.current.readerRatePerMinute || 0;
            const currentClientBalance = clientBalanceRef.current; // Use ref

            if (callRoleRef.current === 'callee' && typeof currentClientBalance === 'number' && currentClientBalance < rate && rate > 0) {
                toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Your balance is too low to start this session.' });
                await handleHangUp(false, 'ended_insufficient_funds');
                return;
            }
            const sessionDocRef = doc(db, 'videoSessions', sessionId);
            // Update only if not already active (idempotency for reconnects)
            const currentSessionSnap = await getDoc(sessionDocRef);
            if (currentSessionSnap.exists() && currentSessionSnap.data().status !== 'active') {
                 await updateDoc(sessionDocRef, { status: 'active', startedAt: serverTimestamp() });
            }
          }
          toast({title: "Connection Established", description: `Connected with ${opponentRef.current?.name || 'participant'}.`, variant: "default"});
          if (callRoleRef.current === 'caller' && !dataChannelRef.current && peerConnectionRef.current) {
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
          await handleHangUp(false, 'ended'); 
          break;
        case 'closed': 
          if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'error' && !isHangingUpRef.current) {
            console.log("Peer connection closed unexpectedly.");
            setCallStatus('disconnected'); 
          }
          break;
        case 'connecting': setCallStatus('connecting'); break;
        default: console.log("Unhandled connection state:", pc.connectionState); break;
      }
    };

    const roomRef = doc(db, 'webrtcRooms', sessionId);
    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');
    let iceCandidateListenersUnsub: Unsubscribe[] = [];

    pc.onicecandidate = event => {
      if (event.candidate) {
        const candidatesCollection = callRoleRef.current === 'caller' ? callerCandidatesCollection : calleeCandidatesCollection;
        addDoc(candidatesCollection, event.candidate.toJSON()).catch(e => console.error("Error adding ICE candidate: ", e));
      }
    };

    let signalingUnsubscribes: Unsubscribe[] = [];
    
    const setupSignaling = async () => {
      try {
        const roomSnapshot = await getDoc(roomRef);

        if (callRoleRef.current === 'caller') { 
          if (!roomSnapshot.exists()) { 
            await setDoc(roomRef, { createdAt: serverTimestamp(), creatorUid: currentUser.uid, sessionId: sessionId });
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

        } else if (callRoleRef.current === 'callee') { 
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
  }, [currentUser, sessionId, isMediaSession, toast]); // Added toast, removed refs from deps


  // Session Timer Effect
  useEffect(() => {
    if (callStatusRef.current === 'connected' && sessionDataRef.current?.status === 'active' && sessionDataRef.current?.startedAt) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      const updateTimer = () => {
        const now = Timestamp.now();
        const startedAtSeconds = sessionDataRef.current?.startedAt?.seconds || now.seconds;
        const elapsed = now.seconds - startedAtSeconds;
        setSessionTimer(elapsed > 0 ? elapsed : 0);
      };
      updateTimer(); 
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (sessionDataRef.current?.status !== 'active' && sessionDataRef.current?.status !== 'pending' && sessionDataRef.current?.startedAt && sessionDataRef.current?.endedAt) {
        const elapsed = sessionDataRef.current.endedAt.seconds - sessionDataRef.current.startedAt.seconds;
        setSessionTimer(elapsed > 0 ? elapsed : 0);
      } else if (callStatusRef.current !== 'connected' && callStatusRef.current !== 'connecting') {
         setSessionTimer(0);
      }
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [callStatus]); 

  // Billing Timer Effect
  useEffect(() => {
    if (callStatusRef.current === 'connected' && sessionDataRef.current?.status === 'active' && callRoleRef.current === 'callee' && currentUser && sessionDataRef.current.readerRatePerMinute && typeof clientBalanceRef.current === 'number') {
        if (billingIntervalRef.current) clearInterval(billingIntervalRef.current);

        const performBilling = async () => {
            if (!sessionDataRef.current || !currentUser) return; // Guard clause
            const ratePerMinute = sessionDataRef.current.readerRatePerMinute || 0;
            if (ratePerMinute <= 0) return;

            const costForThisMinute = ratePerMinute;
            const currentBalance = clientBalanceRef.current; 

            if (typeof currentBalance !== 'number' || currentBalance < costForThisMinute) {
                toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Session ending due to low balance.' });
                await handleHangUp(false, 'ended_insufficient_funds');
                return;
            }

            const newBalance = currentBalance - costForThisMinute;
            await updateUserBalance(currentUser.uid, newBalance); 
            
            const newTotalCharged = (currentAmountChargedRef.current || 0) + costForThisMinute;
            setCurrentAmountCharged(newTotalCharged); 
            
            const sessionDocRef = doc(db, 'videoSessions', sessionId);
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
  }, [callStatus, currentUser, sessionId, updateUserBalance, toast]);


  const handleHangUp = useCallback(async (isPageUnload = false, reason: VideoSessionData['status'] = 'ended') => {
    if (isHangingUpRef.current) return; // Prevent multiple executions
    isHangingUpRef.current = true;
    
    const previousCallStatus = callStatusRef.current;
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

    if (sessionId && currentUser) {
      const videoSessionDocRef = doc(db, 'videoSessions', sessionId);
      try {
        await runTransaction(db, async (transaction) => {
            const currentSessionSnap = await transaction.get(videoSessionDocRef);
            if (!currentSessionSnap.exists()) {
                console.warn("Session document does not exist for hangup processing.");
                return;
            }
            const currentSession = currentSessionSnap.data() as VideoSessionData;
            
            if(currentSession.status === 'ended' || currentSession.status === 'cancelled' || currentSession.status === 'ended_insufficient_funds') {
                 console.log("Session already ended, no further updates needed for hangup:", currentSession.status);
                 // Update local state if it wasn't already matching
                 setSessionData(currentSession);
                 if(sessionTimer === 0 && currentSession.startedAt && currentSession.endedAt) {
                    const finalDuration = currentSession.endedAt.seconds - currentSession.startedAt.seconds;
                    setSessionTimer(finalDuration > 0 ? finalDuration : 0);
                 }
                 return; // Avoid re-processing if already in a final state
            }

            const endTime = Timestamp.now();
            let totalMinutesCalculated = currentSession.totalMinutes || 0;
            let finalAmountCharged = currentAmountChargedRef.current;

            if (currentSession.startedAt) {
                const durationSeconds = endTime.seconds - currentSession.startedAt.seconds;
                // If timer was running, use its value for more accurate duration in seconds before rounding up for minutes
                // Otherwise, calculate from Firestore timestamps
                const effectiveDurationSeconds = (previousCallStatus === 'connected' && sessionTimer > 0) ? sessionTimer : durationSeconds;
                
                totalMinutesCalculated = Math.ceil(effectiveDurationSeconds / 60); 
                
                if (sessionTimer === 0 && previousCallStatus !== 'connected' && durationSeconds > 0) { 
                    setSessionTimer(durationSeconds);
                }
                // Ensure billing for at least one minute if session was active and rate applies
                if (previousCallStatus === 'connected' && totalMinutesCalculated === 0 && currentSession.readerRatePerMinute && currentSession.readerRatePerMinute > 0) {
                    totalMinutesCalculated = 1;
                }
                 // If billing interval didn't run for the last partial minute but connection existed.
                if (previousCallStatus === 'connected' && totalMinutesCalculated > 0 && finalAmountCharged < totalMinutesCalculated * (currentSession.readerRatePerMinute || 0) && currentSession.readerRatePerMinute) {
                   // This scenario needs careful handling based on exact billing rules (e.g. charge for partial minute on hangup)
                   // For simplicity, we'll assume the currentAmountCharged from intervals is the source of truth,
                   // or if it's zero but minutes are >0, charge for 1 minute minimum if rate exists
                   if(finalAmountCharged === 0 && totalMinutesCalculated > 0 && currentSession.readerRatePerMinute > 0){
                       finalAmountCharged = currentSession.readerRatePerMinute;
                   }
                }

            } else if (reason !== 'cancelled' && reason !== 'pending') { // If no start time, but session was attempted and not just cancelled pre-start
                totalMinutesCalculated = 0; // Or some minimum if applicable
            }
            
            transaction.update(videoSessionDocRef, { 
                status: reason, 
                endedAt: endTime, 
                totalMinutes: totalMinutesCalculated,
                amountCharged: finalAmountCharged,
            });
            // Update local sessionData to reflect the final state immediately after transaction attempt
            setSessionData(prev => prev ? ({...prev, status: reason, endedAt: endTime, totalMinutes: totalMinutesCalculated, amountCharged: finalAmountCharged}) : null);
        });

      } catch (error) {
          console.error("Transaction failed for hangup:", error);
          // Fallback to a simple update if transaction fails
          try {
            const currentSessionSnapFallback = await getDoc(videoSessionDocRef);
            if (currentSessionSnapFallback.exists() && currentSessionSnapFallback.data().status !== 'ended' && currentSessionSnapFallback.data().status !== 'ended_insufficient_funds') {
                 const endTime = Timestamp.now();
                 let totalMinutesCalculated = sessionDataRef.current?.totalMinutes || 0;
                 if(sessionDataRef.current?.startedAt) totalMinutesCalculated = Math.ceil((endTime.seconds - sessionDataRef.current.startedAt.seconds) / 60);
                 
                 await updateDoc(videoSessionDocRef, { 
                    status: reason, 
                    endedAt: endTime, 
                    totalMinutes: totalMinutesCalculated,
                    amountCharged: currentAmountChargedRef.current,
                });
            }
          } catch (updateError) {
            console.error("Fallback update failed for hangup:", updateError);
          }
      }
      
      if (callRoleRef.current === 'caller') { 
        const roomDocRef = doc(db, 'webrtcRooms', sessionId);
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
        const finalReason = sessionDataRef.current?.status || reason; // Use updated sessionData status if available
        toast({ title: finalReason === 'ended_insufficient_funds' ? 'Session Ended: Low Balance' : 'Session Ended' });
        router.push('/dashboard'); 
      }
    } else if (!isPageUnload) {
         router.push('/'); 
    }
    // isHangingUpRef.current = false; // Reset after operations, or ensure it's reset if user stays on page post-error
  }, [sessionId, currentUser, router, toast, sessionTimer, updateUserBalance]); // Added sessionTimer and updateUserBalance for accurate calculations

  // Cleanup on unmount or page navigation
  useEffect(() => {
    const cleanup = (isUnloading = false) => { 
      if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'error' && !isHangingUpRef.current) {
         handleHangUp(isUnloading);
      }
    };
    
    window.addEventListener('beforeunload', () => cleanup(true));
    
    const handleRouteChange = () => {
        if (peerConnectionRef.current || localStreamRef.current || dataChannelRef.current) {
            if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'error' && !isHangingUpRef.current) {
                handleHangUp(false); 
            }
        }
    };
    // Next.js router events are not directly available in App Router for `routeChangeStart`.
    // Instead, useEffect's cleanup function on component unmount is the primary way for non-unload cleanup.
    
    return () => {
      window.removeEventListener('beforeunload', () => cleanup(true));
      // This cleanup runs when the component unmounts, e.g. due to route change.
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

