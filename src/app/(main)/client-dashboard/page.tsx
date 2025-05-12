'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { AppUser } from '@/types/user';

export default function ClientDashboard() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  
  useEffect(() => {
    if (!loading) {
      if (!currentUser || currentUser.role !== 'client') {
        router.push('/login');
      } else {
        fetchSessions();
      }
    }
  }, [currentUser, loading, router]);

  const fetchSessions = async () => {
    if (!currentUser) return;
    
    try {
      const sessionsQuery = query(
        collection(db, 'videoSessions'),
        where('clientUid', '==', currentUser.uid),
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

  if (loading || isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Client Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Current Balance</p>
            <p className="text-xl font-bold">${currentUser?.balance || 0}</p>
          </div>
          <Button onClick={() => router.push('/add-funds')}>Add Funds</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{getUpcomingSessions().length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Completed Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{getPastSessions().length}</p>
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
                          <h3 className="font-medium">{session.readerName}</h3>
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
                        
                        <Button 
                          variant={session.status === 'accepted_by_reader' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => router.push(`/session/${session.id}`)}
                        >
                          {session.status === 'accepted_by_reader' ? 'Join Session' : 'View Details'}
                        </Button>
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
                          <h3 className="font-medium">{session.readerName}</h3>
                          <p className="text-sm text-gray-500">
                            Date: {formatDate(session.startedAt || session.requestedAt)}
                          </p>
                          <p className="text-sm">
                            Duration: {session.totalMinutes || 'N/A'} minutes
                          </p>
                          <p className="text-sm">
                            Amount: ${session.amountCharged ? session.amountCharged.toFixed(2) : 'N/A'}
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