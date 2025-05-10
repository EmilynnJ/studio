import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Sparkles } from 'lucide-react';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  dataAiHint?: string;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <CardHeader className="p-0 relative">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={400}
          height={300}
          className="object-cover w-full h-48 md:h-56 opacity-90 group-hover:opacity-100 transition-opacity"
          data-ai-hint={product.dataAiHint || 'spiritual item'}
        />
         <div className="absolute top-2 right-2 bg-[hsl(var(--primary)/0.8)] text-[hsl(var(--primary-foreground))] px-2 py-1 rounded-full text-xs font-playfair-display backdrop-blur-sm">
          {product.category}
        </div>
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <CardTitle className="text-2xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-2">{product.name}</CardTitle>
        <CardDescription className="text-sm text-foreground/80 font-playfair-display mb-3 line-clamp-3">{product.description}</CardDescription>
        <p className="text-xl font-semibold text-[hsl(var(--soulseer-gold))] font-playfair-display">${product.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
