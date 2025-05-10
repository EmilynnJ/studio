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
        if (data.status === 'cancelled' || data.status === 'ended' || data.status === 'ended_insufficient_funds') {
            // Check current component callStatus to avoid redundant navigation or toasts if already handled
            if (callStatus !== 'ended' && callStatus !== 'error') { 
              toast({ title: 'Session Over', description: `This session has been ${data.status}. Redirecting to dashboard.`});
              router.push('/dashboard');
            }
            return;
        }
        setSessionData(data);
        setCurrentAmountCharged(data.amountCharged || 0);

        let determinedRole: CallRole = 'unknown';
        let opponentUid: string | null = null;

        if (currentUser.uid === data.readerUid) {
          determinedRole = 'caller'; // Reader initiates the actual WebRTC call setup after accepting
          opponentUid = data.clientUid;
        } else if (currentUser.uid === data.clientUid) {
          determinedRole = 'callee'; // Client waits for the reader to establish connection
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
          } else {
            console.warn(`Opponent document not found for UID: ${opponentUid}`);
            setOpponent({ name: 'Participant', uid: opponentUid, photoURL: null });
          }
        }
        // Transition to waiting for permissions if session is loaded and role determined
        if (callStatus === 'loading_session' || callStatus === 'idle') {
             if(data.status === 'pending' && determinedRole === 'caller') {
                // Reader is here but session still pending (client hasn't seen accepted_by_reader yet)
                // Or reader just accepted and navigated here.
                // Reader should proceed to set up the call.
                setCallStatus('waiting_permission');
             } else if (data.status === 'pending' && determinedRole === 'callee'){
                // Client is here, reader hasn't accepted or client hasn't received 'accepted_by_reader' yet
                // UI will show waiting for reader
             } else if (data.status === 'accepted_by_reader') {
                 setCallStatus('waiting_permission');
             } else if (data.status === 'active') {
                 setCallStatus('waiting_permission'); // Potentially rejoining an active session
             }
        }
      } else {
        toast({ variant: 'destructive', title: 'Session Not Found', description: 'This session does not exist or has been removed.' });
        setCallStatus('error');
        router.push('/');
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, sessionId, router, toast]); // Removed callStatus from deps to avoid loop on status change


  useEffect(() => {
    if (sessionData) {
      const type = sessionData.sessionType;
      if (type === 'audio') {
         setIsVideoOff(true); // Audio only sessions mean video is off
      } else if (type === 'chat') {
        setIsVideoOff(true); // Chat only sessions mean video is off
        setIsMuted(true); // and audio is muted
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
        isMuted, // Use current state of isMuted
        isVideoOff, // Use current state of isVideoOff
        toast
      );
      setMediaPermissionsStatus(status); // 'granted', 'denied', or 'not_needed'
      if (status === 'granted' && stream) {
        localStreamRef.current = stream;
        setCallStatus('permission_granted');
      } else if (status === 'not_needed') { // Chat session
        setCallStatus('permission_granted'); // Proceed to connection for chat
      } else if (status === 'denied') {
        setCallStatus('error'); // Error state, UI should reflect this
        toast({variant: 'destructive', title: 'Media Permissions Denied', description: 'Cannot proceed without media permissions for this session type.'});
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

    // Add local stream tracks if it's a media session
    if (localStreamRef.current && isMediaSession) {
        localStreamRef.current.getTracks().forEach(track => {
          try {
            pc.addTrack(track, localStreamRef.current!);
          } catch (e) {
            console.error("Error adding track:", e);
            toast({variant: 'destructive', title: 'WebRTC Error', description: 'Could not add media track.'});
          }
        });
    }
    
    // Setup data channel listener for incoming channels (callee side)
    pc.ondatachannel = (event) => {
      dataChannelRef.current = setupDataChannelEventsHandler(event.channel, setChatMessages, toast);
    };

    // Handle remote tracks
    if (isMediaSession) {
        pc.ontrack = event => {
          if (remoteVideoRef.current && event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            const videoTrack = event.streams[0].getVideoTracks()[0];
            if (videoTrack) {
              // Initial state of remote video based on track's enabled state
              setRemoteVideoActuallyOff(!videoTrack.enabled); 
              // Listen for changes (e.g. remote user toggles camera)
              videoTrack.onmute = () => setRemoteVideoActuallyOff(true);
              videoTrack.onunmute = () => setRemoteVideoActuallyOff(false);
            } else {
              // No video track implies remote video is off
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
            const currentClientBalance = clientBalanceRef.current;

            if (callRoleRef.current === 'callee' && typeof currentClientBalance === 'number' && currentClientBalance < rate && rate > 0) {
                toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Your balance is too low to start this session.' });
                await handleHangUp(false, 'ended_insufficient_funds');
                return;
            }
            await updateDoc(doc(db, 'videoSessions', sessionId), { status: 'active', startedAt: serverTimestamp() });
          }
          toast({title: "Connection Established", description: `Connected with ${opponentRef.current?.name || 'participant'}.`, variant: "default"});
          // Caller creates data channel if it doesn't exist (e.g. first time connecting)
          if (callRoleRef.current === 'caller' && !dataChannelRef.current && peerConnectionRef.current) {
             const dc = peerConnectionRef.current.createDataChannel('chat', {reliable: true});
             dataChannelRef.current = setupDataChannelEventsHandler(dc, setChatMessages, toast);
          }
          break;
        case 'disconnected': 
          setCallStatus('disconnected'); 
          toast({title: "Disconnected", description: "Connection lost. Attempting to reconnect...", variant: "destructive"}); 
          // Note: Robust reconnect logic (e.g., ICE restarts, re-signaling) can be complex.
          // The browser might attempt some reconnection automatically. For a custom flow, more logic would be needed here.
          break;
        case 'failed': 
          setCallStatus('error'); 
          toast({title: "Connection Failed", description: "Could not establish connection.", variant: "destructive"}); 
          await handleHangUp(false, 'ended'); // End session on hard failure
          break;
        case 'closed': 
          // Only log if not already handled by local hangup or session ending
          if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'error') {
            console.log("Peer connection closed unexpectedly.");
            setCallStatus('disconnected'); // Or 'ended' depending on desired behavior
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
        addDoc(candidatesCollection, event.candidate.toJSON()).catch(e => {
          console.error("Error adding ICE candidate: ", e);
          toast({variant: 'destructive', title: 'Signaling Error', description: 'Failed to send connection candidate.'});
        });
      }
    };

    let signalingUnsubscribes: Unsubscribe[] = [];
    
    // Refs for state values needed in async/callback contexts to avoid stale closures
    const callRoleRef = useRef(callRole);
    const sessionDataRef = useRef(sessionData);
    const clientBalanceRef = useRef(clientBalance);
    const opponentRef = useRef(opponent);
    const callStatusRef = useRef(callStatus);

    useEffect(() => { callRoleRef.current = callRole; }, [callRole]);
    useEffect(() => { sessionDataRef.current = sessionData; }, [sessionData]);
    useEffect(() => { clientBalanceRef.current = clientBalance; }, [clientBalance]);
    useEffect(() => { opponentRef.current = opponent; }, [opponent]);
    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);


    const setupSignaling = async () => {
      try {
        const roomSnapshot = await getDoc(roomRef);

        if (callRoleRef.current === 'caller') { 
          // Reader is caller: creates room if not exists, creates offer
          if (!roomSnapshot.exists()) { 
            await setDoc(roomRef, { createdAt: serverTimestamp(), creatorUid: currentUser.uid, sessionId: sessionId });
          }
          
          // Create data channel if it's the caller and channel doesn't exist
          if (!dataChannelRef.current && peerConnectionRef.current) {
             const dc = peerConnectionRef.current.createDataChannel('chat', {reliable: true});
             dataChannelRef.current = setupDataChannelEventsHandler(dc, setChatMessages, toast);
          }

          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);
          await updateDoc(roomRef, { offer: { sdp: offerDescription.sdp, type: offerDescription.type }});

          // Listen for answer from callee
          signalingUnsubscribes.push(onSnapshot(roomRef, (snapshot) => {
            const data = snapshot.data();
            if (data?.answer && (!pc.currentRemoteDescription || pc.currentRemoteDescription.type !== 'answer')) {
              pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(e => {
                console.error("Caller: Error setting remote description (answer):", e);
                toast({variant: 'destructive', title: 'Connection Error', description: 'Failed to process answer.'});
              });
            }
          }));
          // Listen for ICE candidates from callee
          iceCandidateListenersUnsub.push(onSnapshot(calleeCandidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.warn("Caller: Error adding ICE candidate (from callee):", e));
              }
            });
          }));

        } else if (callRoleRef.current === 'callee') { 
          // Client is callee: waits for offer, creates answer
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
            // If offer isn't there yet, listen for it
            signalingUnsubscribes.push(onSnapshot(roomRef, async (snapshot) => {
                const data = snapshot.data();
                // Ensure offer exists and we haven't already set a remote description or created an answer
                if (data?.offer && !pc.currentRemoteDescription && (!pc.localDescription || pc.localDescription.type !== 'answer')) { 
                    await handleOffer(data.offer);
                }
            }));
          }
          // Listen for ICE candidates from caller
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, sessionId, mediaPermissionsStatus, isMediaSession]); // Dependencies that trigger re-setup of WebRTC. callRole, sessionData, toast, clientBalance are used via refs.


  // Session Timer Effect
  useEffect(() => {
    const sessionDataCurrent = sessionDataRef.current;
    if (callStatusRef.current === 'connected' && sessionDataCurrent?.status === 'active' && sessionDataCurrent?.startedAt) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      const updateTimer = () => {
        const now = Timestamp.now();
        // Ensure startedAt is valid before calculation
        const startedAtSeconds = sessionDataRef.current?.startedAt?.seconds || now.seconds;
        const elapsed = now.seconds - startedAtSeconds;
        setSessionTimer(elapsed > 0 ? elapsed : 0);
      };
      updateTimer(); // Initial call
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      // If session ended, calculate final duration from Firestore timestamps if available
      if (sessionDataCurrent?.status !== 'active' && sessionDataCurrent?.status !== 'pending' && sessionDataCurrent?.startedAt && sessionDataCurrent?.endedAt) {
        const elapsed = sessionDataCurrent.endedAt.seconds - sessionDataCurrent.startedAt.seconds;
        setSessionTimer(elapsed > 0 ? elapsed : 0);
      } else if (callStatusRef.current !== 'connected' && callStatusRef.current !== 'connecting') {
         // Reset timer if not connected and not already ended with a calculated duration
         setSessionTimer(0);
      }
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [callStatus]); // Rerun when callStatus changes, sessionData is accessed via ref

  // Billing Timer Effect (Handles internal balance deduction)
  useEffect(() => {
    const sessionDataCurrent = sessionDataRef.current;
    const clientBalanceCurrent = clientBalanceRef.current;
    const currentUserCurrent = currentUser; // currentUser from AuthContext should be stable or cause parent re-render

    if (callStatusRef.current === 'connected' && sessionDataCurrent?.status === 'active' && callRoleRef.current === 'callee' && currentUserCurrent && sessionDataCurrent.readerRatePerMinute && typeof clientBalanceCurrent === 'number') {
        if (billingIntervalRef.current) clearInterval(billingIntervalRef.current);

        const performBilling = async () => {
            const ratePerMinute = sessionDataCurrent.readerRatePerMinute || 0;
            if (ratePerMinute <= 0) {
                console.warn("Reader rate is zero or not set, skipping billing cycle.");
                return;
            }

            const costForThisMinute = ratePerMinute;
            const currentBalance = clientBalanceRef.current; // Use ref for most up-to-date value

            if (typeof currentBalance !== 'number' || currentBalance < costForThisMinute) {
                toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Session ending due to low balance.' });
                await handleHangUp(false, 'ended_insufficient_funds');
                return;
            }

            const newBalance = currentBalance - costForThisMinute;
            await updateUserBalance(currentUserCurrent.uid, newBalance); // Update in AuthContext and Firestore
            // AuthContext will update clientBalance state, which updates clientBalanceRef.current via its own useEffect
            
            const newTotalCharged = (currentAmountChargedRef.current || 0) + costForThisMinute;
            setCurrentAmountCharged(newTotalCharged); // Updates state and ref via its own useEffect
            
            const sessionDocRef = doc(db, 'videoSessions', sessionId);
            await updateDoc(sessionDocRef, {
                amountCharged: newTotalCharged,
            });

            toast({ title: 'Billed', description: `$${costForThisMinute.toFixed(2)} charged for the current minute.`});

            if (newBalance < ratePerMinute) {
                toast({ variant: 'destructive', title: 'Low Balance Warning', description: 'Your balance is low. The session will end soon if not topped up.' });
            }
        };
        
        // Perform an initial billing for the first minute immediately upon connection and active status
        performBilling(); 
        billingIntervalRef.current = setInterval(performBilling, BILLING_INTERVAL_MS);
    } else {
        if (billingIntervalRef.current) clearInterval(billingIntervalRef.current);
    }

    return () => { if (billingIntervalRef.current) clearInterval(billingIntervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus, currentUser, sessionId, updateUserBalance, toast]); // Other states (sessionData, clientBalance, callRole) are accessed via refs


  const currentAmountChargedRef = useRef(currentAmountCharged);
  useEffect(() => { currentAmountChargedRef.current = currentAmountCharged; }, [currentAmountCharged]);

  const handleHangUp = useCallback(async (isPageUnload = false, reason: VideoSessionData['status'] = 'ended') => {
    if (callStatusRef.current === 'ended' || callStatusRef.current === 'error' && reason !== 'ended_insufficient_funds') return; // Avoid multiple hangup calls unless it's a specific new reason
    
    const previousCallStatus = callStatusRef.current;
    setCallStatus(reason === 'ended_insufficient_funds' ? 'error' : 'ended'); // Update status immediately

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (billingIntervalRef.current) clearInterval(billingIntervalRef.current);
    
    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current?.close(); // Close RTCPeerConnection
    peerConnectionRef.current = null;

    if (sessionId && currentUser) {
      const videoSessionDocRef = doc(db, 'videoSessions', sessionId);
      const currentSessionSnap = await getDoc(videoSessionDocRef);

      if (currentSessionSnap.exists()) {
        const currentSession = currentSessionSnap.data() as VideoSessionData;
        // Only update Firestore if the session wasn't already marked as ended/cancelled by another event
        if(currentSession.status !== 'ended' && currentSession.status !== 'cancelled' && currentSession.status !== 'ended_insufficient_funds') {
            const endTime = Timestamp.now();
            let totalMinutesCalculated = 0;
            let finalAmountCharged = currentAmountChargedRef.current; // Use the ref for the most accurate charge

            if (currentSession.startedAt) {
                const durationSeconds = endTime.seconds - currentSession.startedAt.seconds;
                totalMinutesCalculated = Math.ceil(durationSeconds / 60); // Calculate total minutes based on duration
                if (sessionTimer === 0 && previousCallStatus !== 'connected') { // If timer never really ran (e.g. quick hangup)
                    setSessionTimer(durationSeconds > 0 ? durationSeconds : 0);
                }
                // Ensure amount charged reflects at least one minute if session was active, even if very short
                // This depends on specific billing rules (e.g. minimum charge). Current logic bills per full minute interval.
                if (totalMinutesCalculated > 0 && finalAmountCharged === 0 && currentSession.readerRatePerMinute) {
                    // This case might occur if hangup happens before first billing interval but after connection.
                    // For simplicity, we rely on currentAmountCharged. Complex minimums would need more logic.
                }
            } else {
                 totalMinutesCalculated = currentSession.totalMinutes || 0;
            }


            await updateDoc(videoSessionDocRef, { 
                status: reason, 
                endedAt: endTime, 
                totalMinutes: totalMinutesCalculated,
                amountCharged: finalAmountCharged, // Final amount charged
            });
            // Update local sessionData to reflect the final state
            setSessionData(prev => prev ? ({...prev, status: reason, endedAt: endTime, totalMinutes: totalMinutesCalculated, amountCharged: finalAmountCharged}) : null);
        }
      }
      // Cleanup signaling room data (typically done by the caller/reader)
      if (callRoleRef.current === 'caller') { 
        const roomRef = doc(db, 'webrtcRooms', sessionId);
        try {
          const batch = writeBatch(db);
          const subcollections = ['callerCandidates', 'calleeCandidates'];
          for (const subcoll of subcollections) {
            const q = query(collection(roomRef, subcoll));
            const docsSnap = await getDocs(q);
            docsSnap.forEach(docSnapshot => batch.delete(docSnapshot.ref));
          }
          batch.delete(roomRef); // Delete the main room document
          await batch.commit();
        } catch (error) { console.error("Error cleaning up Firestore room:", error); }
      }
      if (!isPageUnload) {
        toast({ title: reason === 'ended_insufficient_funds' ? 'Session Ended: Low Balance' : 'Session Ended' });
        router.push('/dashboard'); 
      }
    } else if (!isPageUnload) {
         router.push('/'); // Fallback if no session/user
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentUser, router, toast]); // Callbacks and refs are used for other dependencies

  // Cleanup on unmount or page navigation
  useEffect(() => {
    const cleanup = (isUnloading = false) => { 
      if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'error') {
         handleHangUp(isUnloading);
      }
    };
    
    // Handle page unload (browser close/refresh)
    window.addEventListener('beforeunload', () => cleanup(true));
    
    // Handle Next.js route changes (component unmount)
    const handleRouteChange = () => {
        // Check if the session is still in a state that requires cleanup
        if (peerConnectionRef.current || localStreamRef.current || dataChannelRef.current) {
            if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'error') {
                // Don't pass true for isPageUnload, as this is a route change, not a browser unload
                // This allows toast and router.push to work if needed.
                handleHangUp(false); 
            }
        }
    };
    router.events?.on('routeChangeStart', handleRouteChange); // For older Next.js versions if needed

    return () => {
      window.removeEventListener('beforeunload', () => cleanup(true));
      router.events?.off('routeChangeStart', handleRouteChange);
      // Final cleanup if component unmounts for other reasons and session is still active
      cleanup(false); 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleHangUp, router.events]);


  const handleToggleMute = () => {
    if (determinedSessionType === 'chat' || !isMediaSession) return; // No mute for chat, or if not media session
    setIsMuted(prev => toggleMuteMedia(localStreamRef.current, prev));
  };

  const handleToggleVideo = () => {
    if (determinedSessionType !== 'video') return; // Only for video sessions
    setIsVideoOff(prev => toggleVideoMedia(localStreamRef.current, localVideoRef, prev));
  };

  // Render UI based on states
  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8 md:py-12">
      <SessionStatusDisplay 
        sessionType={determinedSessionType}
        callStatus={callStatus} // Pass current callStatus directly
        sessionTimer={sessionTimer}
        opponent={opponent}
        sessionData={sessionData} // Pass current sessionData
        mediaPermissionsStatus={mediaPermissionsStatus}
        clientBalance={clientBalance} // Pass current clientBalance
        currentAmountCharged={currentAmountCharged} // Pass current amount charged
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
              isRemoteVideoOff={remoteVideoActuallyOff} // Use state reflecting actual remote video status
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
        onHangUp={() => handleHangUp(false)} // Explicitly not a page unload
        callStatus={callStatus}
        mediaPermissionsGranted={mediaPermissionsStatus === 'granted' || mediaPermissionsStatus === 'not_needed'}
        hasAudioTrack={!!localStreamRef.current?.getAudioTracks().length}
        hasVideoTrack={!!localStreamRef.current?.getVideoTracks().length}
      />
    </div>
  );
};

export default VideoCallPage;
