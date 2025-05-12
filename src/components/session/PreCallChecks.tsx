'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWebRTC } from './WebRTCProvider';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface PreCallChecksProps {
  onReady: () => void;
  onCancel: () => void;
}

const PreCallChecks: React.FC<PreCallChecksProps> = ({ onReady, onCancel }) => {
  const { sessionType, localStream } = useWebRTC();
  const [cameraStatus, setCameraStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [micStatus, setMicStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [browserStatus, setBrowserStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Check browser compatibility
  useEffect(() => {
    const checkBrowserCompatibility = () => {
      const isWebRTCSupported = 
        navigator.mediaDevices && 
        navigator.mediaDevices.getUserMedia && 
        window.RTCPeerConnection;
      
      if (isWebRTCSupported) {
        setBrowserStatus('success');
      } else {
        setBrowserStatus('error');
        setErrorMessages(prev => ({
          ...prev,
          browser: 'Your browser does not support video calls. Please try Chrome, Firefox, or Safari.'
        }));
      }
    };
    
    checkBrowserCompatibility();
  }, []);
  
  // Check camera and microphone
  useEffect(() => {
    const checkMediaDevices = async () => {
      try {
        if (sessionType === 'video' || sessionType === 'audio') {
          // Check if we have access to required media
          if (localStream) {
            if (sessionType === 'video') {
              const hasVideoTracks = localStream.getVideoTracks().length > 0;
              if (hasVideoTracks) {
                setCameraStatus('success');
                
                // Set video source
                if (videoRef.current) {
                  videoRef.current.srcObject = localStream;
                }
              } else {
                setCameraStatus('error');
                setErrorMessages(prev => ({
                  ...prev,
                  camera: 'Camera access failed. Please check your camera and permissions.'
                }));
              }
            }
            
            const hasAudioTracks = localStream.getAudioTracks().length > 0;
            if (hasAudioTracks) {
              setMicStatus('success');
            } else {
              setMicStatus('error');
              setErrorMessages(prev => ({
                ...prev,
                mic: 'Microphone access failed. Please check your microphone and permissions.'
              }));
            }
          } else {
            if (sessionType === 'video') {
              setCameraStatus('error');
              setErrorMessages(prev => ({
                ...prev,
                camera: 'No media stream available. Please check your camera and permissions.'
              }));
            }
            
            setMicStatus('error');
            setErrorMessages(prev => ({
              ...prev,
              mic: 'No media stream available. Please check your microphone and permissions.'
            }));
          }
        } else {
          // For chat-only sessions, we don't need camera or mic
          setCameraStatus('success');
          setMicStatus('success');
        }
      } catch (error) {
        console.error('Error checking media devices:', error);
        if (sessionType === 'video') {
          setCameraStatus('error');
          setErrorMessages(prev => ({
            ...prev,
            camera: 'Error accessing camera. Please check your permissions.'
          }));
        }
        
        if (sessionType === 'video' || sessionType === 'audio') {
          setMicStatus('error');
          setErrorMessages(prev => ({
            ...prev,
            mic: 'Error accessing microphone. Please check your permissions.'
          }));
        }
      }
    };
    
    checkMediaDevices();
  }, [localStream, sessionType]);
  
  // Check network connectivity
  useEffect(() => {
    const checkNetworkConnectivity = async () => {
      try {
        // Simple network check - try to fetch a small resource
        const response = await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        if (response.ok) {
          setNetworkStatus('success');
        } else {
          setNetworkStatus('error');
          setErrorMessages(prev => ({
            ...prev,
            network: 'Network connectivity issues detected. Your connection may be unstable.'
          }));
        }
      } catch (error) {
        console.error('Network check failed:', error);
        setNetworkStatus('error');
        setErrorMessages(prev => ({
          ...prev,
          network: 'Network connectivity issues detected. Please check your internet connection.'
        }));
      }
    };
    
    checkNetworkConnectivity();
  }, []);
  
  // Check if all required checks passed
  const allChecksPassed = 
    browserStatus === 'success' && 
    networkStatus === 'success' && 
    (sessionType === 'chat' || (
      (sessionType === 'audio' || sessionType === 'video') && micStatus === 'success' &&
      (sessionType !== 'video' || cameraStatus === 'success')
    ));
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Pre-Call System Check</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Browser compatibility */}
        <div className="flex items-center justify-between">
          <span>Browser compatibility</span>
          {browserStatus === 'checking' ? (
            <span className="animate-pulse">Checking...</span>
          ) : browserStatus === 'success' ? (
            <CheckCircle className="text-green-500" />
          ) : (
            <XCircle className="text-red-500" />
          )}
        </div>
        
        {/* Network connectivity */}
        <div className="flex items-center justify-between">
          <span>Network connectivity</span>
          {networkStatus === 'checking' ? (
            <span className="animate-pulse">Checking...</span>
          ) : networkStatus === 'success' ? (
            <CheckCircle className="text-green-500" />
          ) : (
            <XCircle className="text-red-500" />
          )}
        </div>
        
        {/* Microphone (for audio and video sessions) */}
        {(sessionType === 'audio' || sessionType === 'video') && (
          <div className="flex items-center justify-between">
            <span>Microphone access</span>
            {micStatus === 'checking' ? (
              <span className="animate-pulse">Checking...</span>
            ) : micStatus === 'success' ? (
              <CheckCircle className="text-green-500" />
            ) : (
              <XCircle className="text-red-500" />
            )}
          </div>
        )}
        
        {/* Camera (for video sessions only) */}
        {sessionType === 'video' && (
          <div className="flex items-center justify-between">
            <span>Camera access</span>
            {cameraStatus === 'checking' ? (
              <span className="animate-pulse">Checking...</span>
            ) : cameraStatus === 'success' ? (
              <CheckCircle className="text-green-500" />
            ) : (
              <XCircle className="text-red-500" />
            )}
          </div>
        )}
        
        {/* Video preview (for video sessions only) */}
        {sessionType === 'video' && cameraStatus === 'success' && (
          <div className="mt-4">
            <p className="text-sm mb-2">Camera preview:</p>
            <div className="bg-black rounded-md overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
        
        {/* Error messages */}
        {Object.keys(errorMessages).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>System Check Failed</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-2">
                {Object.values(errorMessages).map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={onReady} 
          disabled={!allChecksPassed}
        >
          {allChecksPassed ? 'Start Session' : 'Checking...'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PreCallChecks;