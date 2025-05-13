'use client';

import React from 'react';
import { useWebRTC } from './WebRTCProvider';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface PostCallSummaryProps {
  sessionId: string;
}

const PostCallSummary: React.FC<PostCallSummaryProps> = ({ sessionId }) => {
  const { billingStatus, opponentInfo } = useWebRTC();
  const router = useRouter();
  
  // Format duration from minutes to HH:MM:SS
  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '00:00:00';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes * 60) % 60);
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format currency
  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };
  
  const handleReturnHome = () => {
    router.push('/');
  };
  
  const handleRequestAnotherReading = () => {
    if (opponentInfo?.uid) {
      router.push(`/request-reading/${opponentInfo.uid}`);
    } else {
      router.push('/readers');
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Session Summary</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-md">
          <h3 className="font-medium mb-2">Session Details</h3>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Reader:</div>
            <div>{opponentInfo?.name || 'Unknown'}</div>
            
            <div className="text-muted-foreground">Session ID:</div>
            <div className="truncate">{sessionId}</div>
            
            <div className="text-muted-foreground">Duration:</div>
            <div>{formatDuration(billingStatus.totalMinutes)}</div>
            
            <div className="text-muted-foreground">Rate:</div>
            <div>{formatCurrency(billingStatus.ratePerMinute)} per minute</div>
            
            <div className="text-muted-foreground">Total Charged:</div>
            <div className="font-medium">{formatCurrency(billingStatus.totalBilled)}</div>
          </div>
        </div>
        
        <div className="bg-primary/10 p-4 rounded-md">
          <h3 className="font-medium mb-2">Thank You</h3>
          <p className="text-sm">
            Thank you for using SoulSeer. We hope you enjoyed your session with {opponentInfo?.name || 'our reader'}.
            Your feedback helps us improve our service.
          </p>
        </div>
        
        {/* Optional: Rating/Feedback section could be added here */}
      </CardContent>
      
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-between">
        <Button variant="outline" onClick={handleReturnHome} className="w-full sm:w-auto">
          Return Home
        </Button>
        <Button onClick={handleRequestAnotherReading} className="w-full sm:w-auto">
          Request Another Reading
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PostCallSummary;