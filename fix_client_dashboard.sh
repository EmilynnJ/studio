#!/bin/bash

echo "Creating a fixed client-dashboard page..."

# Create a new client-dashboard page with correct imports
cat > deploy/src/app/\(main\)/client-dashboard/page.tsx << 'CLIENTDASHBOARD'
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function ClientDashboard() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
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
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load your sessions. Please try again.'
      });
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
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'accepted_by_reader':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Accepted</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'ended':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
      case 'ended_insufficient_funds':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Ended (Insufficient Funds)</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Client Dashboard</h1>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4 rounded-lg shadow-md text-white">
            <p className="text-sm font-medium">Current Balance</p>
            <p className="text-2xl font-bold">${currentUser?.balance?.toFixed(2) || '0.00'}</p>
          </div>
          <Button onClick={() => router.push('/add-funds')} className="w-full md:w-auto">
            Add Funds
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200">
          <CardHeader className="pb-2">
            <CardTitle>Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle>Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{getUpcomingSessions().length}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
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
                <div className="text-center py-12">
                  <h2 className="text-xl font-medium mb-2">No upcoming sessions</h2>
                  <p className="text-gray-500 mb-6">
                    You don't have any upcoming reading sessions scheduled.
                  </p>
                  <Button onClick={() => router.push('/readers')}>
                    Find a Reader
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {getUpcomingSessions().map((session) => (
                    <div key={session.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-lg">{session.readerName}</h3>
                            {getSessionStatusBadge(session.status)}
                          </div>
                          <p className="text-sm text-gray-500">
                            Requested: {formatDate(session.requestedAt)}
                          </p>
                          <p className="text-sm mt-1">
                            Session Type: <span className="capitalize">{session.sessionType}</span>
                          </p>
                          <p className="text-sm">
                            Rate: ${session.readerRatePerMinute}/minute
                          </p>
                        </div>
                        
                        <Button 
                          variant={session.status === 'accepted_by_reader' ? 'default' : 'outline'} 
                          onClick={() => router.push(`/session/${session.sessionId || session.id}`)}
                          className={session.status === 'accepted_by_reader' ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600' : ''}
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
                <div className="text-center py-12">
                  <h2 className="text-xl font-medium mb-2">No past sessions</h2>
                  <p className="text-gray-500 mb-6">
                    You haven't completed any reading sessions yet.
                  </p>
                  <Button onClick={() => router.push('/readers')}>
                    Find a Reader
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {getPastSessions().map((session) => (
                    <div key={session.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-lg">{session.readerName}</h3>
                            {getSessionStatusBadge(session.status)}
                          </div>
                          <p className="text-sm text-gray-500">
                            Date: {formatDate(session.startedAt || session.requestedAt)}
                          </p>
                          <p className="text-sm">
                            Duration: {session.totalMinutes || 'N/A'} minutes
                          </p>
                          <p className="text-sm">
                            Amount: ${session.amountCharged ? session.amountCharged.toFixed(2) : 'N/A'}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => router.push(`/session/${session.sessionId || session.id}`)}
                          >
                            View Details
                          </Button>
                          {session.status === 'ended' && !session.hasReview && (
                            <Button 
                              variant="outline"
                              onClick={() => router.push(`/review/${session.sessionId || session.id}`)}
                            >
                              Leave Review
                            </Button>
                          )}
                        </div>
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
CLIENTDASHBOARD

echo "Fixed client-dashboard page created."
