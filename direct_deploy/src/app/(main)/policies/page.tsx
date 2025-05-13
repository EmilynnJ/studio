
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function PoliciesPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>Our Policies</PageTitle>
      <p className="text-center text-lg text-foreground/80 font-playfair-display max-w-2xl mx-auto mb-12">
        At SoulSeer, we are committed to transparency and trust. Please review our policies to understand your rights and our commitments.
      </p>

      <div className="space-y-8 max-w-3xl mx-auto">
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4">
            <FileText className="h-8 w-8 text-[hsl(var(--primary))]" />
            <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="font-playfair-display text-foreground/80 leading-relaxed">
            <p className="mb-4">
              Your privacy is paramount to us. Our Privacy Policy outlines how we collect, use, protect, and handle your personal information when you use SoulSeer. We are dedicated to safeguarding your data and ensuring transparency in our practices.
            </p>
            <p className="mb-4">
              Key aspects covered include:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Information We Collect (e.g., account details, usage data, communication records).</li>
              <li>How We Use Your Information (e.g., to provide services, improve platform, communicate with you).</li>
              <li>Data Security Measures (e.g., encryption, access controls).</li>
              <li>Your Rights and Choices (e.g., accessing or deleting your data).</li>
              <li>Use of Cookies and Tracking Technologies.</li>
              <li>Third-Party Services and Data Sharing.</li>
            </ul>
            <p>
              [Placeholder for detailed Privacy Policy content or a link to the full document. This should be legally reviewed.]
            </p>
            <a href="/full-privacy-policy.pdf" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline mt-4 inline-block">Read Full Privacy Policy (PDF)</a>
          </CardContent>
        </Card>

        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4">
            <FileText className="h-8 w-8 text-[hsl(var(--primary))]" />
            <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Cookie Policy</CardTitle>
          </CardHeader>
          <CardContent className="font-playfair-display text-foreground/80 leading-relaxed">
            <p className="mb-4">
              Our Cookie Policy explains what cookies are, how we use them on SoulSeer, the types of cookies we use, the information we collect using cookies, and how that information is used. It also describes how to manage your cookie preferences.
            </p>
             <p>
              [Placeholder for detailed Cookie Policy content or a link to the full document.]
            </p>
             <a href="/full-cookie-policy.pdf" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline mt-4 inline-block">Read Full Cookie Policy (PDF)</a>
          </CardContent>
        </Card>
        
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4">
            <FileText className="h-8 w-8 text-[hsl(var(--primary))]" />
            <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Community Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="font-playfair-display text-foreground/80 leading-relaxed">
            <p className="mb-4">
             Our Community Guidelines are designed to ensure SoulSeer remains a safe, respectful, and supportive environment for all users. These guidelines apply to all interactions within our community forums, comments, and direct communications.
            </p>
             <p>
              [Placeholder for detailed Community Guidelines or a link to the full document.]
            </p>
             <a href="/full-community-guidelines.pdf" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline mt-4 inline-block">Read Full Community Guidelines (PDF)</a>
          </CardContent>
        </Card>

         <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4">
            <FileText className="h-8 w-8 text-[hsl(var(--primary))]" />
            <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Refund Policy</CardTitle>
          </CardHeader>
          <CardContent className="font-playfair-display text-foreground/80 leading-relaxed">
            <p className="mb-4">
             Our Refund Policy details the circumstances under which SoulSeer may issue refunds for services. We aim for fairness and satisfaction.
            </p>
             <p>
              [Placeholder for detailed Refund Policy or a link to the full document.]
            </p>
             <a href="/full-refund-policy.pdf" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline mt-4 inline-block">Read Full Refund Policy (PDF)</a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

