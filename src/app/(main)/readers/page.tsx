import { PageTitle } from '@/components/ui/page-title';
import { ReaderCard, type Reader } from '@/components/readers/reader-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, Users, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import React from 'react'; // useState would be client component

// Placeholder data - in a real app, this would come from an API
const readersData: Reader[] = [
  { id: '1', name: 'Seraphina Moon', specialties: 'Tarot, Astrology, Clairvoyance', rating: 4.9, imageUrl: 'https://picsum.photos/seed/reader1/400/300', status: 'online', shortBio: 'Guiding you with celestial wisdom and intuitive insights. Over 10 years of experience.', dataAiHint: 'mystic woman tarot' },
  { id: '2', name: 'Orion Sage', specialties: 'Runes, Shamanic Healing, Dream Analysis', rating: 4.8, imageUrl: 'https://picsum.photos/seed/reader2/400/300', status: 'offline', shortBio: 'Connecting with ancient wisdom to illuminate your path. Deep, transformative readings.', dataAiHint: 'wise man nature' },
  { id: '3', name: 'Luna Starlight', specialties: 'Mediumship, Angel Communication, Reiki', rating: 5.0, imageUrl: 'https://picsum.photos/seed/reader3/400/300', status: 'busy', shortBio: 'Messages from beyond and healing energies to support your soul\'s journey.', dataAiHint: 'ethereal person light' },
  { id: '4', name: 'Jasper Stone', specialties: 'Numerology, Palmistry, Crystal Healing', rating: 4.7, imageUrl: 'https://picsum.photos/seed/reader4/400/300', status: 'online', shortBio: 'Uncovering the patterns and energies that shape your life. Practical and empowering.', dataAiHint: 'grounded man crystals' },
  { id: '5', name: 'Willow Whisperwind', specialties: 'Herbalism, Faery Magick, Nature Spirits', rating: 4.9, imageUrl: 'https://picsum.photos/seed/reader5/400/300', status: 'offline', shortBio: 'Ancient earth wisdom and guidance from the elemental realms. Gentle and profound.', dataAiHint: 'nature woman forest' },
  { id: '6', name: 'Solstice Fire', specialties: 'Astrology, I-Ching, Meditation Guide', rating: 4.6, imageUrl: 'https://picsum.photos/seed/reader6/400/300', status: 'online', shortBio: 'Illuminating your cosmic blueprint and guiding you towards inner peace.', dataAiHint: 'spiritual teacher sun' },
];

// This page should be a client component to handle state for filters if interactivity is added.
// For now, keeping it as a server component with static display.

export default function ReadersPage() {
  // const [showFilters, setShowFilters] = React.useState(false); // Example for client component

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>Meet Our Gifted Readers</PageTitle>
      <p className="text-center text-lg text-foreground/80 font-playfair-display max-w-2xl mx-auto mb-12">
        Explore our diverse collective of experienced spiritual advisors. Find the perfect guide to illuminate your path and offer the clarity you seek.
      </p>

      {/* Filters and Search Section */}
      <div className="mb-10 p-4 md:p-6 bg-[hsl(var(--card)/0.5)] rounded-lg border border-[hsl(var(--border)/0.5)] shadow-md">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:flex-grow">
            <Input
              type="search"
              placeholder="Search readers by name or specialty..."
              className="pl-10 pr-4 py-3 bg-input text-foreground placeholder:text-muted-foreground"
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
              <DropdownMenuCheckboxItem>Tarot</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Astrology</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Clairvoyance</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Mediumship</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Runes</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select>
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

      {/* Readers Grid */}
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
            It seems there are no readers matching your criteria at the moment. Please try adjusting your filters.
          </p>
        </div>
      )}

      {/* Pagination Placeholder */}
      {readersData.length > 0 && (
        <div className="mt-16 flex justify-center">
          <Button variant="outline" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] mx-1">Previous</Button>
          <Button variant="outline" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] mx-1">1</Button>
          <Button variant="ghost" className="mx-1">2</Button>
          <Button variant="ghost" className="mx-1">3</Button>
          <Button variant="outline" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] mx-1">Next</Button>
        </div>
      )}
    </div>
  );
}
