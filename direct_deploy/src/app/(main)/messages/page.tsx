
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Search, UserCircle, Users } from 'lucide-react';
import Link from 'next/link';

// Placeholder data
const conversations = [
  { id: 'convo1', name: 'Mysteria Moon', lastMessage: 'Thank you for the insightful reading!', unread: 0, avatarUrl: 'https://picsum.photos/seed/mysteria/50/50', dataAiHint: 'mystic woman' },
  { id: 'convo2', name: 'Orion Stargazer', lastMessage: 'Could we schedule another session next week?', unread: 2, avatarUrl: 'https://picsum.photos/seed/orion/50/50', dataAiHint: 'wise man' },
  { id: 'convo3', name: 'Support Team', lastMessage: 'Your query has been resolved.', unread: 0, avatarUrl: 'https://picsum.photos/seed/support/50/50', dataAiHint: 'customer service' },
];

const currentChatMessages = [
    { id: 'msg1', sender: 'Mysteria Moon', text: 'Hello! How can I help you today?', time: '10:30 AM', isOwn: false },
    { id: 'msg2', sender: 'You', text: 'I had a question about my previous reading.', time: '10:31 AM', isOwn: true },
    { id: 'msg3', sender: 'Mysteria Moon', text: 'Of course, feel free to ask.', time: '10:32 AM', isOwn: false },
];


export default function MessagesPage() {
  // const { currentUser } = useAuth(); // If needed for authentication
  // if (!currentUser) router.push('/login'); // Redirect if not logged in

  return (
    <div className="container mx-auto px-0 md:px-6 py-8 md:py-12 h-[calc(100vh-var(--header-height,10rem))] flex flex-col">
      <PageTitle>Your Messages</PageTitle>
      
      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-6 border border-[hsl(var(--border)/0.5)] rounded-lg shadow-xl bg-[hsl(var(--card)/0.8)] overflow-hidden">
        {/* Conversations List */}
        <aside className="col-span-1 border-r border-[hsl(var(--border)/0.5)] p-0 flex flex-col">
            <div className="p-4 border-b border-[hsl(var(--border)/0.5)]">
                <div className="relative">
                    <Input placeholder="Search conversations..." className="pl-10 bg-input" />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
            </div>
            <ScrollArea className="flex-grow">
                {conversations.map(convo => (
                    <Link href={`/messages?chat=${convo.id}`} key={convo.id} scroll={false}>
                        <div className="flex items-center gap-3 p-4 border-b border-[hsl(var(--border)/0.3)] hover:bg-[hsl(var(--primary)/0.1)] cursor-pointer transition-colors">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={convo.avatarUrl} alt={convo.name} data-ai-hint={convo.dataAiHint} />
                                <AvatarFallback>{convo.name.substring(0,1)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow overflow-hidden">
                                <h3 className="font-semibold font-playfair-display text-foreground truncate">{convo.name}</h3>
                                <p className="text-sm text-muted-foreground truncate font-playfair-display">{convo.lastMessage}</p>
                            </div>
                            {convo.unread > 0 && (
                                <span className="ml-auto bg-[hsl(var(--primary))] text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{convo.unread}</span>
                            )}
                        </div>
                    </Link>
                ))}
                 {conversations.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground font-playfair-display">
                        <Users className="mx-auto h-12 w-12 mb-3" />
                        No conversations yet.
                    </div>
                )}
            </ScrollArea>
        </aside>

        {/* Chat Area */}
        <main className="md:col-span-2 lg:col-span-3 flex flex-col bg-[hsl(var(--background)/0.5)]">
            {conversations.length > 0 ? ( // Show selected chat or a placeholder
                <>
                    <header className="p-4 border-b border-[hsl(var(--border)/0.5)] flex items-center gap-3 bg-[hsl(var(--card))]">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={conversations[0].avatarUrl} alt={conversations[0].name} data-ai-hint={conversations[0].dataAiHint} />
                             <AvatarFallback>{conversations[0].name.substring(0,1)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">{conversations[0].name}</h2>
                            <span className="text-xs text-green-400 font-playfair-display">Online</span> {/* Placeholder status */}
                        </div>
                    </header>

                    <ScrollArea className="flex-grow p-4 space-y-4 bg-gradient-to-b from-[hsl(var(--background)/0.3)] to-[hsl(var(--background)/0.6)]">
                        {currentChatMessages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] p-3 rounded-xl shadow-md ${msg.isOwn ? 'bg-[hsl(var(--primary)/0.7)] text-primary-foreground rounded-br-none' : 'bg-[hsl(var(--card))] text-foreground rounded-bl-none'}`}>
                                    <p className="text-sm font-playfair-display leading-relaxed">{msg.text}</p>
                                    <p className={`text-xs mt-1 ${msg.isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'} text-right`}>{msg.time}</p>
                                </div>
                            </div>
                        ))}
                    </ScrollArea>

                    <footer className="p-4 border-t border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card))]">
                        <form className="flex items-center gap-3">
                            <Input placeholder="Type your message..." className="bg-input flex-grow" />
                            <Button type="submit" className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]">
                                <Send className="h-5 w-5 mr-0 md:mr-2" /> <span className="hidden md:inline">Send</span>
                            </Button>
                        </form>
                    </footer>
                </>
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                    <MessageSquare className="h-20 w-20 mb-4 opacity-50" />
                    <h2 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">Select a conversation</h2>
                    <p className="font-playfair-display">Or start a new one with a reader or support.</p>
                </div>
            )}
        </main>
      </div>
    </div>
  );
}

