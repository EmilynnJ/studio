
'use client'; // Readers page needs to be client component to fetch data and use hooks

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { PageTitle } from '@/components/ui/page-title';
import { ReaderCard, type Reader } from '@/components/readers/reader-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, Users, Loader2, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppUser } from '@/types/user'; // Use AppUser for reader data structure

export default function ReadersPage() {
  const [readersData, setReadersData] = useState<Reader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Add state for filters and search term if implementing client-side filtering/searching
  // const [searchTerm, setSearchTerm] = useState('');
  // const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  // const [sortBy, setSortBy] = useState('rating_desc');

  useEffect(() => {
    const fetchReaders = async () => {
      setIsLoading(true);
      try {
        const usersCollectionRef = collection(db, 'users');
        const q = query(usersCollectionRef, where('role', '==', 'reader'));
        const querySnapshot = await getDocs(q);
        const fetchedReaders: Reader[] = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data() as AppUser;
          // Map AppUser to Reader, assuming some defaults if fields are missing
          fetchedReaders.push({
            id: userData.uid,
            name: userData.name || 'Unnamed Reader',
            specialties: userData.specialties || 'Tarot, Astrology', // Placeholder, add to user doc if not already
            rating: userData.rating || Math.random() * (5 - 3.5) + 3.5, // Placeholder rating if not in user doc
            imageUrl: userData.photoURL || `https://picsum.photos/seed/${userData.uid}/400/300`,
            status: userData.status || 'offline',
            shortBio: userData.shortBio || `Spiritual guide with experience in various modalities. Discover clarity and insight.`, // Placeholder bio
            ratePerMinute: userData.ratePerMinute || 5, // Example: $5/min default. Should come from userData.
            dataAiHint: 'spiritual reader',
          });
        });
        setReadersData(fetchedReaders);
      } catch (error) {
        console.error("Error fetching readers:", error);
        // Handle error display if necessary
      }
      setIsLoading(false);
    };

    fetchReaders();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20 flex flex-col items-center">
        <PageTitle>Meet Our Gifted Readers</PageTitle>
        <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--primary))] mt-10" />
        <p className="text-foreground/80 mt-4 font-playfair-display">Loading readers...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>Meet Our Gifted Readers</PageTitle>
      <p className="text-center text-lg text-foreground/80 font-playfair-display max-w-2xl mx-auto mb-12">
        Explore our diverse collective of experienced spiritual advisors. Find the perfect guide to illuminate your path and offer the clarity you seek.
      </p>

      <div className="mb-10 p-4 md:p-6 bg-[hsl(var(--card)/0.5)] rounded-lg border border-[hsl(var(--border)/0.5)] shadow-md">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:flex-grow">
            <Input
              type="search"
              placeholder="Search readers by name or specialty..."
              className="pl-10 pr-4 py-3 bg-input text-foreground placeholder:text-muted-foreground"
              // onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto bg-input text-foreground border-[hsl(var(--border))]">
                <Filter className="mr-2 h-4 w-4" /> Filter Specialties
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover text-popover-foreground">
              <DropdownMenuLabel className="font-playfair-display">Filter by Specialty</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* Add actual specialties based on available data or predefined list */}
              <DropdownMenuCheckboxItem>Tarot</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Astrology</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Clairvoyance</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select
            // onValueChange={(value) => setSortBy(value)} defaultValue={sortBy}
          >
            <SelectTrigger className="w-full md:w-[180px] bg-input text-foreground border-[hsl(var(--border))]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground">
              <SelectItem value="rating_desc">Rating (High to Low)</SelectItem>
              <SelectItem value="rating_asc">Rating (Low to High)</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              <SelectItem value="online">Online First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {readersData.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {readersData.map((reader) => (
            <ReaderCard key={reader.id} reader={reader} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-2">No Readers Found</h3>
          <p className="text-muted-foreground font-playfair-display">
            It seems there are no readers available at the moment. Please check back later.
          </p>
        </div>
      )}

      {/* Placeholder for Pagination if many readers */}
      {/* {readersData.length > 10 && (
        <div className="mt-16 flex justify-center">
          <Button variant="outline" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] mx-1">Previous</Button>
          <Button variant="outline" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] mx-1">1</Button>
          <Button variant="ghost" className="mx-1">2</Button>
          <Button variant="outline" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] mx-1">Next</Button>
        </div>
      )} */}
    </div>
  );
}

// Temp Interfaces to include missing fields from AppUser for ReaderCard, eventually AppUser and Reader type should be more aligned or mapping should be more robust
interface TempAppUser extends AppUser {
  specialties?: string;
  rating?: number;
  shortBio?: string;
}

