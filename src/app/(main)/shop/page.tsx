
import { PageTitle } from '@/components/ui/page-title';
import { ProductCard, type Product } from '@/components/shop/product-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

const products: Product[] = [
  { id: '1', name: 'Amethyst Crystal Cluster', description: 'A beautiful, high-quality amethyst cluster for peace and spiritual awareness.', price: 45.99, imageUrl: 'https://picsum.photos/seed/amethyst/400/300', category: 'Crystals', dataAiHint: 'amethyst crystal' },
  { id: '2', name: 'Sage Smudge Sticks (3-Pack)', description: 'Purify your space and energy with these organic white sage smudge sticks.', price: 15.50, imageUrl: 'https://picsum.photos/seed/sage/400/300', category: 'Cleansing', dataAiHint: 'sage smudge' },
  { id: '3', name: 'The Rider-Waite Tarot Deck', description: 'The classic tarot deck, perfect for beginners and experienced readers alike.', price: 22.00, imageUrl: 'https://picsum.photos/seed/tarot/400/300', category: 'Divination', dataAiHint: 'tarot cards' },
  { id: '4', name: 'Moonstone Pendant Necklace', description: 'Elegant moonstone pendant known for enhancing intuition and feminine energy.', price: 79.00, imageUrl: 'https://picsum.photos/seed/moonstone/400/300', category: 'Jewelry', dataAiHint: 'moonstone necklace' },
  { id: '5', name: 'Tibetan Singing Bowl Set', description: 'Handcrafted singing bowl set for meditation, sound healing, and chakra balancing.', price: 65.00, imageUrl: 'https://picsum.photos/seed/singingbowl/400/300', category: 'Meditation', dataAiHint: 'singing bowl' },
  { id: '6', name: 'Lavender & Chamomile Incense', description: 'Calming incense sticks made with natural lavender and chamomile essential oils.', price: 12.99, imageUrl: 'https://picsum.photos/seed/incense/400/300', category: 'Aromatherapy', dataAiHint: 'incense sticks' },
];

export default function ShopPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <PageTitle>The SoulSeer Spiritual Shop</PageTitle>
      <p className="text-center text-lg text-foreground/80 font-playfair-display max-w-2xl mx-auto mb-12">
        Discover tools, treasures, and talismans to support your spiritual journey and enhance your well-being.
      </p>

      {/* Filters and Search */}
      <div className="mb-10 flex flex-col md:flex-row gap-4 items-center p-4 bg-[hsl(var(--card)/0.5)] rounded-lg border border-[hsl(var(--border)/0.5)]">
        <div className="relative w-full md:flex-grow">
          <Input
            type="search"
            placeholder="Search for enchanted items..."
            className="pl-10 bg-input text-foreground placeholder:text-muted-foreground"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
        <Select>
          <SelectTrigger className="w-full md:w-[200px] bg-input text-foreground">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent className="bg-popover text-popover-foreground">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="crystals">Crystals</SelectItem>
            <SelectItem value="cleansing">Cleansing Tools</SelectItem>
            <SelectItem value="divination">Divination Tools</SelectItem>
            <SelectItem value="jewelry">Jewelry</SelectItem>
            <SelectItem value="meditation">Meditation Aids</SelectItem>
            <SelectItem value="aromatherapy">Aromatherapy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

