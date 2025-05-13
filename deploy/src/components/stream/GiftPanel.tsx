
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift as GiftIcon, Sparkles } from 'lucide-react'; // Renamed Gift to GiftIcon to avoid conflict

interface GiftOption {
  id: string;
  name: string;
  icon: React.ReactNode; // e.g., an emoji or small SVG
  price: number; // in cents
  description: string;
}

const giftOptions: GiftOption[] = [
  { id: 'rose', name: 'Mystic Rose', icon: <Sparkles className="w-5 h-5 text-pink-400" />, price: 100, description: 'A single beautiful rose' },
  { id: 'crystal', name: 'Guiding Crystal', icon: <Sparkles className="w-5 h-5 text-purple-400" />, price: 500, description: 'A shimmering crystal shard' },
  { id: 'star', name: 'Cosmic Star', icon: <Sparkles className="w-5 h-5 text-yellow-400" />, price: 1000, description: 'A bright shooting star' },
  { id: 'elixir', name: 'Spirit Elixir', icon: <Sparkles className="w-5 h-5 text-teal-400" />, price: 2500, description: 'A bottle of pure energy' },
];

interface GiftPanelProps {
  sendGift: (giftData: { type: string; amount: number }) => Promise<void>;
  streamerName: string;
}

const GiftPanel: React.FC<GiftPanelProps> = ({ sendGift, streamerName }) => {
  const [selectedGift, setSelectedGift] = useState<GiftOption | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSendGift = async () => {
    if (!selectedGift) return;
    setIsSending(true);
    try {
      await sendGift({ type: selectedGift.name, amount: selectedGift.price });
      setSelectedGift(null); // Reset selection after sending
    } catch (error) {
      console.error("Failed to send gift from panel:", error);
      // Toast for error is handled in LiveStreamContainer
    } finally {
      setIsSending(false);
    }
  };
  
  const formatCurrency = (amountInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amountInCents / 100);
  };


  return (
    <Card className="bg-transparent border-0 shadow-none rounded-none border-t border-border/30">
      <CardHeader className="p-3">
        <CardTitle className="text-lg font-alex-brush text-[hsl(var(--soulseer-header-pink))] flex items-center">
          <GiftIcon className="mr-2 h-5 w-5" /> Send a Gift
        </CardTitle>
        <CardDescription className="text-xs font-playfair-display text-muted-foreground">
          Show your appreciation for {streamerName}!
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {giftOptions.map((gift) => (
            <Button
              key={gift.id}
              variant={selectedGift?.id === gift.id ? 'default' : 'outline'}
              className={`h-auto p-2 flex flex-col items-center justify-center text-center border-border/50 hover:bg-primary/10 ${selectedGift?.id === gift.id ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' : 'bg-card/70'}`}
              onClick={() => setSelectedGift(gift)}
            >
              <div className="mb-1">{gift.icon}</div>
              <span className="text-xs font-playfair-display font-medium">{gift.name}</span>
              <span className="text-xs text-muted-foreground">{formatCurrency(gift.price)}</span>
            </Button>
          ))}
        </div>
        {selectedGift && (
          <Button
            onClick={handleSendGift}
            disabled={isSending || !selectedGift}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSending ? 'Sending...' : `Send ${selectedGift.name} (${formatCurrency(selectedGift.price)})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default GiftPanel;
