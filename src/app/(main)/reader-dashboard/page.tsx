'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export default function ReaderDashboard() {
  const { currentUser, loading, updateUserStatus } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [earnings, setEarnings] = useState({
    total: 0,
    pending: 0,
    paid: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isOnline, setIsOnline] = useState(false);
  
  useEffect(() => {
    if (!loading) {
      if (!currentUser || currentUser.role !== 'reader') {
        router.push('/login');
      } else {
        setIsOnline(currentUser.status === 'online');
        fetchSessions();
        calculateEarnings();
      }
    }
  }, [currentUser, loading, router]);

  const fetchSessions = async () => {
    if (!currentUser) return;
    
    try {
      const sessionsQuery = query(
        collection(db, 'videoSessions'),
        where('readerUid', '==', currentUser.uid),
        orderBy('requestedAt', 'desc')
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionsList = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSessions(sessionsList);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEarnings = async () => {
    if (!currentUser) return;
    
    try {
      // In a real app, you might want to fetch this from a separate earnings collection
      // This is a simplified version that calculates from sessions
      const completedSessions = sessions.filter(session => 
        session.status === 'ended' && session.amountCharged
      );
      
      const totalEarnings = completedSessions.reduce(
        (sum, session) => sum + (session.amountCharged || 0), 
        0
      );
      
      // Assuming 70% of the amount goes to the reader
      const readerEarnings = totalEarnings * 0.7;
      
      setEarnings({
        total: readerEarnings,
        pending: readerEarnings * 0.3, // Just an example - pending payout
        paid: readerEarnings * 0.7 // Just an example - already paid out
      });
    } catch (error) {
      console.error('Error calculating earnings:', error);
    }
  };

  const getUpcomingSessions = () => {
    return sessions.filter(session => 
      session.status === 'pending' || 
      session.status === 'accepted_by_reader'
    );
  };

  const getPastSessions = () => {
    return sessions.filter(session => 
      session.status === 'ended' || 
      session.status === 'cancelled' || 
      session.status === 'ended_insufficient_funds'
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getSessionStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending</span>;
      case 'accepted_by_reader':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Accepted</span>;
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>;
      case 'ended':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Cancelled</span>;
      case 'ended_insufficient_funds':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Ended (Insufficient Funds)</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
    }
  };

  const handleStatusToggle = async () => {
    if (!currentUser) return;
    
    const newStatus = isOnline ? 'offline' : 'online';
    setIsOnline(!isOnline);
    
    try {
      await updateUserStatus(currentUser.uid, newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      // Revert UI state if update fails
      setIsOnline(isOnline);
    }
  };

  if (loading || isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reader Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="status-toggle" 
              checked={isOnline} 
              onCheckedChange={handleStatusToggle} 
            />
            <Label htmlFor="status-toggle">
              {isOnline ? 'Online' : 'Offline'}
            </Label>
          </div>
          <Button onClick={() => router.push('/reader-dashboard/go-live')}>Go Live</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${earnings.total.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Pending Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${earnings.pending.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Sessions</CardTitle>
          <CardDescription>View and manage your reading sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past Sessions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming">
              {getUpcomingSessions().length === 0 ? (
                <p>No upcoming sessions found.</p>
              ) : (
                <div className="space-y-4">
                  {getUpcomingSessions().map((session) => (
                    <div key={session.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{session.clientName}</h3>
                          <p className="text-sm text-gray-500">
                            Requested: {formatDate(session.requestedAt)}
                          </p>
                          <p className="text-sm mt-1">
                            Session Type: {session.sessionType}
                          </p>
                          <div className="mt-2">
                            {getSessionStatusBadge(session.status)}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {session.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Accept session logic
                              }}
                            >
                              Accept
                            </Button>
                          )}
                          
                          <Button 
                            variant={session.status === 'accepted_by_reader' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => router.push(`/session/${session.id}`)}
                          >
                            {session.status === 'accepted_by_reader' ? 'Join Session' : 'View Details'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past">
              {getPastSessions().length === 0 ? (
                <p>No past sessions found.</p>
              ) : (
                <div className="space-y-4">
                  {getPastSessions().map((session) => (
                    <div key={session.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{session.clientName}</h3>
                          <p className="text-sm text-gray-500">
                            Date: {formatDate(session.startedAt || session.requestedAt)}
                          </p>
                          <p className="text-sm">
                            Duration: {session.totalMinutes || 'N/A'} minutes
                          </p>
                          <p className="text-sm">
                            Earnings: ${session.amountCharged ? (session.amountCharged * 0.7).toFixed(2) : 'N/A'}
                          </p>
                          <div className="mt-2">
                            {getSessionStatusBadge(session.status)}
                          </div>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/session/${session.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}