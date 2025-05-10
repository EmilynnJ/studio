
'use client';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import type { AppUser } from '@/types/user';
import type { VideoSessionData } from '@/types/session';
import { Edit3, Eye, MessageSquare, Users, DollarSign, CalendarClock, BarChart3, Settings, Bell, LogOut, ShieldCheck, Star, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';


// Placeholder data - replace with actual data fetching
const recentActivity = [
  { id: 'act1', type: 'New Message', description: 'From Mysteria Moon', time: '2 hours ago', icon: <MessageSquare className="h-5 w-5 text-blue-400"/> },
  { id: 'act2', type: 'Session Reminder', description: 'Upcoming session with Orion Stargazer in 1 day', time: 'Yesterday', icon: <CalendarClock className="h-5 w-5 text-purple-400"/> },
  { id: 'act3', type: 'New Follower', description: 'Lyra B. started following you (Reader View)', time: '3 days ago', icon: <Users className="h-5 w-5 text-green-400"/> },
];

const readerStats = {
  totalEarnings: 2350.75,
  completedSessions: 42,
  averageRating: 4.8,
  profileViews: 1204,
};

export default function DashboardPage() {
  const { currentUser, loading, logout, updateUserStatus } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<'client' | 'reader' | null>(null);
  const [readerAvailability, setReaderAvailability] = useState<'online' | 'offline' | 'busy' | undefined>(currentUser?.status);
  const [pendingSessions, setPendingSessions] = useState<VideoSessionData[]>([]);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    } else if (currentUser) {
      setUserRole(currentUser.role);
      if(currentUser.role === 'reader') {
        setReaderAvailability(currentUser.status);

        // Fetch pending sessions for reader
        const sessionsColRef = collection(db, 'videoSessions');
        const q = query(sessionsColRef, 
          where('readerUid', '==', currentUser.uid), 
          where('status', '==', 'pending'),
          orderBy('requestedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const sessions: VideoSessionData[] = [];
          querySnapshot.forEach((doc) => {
            sessions.push(doc.data() as VideoSessionData);
          });
          setPendingSessions(sessions);
        }, (error) => {
          console.error("Error fetching pending sessions: ", error);
          toast({ variant: "destructive", title: "Error", description: "Could not fetch pending sessions." });
        });
        return () => unsubscribe();
      }
    }
  }, [currentUser, loading, router, toast]);

  const handleAvailabilityChange = async (newStatus: 'online' | 'offline' | 'busy') => {
    if (currentUser && currentUser.role === 'reader') {
      await updateUserStatus(currentUser.uid, newStatus);
      setReaderAvailability(newStatus);
    }
  };

  const handleAcceptSession = async (sessionId: string) => {
    const sessionDocRef = doc(db, 'videoSessions', sessionId);
    try {
      await updateDoc(sessionDocRef, {
        status: 'accepted_by_reader',
      });
      toast({ title: "Session Accepted", description: "Joining the session..." });
      router.push(`/session/${sessionId}`);
    } catch (error) {
      console.error("Error accepting session:", error);
      toast({ variant: 'destructive', title: "Error", description: "Could not accept the session." });
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <PageTitle>Dashboard</PageTitle>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>{userRole === 'reader' ? 'Reader Dashboard' : 'My Dashboard'}</PageTitle>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar / Profile Summary */}
        <aside className="lg:col-span-1 space-y-6">
          <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl">
            <CardHeader className="items-center text-center">
              <Avatar className="w-24 h-24 mb-4 border-2 border-[hsl(var(--primary))]">
                <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.name || 'User'} />
                <AvatarFallback className="text-3xl bg-muted text-muted-foreground">{getInitials(currentUser.name)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">{currentUser.name || 'Soul Seeker'}</CardTitle>
              <CardDescription className="font-playfair-display text-muted-foreground capitalize flex items-center justify-center gap-1">
                <ShieldCheck className="h-4 w-4 text-[hsl(var(--accent))]" /> {currentUser.role || 'Member'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild variant="outline" className="w-full border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                <Link href="/profile/edit"><Edit3 className="mr-2 h-4 w-4" /> Edit Profile</Link>
              </Button>
            </CardContent>
             {userRole === 'reader' && (
              <CardFooter className="flex flex-col gap-2 p-4 border-t border-[hsl(var(--border)/0.5)]">
                 <p className="text-sm font-playfair-display text-muted-foreground mb-1">Set Your Availability:</p>
                <div className="grid grid-cols-3 gap-2 w-full">
                  <Button onClick={() => handleAvailabilityChange('online')} variant={readerAvailability === 'online' ? 'default' : 'outline'} size="sm" className={readerAvailability === 'online' ? 'bg-green-500 hover:bg-green-600 text-primary-foreground' : ''}>Online</Button>
                  <Button onClick={() => handleAvailabilityChange('busy')} variant={readerAvailability === 'busy' ? 'default' : 'outline'} size="sm" className={readerAvailability === 'busy' ? 'bg-yellow-500 hover:bg-yellow-600 text-background' : ''}>Busy</Button>
                  <Button onClick={() => handleAvailabilityChange('offline')} variant={readerAvailability === 'offline' ? 'default' : 'outline'} size="sm" className={readerAvailability === 'offline' ? 'bg-slate-500 hover:bg-slate-600 text-primary-foreground' : ''}>Offline</Button>
                </div>
              </CardFooter>
            )}
          </Card>

          <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] flex items-center gap-2"><Bell className="h-5 w-5"/>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <ul className="space-y-3">
                  {recentActivity.map(activity => (
                    <li key={activity.id} className="flex items-start gap-3 text-sm font-playfair-display">
                      <span className="mt-0.5">{activity.icon}</span>
                      <div>
                        <p className="text-foreground/90 font-medium">{activity.type}</p>
                        <p className="text-muted-foreground text-xs">{activity.description} - {activity.time}</p>
                      </div>
                    </li>
                  ))}
                   {recentActivity.length === 0 && <p className="text-muted-foreground text-sm font-playfair-display">No recent activity.</p>}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-2 space-y-6">
           {userRole === 'reader' && pendingSessions.length > 0 && (
            <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] flex items-center gap-2">
                  <Clock className="h-6 w-6" /> Pending Session Requests
                </CardTitle>
                <CardDescription className="font-playfair-display text-muted-foreground">
                  You have {pendingSessions.length} new session request{pendingSessions.length > 1 ? 's' : ''}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  <ul className="space-y-4">
                    {pendingSessions.map((session) => (
                      <li key={session.sessionId} className="p-4 bg-[hsl(var(--background)/0.6)] rounded-lg border border-[hsl(var(--border)/0.4)] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                           <Avatar className="w-12 h-12">
                            <AvatarImage src={session.clientPhotoURL || undefined} alt={session.clientName}/>
                            <AvatarFallback>{getInitials(session.clientName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground/90 font-playfair-display">{session.clientName}</p>
                            <p className="text-sm text-muted-foreground font-playfair-display capitalize">
                              Requests a {session.sessionType} session
                            </p>
                            <p className="text-xs text-muted-foreground/80 font-playfair-display">
                              Requested: {session.requestedAt ? new Timestamp(session.requestedAt.seconds, session.requestedAt.nanoseconds).toDate().toLocaleString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleAcceptSession(session.sessionId)}
                          className="w-full sm:w-auto bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" /> Accept Session
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue={userRole === 'reader' ? 'overview' : 'sessions'} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 bg-[hsl(var(--card)/0.8)] border-b-0 rounded-t-lg p-1">
              {userRole === 'reader' && <TabsTrigger value="overview" className="soulseer-tabs-trigger">Overview</TabsTrigger>}
              <TabsTrigger value="sessions" className="soulseer-tabs-trigger">My Sessions</TabsTrigger>
              <TabsTrigger value="account" className="soulseer-tabs-trigger">Account Settings</TabsTrigger>
            </TabsList>

            {userRole === 'reader' && (
              <TabsContent value="overview" className="p-6 bg-[hsl(var(--card))] border border-t-0 border-[hsl(var(--border)/0.7)] rounded-b-lg shadow-xl">
                <h3 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-6">Reader Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: "Total Earnings", value: `$${readerStats.totalEarnings.toFixed(2)}`, icon: <DollarSign/> },
                    { label: "Completed Sessions", value: readerStats.completedSessions, icon: <ShieldCheck/> },
                    { label: "Average Rating", value: readerStats.averageRating.toFixed(1), icon: <Star/> },
                    { label: "Profile Views", value: readerStats.profileViews, icon: <Eye/> },
                  ].map(stat => (
                    <Card key={stat.label} className="bg-[hsl(var(--background)/0.5)] p-4 text-center">
                      <div className="text-3xl text-[hsl(var(--primary))] mb-1">{React.cloneElement(stat.icon as React.ReactElement, {className: "mx-auto h-8 w-8"})}</div>
                      <p className="text-2xl font-bold font-playfair-display text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground font-playfair-display">{stat.label}</p>
                    </Card>
                  ))}
                </div>
                <Button className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><BarChart3 className="mr-2 h-4 w-4"/> View Detailed Analytics</Button>
              </TabsContent>
            )}

            <TabsContent value="sessions" className="p-6 bg-[hsl(var(--card))] border border-t-0 border-[hsl(var(--border)/0.7)] rounded-b-lg shadow-xl">
              <h3 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-6">Session History</h3>
              {/* Placeholder for session history list */}
              <div className="border border-dashed border-[hsl(var(--border)/0.5)] rounded-md p-8 text-center text-muted-foreground font-playfair-display">
                <CalendarClock className="mx-auto h-12 w-12 mb-3"/>
                No sessions recorded yet.
                {userRole === 'client' && <Link href="/readers" className="block mt-2 text-[hsl(var(--primary))] hover:underline">Find a Reader to start a session.</Link>}
                 {userRole === 'reader' && pendingSessions.length === 0 && <p className="mt-2">No new session requests.</p>}
              </div>
            </TabsContent>

            <TabsContent value="account" className="p-6 bg-[hsl(var(--card))] border border-t-0 border-[hsl(var(--border)/0.7)] rounded-b-lg shadow-xl">
              <h3 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-6">Account Management</h3>
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start text-left"><Settings className="mr-2 h-5 w-5" /> Manage Profile Information</Button>
                <Button variant="outline" className="w-full justify-start text-left"><DollarSign className="mr-2 h-5 w-5" /> Billing & Payments</Button>
                <Button variant="outline" className="w-full justify-start text-left"><ShieldCheck className="mr-2 h-5 w-5" /> Security & Login</Button>
                <Button onClick={logout} variant="destructive" className="w-full justify-start text-left"><LogOut className="mr-2 h-5 w-5" /> Logout</Button>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

