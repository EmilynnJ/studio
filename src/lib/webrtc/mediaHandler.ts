
import type { RefObject } from 'react';
import type { ToastSignature } from '@/hooks/use-toast'; // Assuming useToast returns specific type

export const getMediaPermissions = async (
  sessionType: 'video' | 'audio' | 'chat',
  localVideoRef: RefObject<HTMLVideoElement>,
  isMutedInitially: boolean,
  isVideoOffInitially: boolean,
  toast: ToastSignature 
): Promise<{ stream: MediaStream | null; status: 'granted' | 'denied' | 'not_needed' }> => {
  if (sessionType === 'chat') {
    return { stream: null, status: 'not_needed' };
  }

  const audioRequested = sessionType === 'video' || sessionType === 'audio';
  const videoRequested = sessionType === 'video';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: audioRequested, video: videoRequested });
    
    stream.getAudioTracks().forEach(track => track.enabled = !isMutedInitially);
    stream.getVideoTracks().forEach(track => track.enabled = !isVideoOffInitially);

    if (localVideoRef.current && sessionType === 'video' && stream.getVideoTracks().length > 0) {
      localVideoRef.current.srcObject = stream;
    } else if (localVideoRef.current) {
      // Ensure video element is cleared if not a video session or no video track
      localVideoRef.current.srcObject = null;
    }
    return { stream, status: 'granted' };
  } catch (error) {
    console.error('Error accessing media devices:', error);
    const permDeniedMessage = sessionType === 'audio' 
      ? 'Microphone access is required or was denied.' 
      : 'Camera and/or microphone access is required or was denied.';
    toast({ variant: 'destructive', title: 'Permissions Denied', description: permDeniedMessage });
    return { stream: null, status: 'denied' };
  }
};

export const toggleMuteMedia = (
  localStream: MediaStream | null,
  isMuted: boolean
): boolean => {
  if (localStream && localStream.getAudioTracks().length > 0) {
    const newMutedState = !isMuted;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !newMutedState;
    });
    return newMutedState;
  }
  return isMuted;
};

export const toggleVideoMedia = (
  localStream: MediaStream | null,
  localVideoRef: RefObject<HTMLVideoElement>,
  isVideoOff: boolean
): boolean => {
  if (localStream && localStream.getVideoTracks().length > 0) {
    const newVideoOffState = !isVideoOff;
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !newVideoOffState;
    });

    if (localVideoRef.current) {
      if (newVideoOffState) {
        localVideoRef.current.srcObject = null; // Clear video display
      } else {
        localVideoRef.current.srcObject = localStream; // Restore video display
      }
    }
    return newVideoOffState;
  }
  return isVideoOff;
};

export const stopMediaStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach(track => track.stop());
};
