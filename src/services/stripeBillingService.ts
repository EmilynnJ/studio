// src/services/stripeBillingService.ts

interface StripeBillingConfig {
  readerId: string;
  clientId: string;
  sessionId: string;
  ratePerMinute: number;
  clientBalance: number; // in cents
  readerAccountId: string; // Stripe Connect account ID for the reader
}

interface BillingStatus {
  startTime: number; // timestamp
  currentBalance: number; // in cents
  ratePerMinute: number; // in cents
  remainingMinutes: number;
  totalBilled?: number; // in cents
  totalMinutes?: number;
  endTime?: number; // timestamp
  reason?: string; // for session end
}

type BalanceUpdateCallback = (data: BillingStatus) => void;
type SessionEndCallback = (data: { reason: string }) => void;

class StripeBillingService {
  public sessionActive: boolean = false;
  public isPaused: boolean = false;
  private config: StripeBillingConfig | null = null;
  private timerId: NodeJS.Timeout | null = null;
  private currentBalance: number = 0;
  private ratePerMinute: number = 0;
  private totalBilledThisSession: number = 0;
  private minutesElapsedThisSession: number = 0;
  private sessionStartTime: number = 0;

  private onBalanceUpdateCallback: BalanceUpdateCallback | null = null;
  private onSessionEndCallback: SessionEndCallback | null = null;

  initialize(config: StripeBillingConfig) {
    this.config = config;
    this.currentBalance = config.clientBalance * 100; // Convert dollars to cents if needed, or ensure input is cents
    this.ratePerMinute = config.ratePerMinute * 100; // Convert dollars to cents
    console.log("StripeBillingService initialized", this.config);
  }

  onBalanceUpdate(callback: BalanceUpdateCallback) {
    this.onBalanceUpdateCallback = callback;
  }

  onSessionEnd(callback: SessionEndCallback) {
    this.onSessionEndCallback = callback;
  }

  startBilling(): { startTime: number } {
    if (!this.config || this.sessionActive) {
      throw new Error("Billing service not configured or session already active.");
    }
    this.sessionActive = true;
    this.isPaused = false;
    this.sessionStartTime = Date.now();
    this.totalBilledThisSession = 0;
    this.minutesElapsedThisSession = 0;

    // Initial check
    if (this.currentBalance < this.ratePerMinute) {
      this.endBilling('insufficient_funds_initial');
      return { startTime: this.sessionStartTime };
    }

    // Simulate billing every 60 seconds (or 5 for testing)
    const BILLING_INTERVAL = 60000; // 60 seconds for production
    // const BILLING_INTERVAL = 5000; // 5 seconds for testing

    this.timerId = setInterval(() => {
      if (!this.sessionActive || this.isPaused) return;

      this.currentBalance -= this.ratePerMinute;
      this.totalBilledThisSession += this.ratePerMinute;
      this.minutesElapsedThisSession += 1;

      const remainingMinutes = Math.floor(this.currentBalance / this.ratePerMinute);

      this.onBalanceUpdateCallback?.({
        startTime: this.sessionStartTime,
        currentBalance: this.currentBalance / 100, // convert back to dollars for display
        ratePerMinute: this.ratePerMinute / 100,
        remainingMinutes,
        totalBilled: this.totalBilledThisSession / 100,
        totalMinutes: this.minutesElapsedThisSession,
      });

      // Actual Stripe charge call to backend API
      fetch('/api/stripe/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: this.config.clientId,
          amount: this.ratePerMinute,
          sessionId: this.config.sessionId,
          transfer_data: {
            destination: this.config.readerAccountId, // Include reader's Stripe account for Connect payouts
          },
        }),
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Stripe charge failed:', errorData.error);
          this.endBilling('stripe_charge_failed');
        }
      }).catch((error) => {
        console.error('Stripe charge error:', error);
        this.endBilling('stripe_charge_error');
      });

      if (this.currentBalance !== null && this.ratePerMinute !== null && this.currentBalance < this.ratePerMinute) {
        this.endBilling('insufficient_funds');
      }
    }, BILLING_INTERVAL);

    console.log("Billing started for session:", this.config.sessionId);
    return { startTime: this.sessionStartTime };
  }

  pauseBilling() {
    if (!this.sessionActive || this.isPaused) return;
    this.isPaused = true;
    console.log("Billing paused for session:", this.config?.sessionId);
  }

  resumeBilling() {
    if (!this.sessionActive || !this.isPaused) return;
    this.isPaused = false;
    console.log("Billing resumed for session:", this.config?.sessionId);
  }

  endBilling(reason: string): { endTime: number; totalBilled: number; totalMinutes: number; reason: string } {
    if (!this.sessionActive) {
        return { endTime: Date.now(), totalBilled: this.totalBilledThisSession / 100, totalMinutes: this.minutesElapsedThisSession, reason };
    }
    this.sessionActive = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    const endTime = Date.now();
    this.onSessionEndCallback?.({ reason });
    console.log("Billing ended for session:", this.config?.sessionId, "Reason:", reason);
    return { 
        endTime, 
        totalBilled: this.totalBilledThisSession / 100, // convert back to dollars
        totalMinutes: this.minutesElapsedThisSession,
        reason 
    };
  }
}

export default StripeBillingService;
