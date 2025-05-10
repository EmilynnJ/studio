import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow relative"> {/* Ensure main content can have z-index if needed for background overlay */}
        {children}
      </main>
      <Footer />
    </div>
  );
}
