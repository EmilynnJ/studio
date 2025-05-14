const fs = require('fs');
const path = require('path');

// Create minimal UI components
const components = {
  'components/ui/page-title.tsx': `'use client';
export function PageTitle({ children, ...props }) { return <h1 {...props}>{children}</h1>; }`,

  'components/ui/card.tsx': `'use client';
export const Card = (props) => <div {...props} />;
export const CardHeader = (props) => <div {...props} />;
export const CardTitle = (props) => <h3 {...props} />;
export const CardDescription = (props) => <p {...props} />;
export const CardContent = (props) => <div {...props} />;
export const CardFooter = (props) => <div {...props} />;`,

  'components/ui/button.tsx': `'use client';
export const Button = (props) => <button {...props} />;
export const buttonVariants = {};`,

  'components/ui/avatar.tsx': `'use client';
export const Avatar = (props) => <div {...props} />;
export const AvatarImage = (props) => <img {...props} />;
export const AvatarFallback = (props) => <div {...props} />;`,

  'components/ui/scroll-area.tsx': `'use client';
export const ScrollArea = (props) => <div {...props} />;
export const ScrollBar = (props) => <div {...props} />;`,

  'components/ui/tabs.tsx': `'use client';
export const Tabs = (props) => <div {...props} />;
export const TabsList = (props) => <div {...props} />;
export const TabsTrigger = (props) => <button {...props} />;
export const TabsContent = (props) => <div {...props} />;`,

  'components/ui/badge.tsx': `'use client';
export function Badge(props) { return <div {...props} />; }`,

  'contexts/auth-context.tsx': `'use client';
export function useAuth() { return { currentUser: null, loading: false }; }
export function AuthProvider({ children }) { return <>{children}</>; }`,

  'lib/firebase/firebase.ts': `export const db = { collection: () => ({}) };`,

  'hooks/use-toast.ts': `'use client';
export const useToast = () => ({ toast: () => {} });`
};

// Create all components in src directory
Object.entries(components).forEach(([file, content]) => {
  const filePath = path.join(__dirname, 'src', file);
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Created ${filePath}`);
});

// Fix all imports in all files
const fixImports = (dir) => {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      fixImports(fullPath);
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/from ' @/g, "from '@");
      fs.writeFileSync(fullPath, content);
    }
  }
};

fixImports(path.join(__dirname, 'src'));
console.log('All components created and imports fixed');
