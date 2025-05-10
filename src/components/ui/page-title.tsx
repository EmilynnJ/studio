import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface PageTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: React.ReactNode;
}

export function PageTitle({ className, children, as: Component = 'h1', ...props }: PageTitleProps) {
  return (
    <Component
      className={cn(
        'text-4xl md:text-5xl lg:text-6xl font-alex-brush text-center my-8 tracking-wider page-title-text', // Added page-title-text
        'text-[hsl(var(--soulseer-header-pink))]', 
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
