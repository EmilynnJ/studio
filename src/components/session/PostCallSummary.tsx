'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import type { VideoSessionData } from '@/types/session';

interface PostCallSummaryProps {
  sessionData: VideoSessionData;
}

const PostCallSummary: React.FC<PostCallSummaryProps> = ({ sessionData }) => {
  const router = useRouter();
  const { toast } = useToast();

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (rating < 1) {
      toast({
        variant: 'destructive',
        title: 'Rating required',
        description: 'Please select a star rating before submitting.',
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionData.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit feedback');
      }
      toast({
        variant: 'default',
        title: 'Thank you!',
        description: 'Your feedback has been submitted.',
      });
      router.push('/dashboard');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: err.message || 'Could not send feedback.',
      });
    } finally {
      setLoading(false);
    }
  };

  const chatMessages = (sessionData.chatHistory || sessionData.chat) ?? [];
  const previewMessages = Array.isArray(chatMessages) ? chatMessages.slice(-5) : [];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 bg-background">
      <h2 className="text-2xl font-semibold">Session Summary</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Time</p>
          <p className="text-lg font-medium">{sessionData.duration} minutes</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Amount Charged</p>
          <p className="text-lg font-medium">${sessionData.totalAmount}</p>
        </div>
      </div>

      {sessionData.transcriptUrl && (
        <div>
          <p className="text-sm text-muted-foreground">Transcript</p>
          <a
            href={sessionData.transcriptUrl}
            download
            className="text-primary hover:underline"
          >
            Download Transcript
          </a>
        </div>
      )}

      {previewMessages.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground">Chat Preview</p>
          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto p-2 border rounded">
            {previewMessages.map((msg: any) => (
              <div key={msg.id} className="flex flex-col">
                <span className="text-xs font-semibold">{msg.senderName}</span>
                <span className="text-sm">{msg.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm text-muted-foreground">Rate Your Experience</p>
        <div className="flex mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-1"
            >
              <Star
                size={24}
                className={
                  star <= rating ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                }
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Feedback (optional)</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="w-full mt-1 p-2 border rounded focus:outline-none focus:ring focus:ring-primary"
          placeholder="Write your feedback here..."
        />
      </div>

      <div className="flex space-x-4 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push('/dashboard')}
          className="flex-1"
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default PostCallSummary;
