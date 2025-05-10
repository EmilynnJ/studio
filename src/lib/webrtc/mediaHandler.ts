import type { RefObject } from 'react';
import type { ToastSignature } from '@/hooks/use-toast'; 
import type { SessionType } from '@/types/session';

export const getMediaPermissions = async (
  sessionType: SessionType,
  localVideoRef: RefObject<HTMLVideoElement>,
  isMutedInitially: boolean,
  isVideoOffInitially: boolean,
  toast: ToastSignature 
): Promise<{ stream: MediaStream | null; status: 'granted' | 'denied' | 'not_needed' }> => {
  if (sessionType === 'chat') {
    return { stream: null, status: 'not_needed' }; // No media needed for chat-only sessions
  }

  const constraints: MediaStreamConstraints = {};
  if (sessionType === 'audio' || sessionType === 'video') {
    constraints.audio = true;
  }
  if (sessionType === 'video') {
    constraints.video = true;
  }

  if (Object.keys(constraints).length === 0) { // Should not happen if sessionType is audio/video
    return { stream: null, status: 'not_needed'};
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Apply initial mute/video off states
    stream.getAudioTracks().forEach(track => track.enabled = !isMutedInitially);
    if (sessionType === 'video') {
      stream.getVideoTracks().forEach(track => track.enabled = !isVideoOffInitially);
    }


    if (localVideoRef.current && sessionType === 'video' && stream.getVideoTracks().length > 0 && !isVideoOffInitially) {
      localVideoRef.current.srcObject = stream;
    } else if (localVideoRef.current) {
      localVideoRef.current.srcObject = null; // Clear if not video or video initially off
    }
    return { stream, status: 'granted' };
  } catch (error: any) {
    console.error('Error accessing media devices:', error.name, error.message);
    let description = 'Could not access your camera and/or microphone. Please check permissions.';
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        description = "No camera or microphone found. Please ensure they are connected and enabled.";
    } else if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        description = sessionType === 'audio' 
            ? "Microphone access was denied. Please enable it in your browser settings."
            : "Camera and/or microphone access was denied. Please enable it in your browser settings.";
    } else if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
        description = "Your camera or microphone does not meet the required settings.";
    }
    
    toast({ variant: 'destructive', title: 'Media Access Error', description });
    return { stream: null, status: 'denied' };
  }
};

export const toggleMuteMedia = (
  localStream: MediaStream | null,
  isMuted: boolean // Current muted state
): boolean => { // Returns the new muted state
  if (localStream && localStream.getAudioTracks().length > 0) {
    const newMutedState = !isMuted;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !newMutedState; // track.enabled = false means muted
    });
    return newMutedState;
  }
  return isMuted; // Return current state if no stream or track
};

export const toggleVideoMedia = (
  localStream: MediaStream | null,
  localVideoRef: RefObject<HTMLVideoElement>,
  isVideoOff: boolean // Current video off state
): boolean => { // Returns the new video off state
  if (localStream && localStream.getVideoTracks().length > 0) {
    const newVideoOffState = !isVideoOff;
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !newVideoOffState; // track.enabled = false means video is off
    });

    // Update the video element display based on the new state
    if (localVideoRef.current) {
      if (newVideoOffState) {
        localVideoRef.current.srcObject = null; // Effectively hides the video feed
      } else {
        // Only re-assign srcObject if it's not already set or if the stream has changed.
        // This assumes localStream itself hasn't changed, only its tracks' enabled state.
        if (localVideoRef.current.srcObject !== localStream) {
            localVideoRef.current.srcObject = localStream;
        }
      }
    }
    return newVideoOffState;
  }
  return isVideoOff; // Return current state if no stream or track
};

export const stopMediaStream = (stream: MediaStream | null) => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};
