import { PageTitle } from '@/components/ui/page-title';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const faqItems = [
  {
    id: "general-1",
    question: "What is SoulSeer?",
    answer: "SoulSeer is an online platform connecting individuals seeking spiritual guidance with gifted readers. We offer various services like tarot readings, astrology consultations, clairvoyant insights, and more, all within a supportive community environment."
  },
  {
    id: "account-1",
    question: "How do I create an account?",
    answer: "Click on the 'Sign Up' button on our homepage or login page. You'll need to provide your name, email address, create a password, and select whether you're joining as a client or a reader. The process is quick and easy!"
  },
  {
    id: "readings-1",
    question: "How are readers vetted?",
    answer: "We have a thorough vetting process for all readers applying to SoulSeer. This includes reviewing their experience, specialties, and conducting sample readings to ensure they meet our standards for authenticity, professionalism, and ethical conduct."
  },
  {
    id: "readings-2",
    question: "Can I choose a specific reader?",
    answer: "Yes! You can browse reader profiles, view their specialties, ratings, and reviews to find a reader who resonates with you. You can then request a session directly from their profile."
  },
  {
    id: "billing-1",
    question: "What payment methods are accepted?",
    answer: "We accept major credit and debit cards through our secure payment processor, Stripe. All payment information is encrypted and handled securely."
  },
  {
    id: "billing-2",
    question: "Are there any free services?",
    answer: "While most readings are paid services, our community forum is free to join and participate in. Some readers may occasionally offer introductory promotions or free mini-readings during live stream events."
  },
  {
    id: "technical-1",
    question: "What do I need for a video reading?",
    answer: "For a video reading, you'll need a stable internet connection, a device with a camera and microphone (like a smartphone, tablet, or computer), and a compatible web browser. Our platform uses WEBRTC technology for secure video calls."
  },
  {
    id: "community-1",
    question: "How can I join the Discord or Patreon?",
    answer: "Links to our Discord server and Patreon page can be found in the footer of our website and often shared within the community forum. Joining these platforms can offer additional engagement and support options."
  }
];

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>Frequently Asked Questions</PageTitle>
      <p className="text-center text-lg text-foreground/80 font-playfair-display max-w-2xl mx-auto mb-12">
        Have questions? We&apos;ve compiled answers to some of the most common inquiries about SoulSeer.
      </p>

      <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
        {faqItems.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id} className="bg-[hsl(var(--card)/0.7)] border-[hsl(var(--border)/0.5)] rounded-md mb-3 shadow-md">
            <AccordionTrigger className="p-6 text-lg font-playfair-display text-foreground hover:no-underline hover:text-[hsl(var(--primary))] text-left">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-6 w-6 text-[hsl(var(--primary))] flex-shrink-0" />
                {faq.question}
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-6 pt-0 text-base text-foreground/80 font-playfair-display leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-16 text-center">
        <p className="text-lg text-foreground/90 font-playfair-display mb-4">
          Can&apos;t find the answer you&apos;re looking for?
        </p>
        <Button asChild size="lg" className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">
          <Link href="/help-center#contact">Contact Support</Link>
        </Button>
      </div>
    </div>
  );
}
