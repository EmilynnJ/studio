'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface MediaDeviceStatus {
  hasCamera: boolean;
  hasMicrophone: boolean;
  cameraError?: string;
  microphoneError?: string;
}

interface PreCallChecksProps {
  deviceStatus: MediaDeviceStatus | null;
  onContinue: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const PreCallChecks: React.FC<PreCallChecksProps> = ({ deviceStatus, onContinue, onCancel, isLoading }) => {
  if (isLoading || !deviceStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-playfair-display text-foreground/80">Checking your devices...</p>
      </div>
    );
  }

  const canProceed = deviceStatus.hasCamera && deviceStatus.hasMicrophone;

  return (
    <Card className="w-full max-w-md mx-auto my-8 bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center">Device Check</CardTitle>
        <CardDescription className="font-playfair-display text-muted-foreground text-center">
          We need to ensure your camera and microphone are working.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 font-playfair-display">
        <div className={`flex items-center p-3 rounded-md ${deviceStatus.hasCamera ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
          {deviceStatus.hasCamera ? <CheckCircle className="h-5 w-5 text-green-500 mr-3" /> : <AlertTriangle className="h-5 w-5 text-destructive mr-3" />}
          <div>
            <p className={`font-semibold ${deviceStatus.hasCamera ? 'text-green-400' : 'text-destructive'}`}>Camera</p>
            <p className="text-sm text-muted-foreground">{deviceStatus.cameraError || (deviceStatus.hasCamera ? 'Ready' : 'Not detected or permission denied.')}</p>
          </div>
        </div>
        <div className={`flex items-center p-3 rounded-md ${deviceStatus.hasMicrophone ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
          {deviceStatus.hasMicrophone ? <CheckCircle className="h-5 w-5 text-green-500 mr-3" /> : <AlertTriangle className="h-5 w-5 text-destructive mr-3" />}
          <div>
            <p className={`font-semibold ${deviceStatus.hasMicrophone ? 'text-green-400' : 'text-destructive'}`}>Microphone</p>
            <p className="text-sm text-muted-foreground">{deviceStatus.microphoneError || (deviceStatus.hasMicrophone ? 'Ready' : 'Not detected or permission denied.')}</p>
          </div>
        </div>
        {!canProceed && (
            <p className="text-sm text-destructive text-center">Please ensure both camera and microphone are connected and permissions are granted in your browser settings.</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} className="font-playfair-display">Cancel</Button>
        <Button onClick={onContinue} disabled={!canProceed} className="font-playfair-display bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
          Continue to Session
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PreCallChecks;
