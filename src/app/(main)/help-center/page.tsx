import { PageTitle } from '@/components/ui/page-title';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { HelpCircle, Search, Mail } from 'lucide-react';

const faqs = [
  {
    question: "How do I book a reading?",
    answer: "Navigate to the 'Readers' page, browse available readers, and click 'Request Session' on their profile. You'll be guided through the booking process. Some readers offer instant availability, while others require scheduling."
  },
  {
    question: "What types of readings are available?",
    answer: "SoulSeer offers a variety of readings, including tarot, astrology, clairvoyance, mediumship, numerology, and more. Each reader lists their specialties on their profile."
  },
  {
    question: "How does billing work?",
    answer: "Billing is typically per-minute for live readings (chat, phone, video) via Stripe. Scheduled readings may have a one-time payment. All pricing is clearly displayed before you confirm a session."
  },
  {
    question: "Is my information secure?",
    answer: "Yes, we take your privacy and security very seriously. All communications are encrypted, and your personal data is handled according to our strict Privacy Policy. Payment information is processed securely by Stripe."
  },
  {
    question: "What if I'm not satisfied with my reading?",
    answer: "We strive for all users to have a positive experience. If you encounter any issues, please contact our support team through the form below or email us directly. We'll do our best to assist you."
  }
];

export default function HelpCenterPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>SoulSeer Help Center</PageTitle>
      <p className="text-center text-lg text-foreground/80 font-playfair-display max-w-2xl mx-auto mb-12">
        Find answers to common questions and get support for any issues you may encounter. We&apos;re here to help you navigate your SoulSeer experience.
      </p>

      {/* Search Bar */}
      <div className="mb-12 max-w-2xl mx-auto">
        <div className="relative">
          <Input
            type="search"
            placeholder="Search for help topics..."
            className="pl-10 pr-4 py-3 text-lg bg-input text-foreground placeholder:text-muted-foreground"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {/* FAQs Section */}
      <div className="mb-16">
        <h3 className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center mb-10">Frequently Asked Questions</h3>
        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="bg-[hsl(var(--card)/0.7)] border-[hsl(var(--border)/0.5)] rounded-md mb-3 shadow-md">
              <AccordionTrigger className="p-6 text-lg font-playfair-display text-foreground hover:no-underline hover:text-[hsl(var(--primary))]">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-6 w-6 text-[hsl(var(--primary))]" />
                  {faq.question}
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-6 pt-0 text-base text-foreground/80 font-playfair-display leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Contact Support Section */}
      <div>
        <h3 className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center mb-10">Still Need Help?</h3>
        <Card className="max-w-2xl mx-auto bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Contact Our Support Team</CardTitle>
            <CardDescription className="font-playfair-display text-muted-foreground">
              Fill out the form below, and we&apos;ll get back to you as soon as possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground/90 font-playfair-display mb-1">Your Name</label>
                <Input type="text" id="name" name="name" className="bg-input text-foreground placeholder:text-muted-foreground" placeholder="Enter your name"/>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground/90 font-playfair-display mb-1">Your Email</label>
                <Input type="email" id="email" name="email" className="bg-input text-foreground placeholder:text-muted-foreground" placeholder="Enter your email"/>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground/90 font-playfair-display mb-1">Subject</label>
                <Input type="text" id="subject" name="subject" className="bg-input text-foreground placeholder:text-muted-foreground" placeholder="Briefly describe your issue"/>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground/90 font-playfair-display mb-1">Message</label>
                <Textarea id="message" name="message" rows={5} className="bg-input text-foreground placeholder:text-muted-foreground" placeholder="Describe your issue in detail..."/>
              </div>
              <Button type="submit" className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display text-lg">
                <Mail className="mr-2 h-5 w-5" /> Send Message
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
