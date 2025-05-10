import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>Terms of Service</PageTitle>
      <p className="text-center text-lg text-foreground/80 font-playfair-display max-w-2xl mx-auto mb-12">
        Welcome to SoulSeer. By accessing or using our platform, you agree to be bound by these Terms of Service. Please read them carefully.
      </p>

      <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-lg max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center gap-4 p-6 border-b border-[hsl(var(--border)/0.5)]">
          <ScrollText className="h-10 w-10 text-[hsl(var(--primary))]" />
          <CardTitle className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Agreement to Terms</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8 font-playfair-display text-foreground/80 leading-relaxed space-y-6">
          <section>
            <h2 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">1. Introduction</h2>
            <p>
              These Terms of Service ("Terms") govern your use of the SoulSeer website, mobile applications, and related services (collectively, the "Service") operated by SoulSeer Inc. ("us", "we", or "our"). Your access to and use of the Service is conditioned upon your acceptance of and compliance with these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">2. User Accounts</h2>
            <p>
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">3. Services and Disclaimer</h2>
            <p>
              SoulSeer provides a platform for users to connect with spiritual readers. The advice, information, or guidance provided by readers through the Service is for entertainment and informational purposes only. It is not a substitute for professional advice such as medical, legal, or financial counsel. SoulSeer does not guarantee the accuracy, completeness, or usefulness of any information provided by readers.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">4. User Conduct</h2>
            <p>
              You agree not to use the Service to: (a) upload, post, email, transmit, or otherwise make available any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, libelous, invasive of another's privacy, hateful, or racially, ethnically, or otherwise objectionable; (b) impersonate any person or entity...
            </p>
            <p className="mt-2">
              [Placeholder for more detailed User Conduct rules.]
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">5. Intellectual Property</h2>
            <p>
              The Service and its original content (excluding Content provided by users), features, and functionality are and will remain the exclusive property of SoulSeer Inc. and its licensors.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">6. Billing and Payments</h2>
            <p>
              Certain aspects of the Service may be provided for a fee or other charge. If you elect to use paid aspects of the Service, you agree to the pricing and payment terms, as we may update them from time to time. SoulSeer may add new services for additional fees and charges, or amend fees and charges for existing services, at any time in its sole discretion.
            </p>
             <p className="mt-2">
              [Placeholder for detailed Billing and Payment terms, including Stripe integration specifics.]
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">7. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">8. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-3">9. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us through our Help Center or at [support@soulseer.com].
            </p>
          </section>

          <p className="mt-8 text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
            [This is a placeholder. The full Terms of Service should be legally reviewed and comprehensive.]
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
