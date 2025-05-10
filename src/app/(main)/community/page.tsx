import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Sparkles, Edit3 } from 'lucide-react';
import Image from 'next/image';

const forumCategories = [
  { id: '1', name: 'General Discussion', description: 'Chat about anything spiritual.', icon: <MessageSquare className="h-8 w-8 text-[hsl(var(--primary))]" />, topicCount: 125, postCount: 1532 },
  { id: '2', name: 'Tarot & Divination', description: 'Share readings, discuss spreads, and learn.', icon: <Sparkles className="h-8 w-8 text-[hsl(var(--primary))]" />, topicCount: 88, postCount: 976 },
  { id: '3', name: 'Astrology Insights', description: 'Explore planetary influences and birth charts.', icon: <Users className="h-8 w-8 text-[hsl(var(--primary))]" />, topicCount: 72, postCount: 812 },
  { id: '4', name: 'Healing & Wellness', description: 'Discuss energy healing, meditation, and self-care.', icon: <Users className="h-8 w-8 text-[hsl(var(--primary))]" />, topicCount: 60, postCount: 750 },
];

export default function CommunityPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>SoulSeer Community Forum</PageTitle>
      <p className="text-center text-lg text-foreground/80 font-playfair-display max-w-2xl mx-auto mb-12">
        Connect with fellow seekers, share your wisdom, and grow together in our open and supportive forum.
      </p>

      <div className="mb-12 flex flex-col md:flex-row justify-center items-center gap-6 p-6 bg-[hsl(var(--card)/0.5)] rounded-lg border border-[hsl(var(--border)/0.5)]">
        <Image 
          src="https://picsum.photos/seed/communityart/400/250" 
          alt="Vibrant community gathering" 
          width={400} 
          height={250} 
          className="rounded-lg shadow-md"
          data-ai-hint="spiritual community"
        />
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-4">Share Your Light</h2>
          <p className="text-foreground/80 font-playfair-display mb-6">
            Our community is a place for respectful dialogue, shared learning, and mutual support. Whether you&apos;re new to spiritual practices or a seasoned practitioner, your voice is valued here.
          </p>
          <Button size="lg" className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">
            <Edit3 className="mr-2 h-5 w-5" /> Start a New Discussion
          </Button>
        </div>
      </div>

      <h3 className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center mb-10">Forum Categories</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {forumCategories.map((category) => (
          <Card key={category.id} className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-4 mb-2">
                {category.icon}
                <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">{category.name}</CardTitle>
              </div>
              <CardDescription className="font-playfair-display text-foreground/70">{category.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center text-sm text-muted-foreground font-playfair-display">
              <span>{category.topicCount} Topics</span>
              <span>{category.postCount} Posts</span>
              <Button variant="link" className="p-0 h-auto text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)]">
                Enter Forum
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center p-8 bg-[hsl(var(--card)/0.7)] rounded-lg border border-[hsl(var(--soulseer-gold)/0.3)] shadow-inner">
        <h4 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-4">Community Guidelines</h4>
        <p className="text-foreground/80 font-playfair-display mb-2">
          To maintain a harmonious space, please be respectful, kind, and constructive in your interactions.
        </p>
        <p className="text-foreground/80 font-playfair-display">
          Avoid spam, self-promotion (unless in designated areas), and personal attacks. Let&apos;s co-create a positive environment!
        </p>
        <Link href="/community/guidelines" className="inline-block mt-4 text-[hsl(var(--primary))] hover:underline font-playfair-display">
          Read Full Guidelines
        </Link>
      </div>
    </div>
  );
}
