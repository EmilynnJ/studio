'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { AppUser } from '@/types/user';
import ReaderCard from '@/components/readers/reader-card';

export default function ReadersPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [readers, setReaders] = useState<AppUser[]>([]);
  const [filteredReaders, setFilteredReaders] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterStatus, setFilterStatus] = useState('all');
  
  useEffect(() => {
    if (!loading) {
      fetchReaders();
    }
  }, [loading]);
  
  const fetchReaders = async () => {
    try {
      const readersQuery = query(collection(db, 'users'), where('role', '==', 'reader'));
      const readersSnapshot = await getDocs(readersQuery);
      const readersList = readersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as AppUser[];
      
      setReaders(readersList);
      setFilteredReaders(readersList);
    } catch (error) {
      console.error('Error fetching readers:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Apply filters and sorting
    let result = [...readers];
    
    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(reader => reader.status === filterStatus);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(reader => 
        reader.name?.toLowerCase().includes(term) || 
        reader.specialties?.toLowerCase().includes(term)
      );
    }
    
    // Sort results
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'rate':
          return (a.ratePerMinute || 0) - (b.ratePerMinute || 0);
        case 'rate-desc':
          return (b.ratePerMinute || 0) - (a.ratePerMinute || 0);
        default:
          return 0;
      }
    });
    
    setFilteredReaders(result);
  }, [readers, searchTerm, sortBy, filterStatus]);
  
  const handleRequestReading = (reader: AppUser) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    
    // Navigate to the request page with the reader's ID
    router.push(`/request-reading/${reader.uid}`);
  };
  
  if (loading || isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Our Gifted Readers</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Find Your Perfect Reader</CardTitle>
          <CardDescription>
            Browse our community of talented psychics and spiritual advisors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="rate">Rate (Low to High)</SelectItem>
                  <SelectItem value="rate-desc">Rate (High to Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Readers</SelectItem>
                  <SelectItem value="online">Online Now</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {filteredReaders.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">No readers found</h2>
          <p className="text-gray-500">
            Try adjusting your filters or search terms
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReaders.map((reader) => (
            <ReaderCard 
              key={reader.uid} 
              reader={reader} 
              onRequestReading={() => handleRequestReading(reader)}
              isLoggedIn={!!currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}