
import LiveStreamContainer from '@/components/stream/LiveStreamContainer';
import { PageTitle } from '@/components/ui/page-title'; // If you want a page title above the container

export default function ViewStreamPage({ params }: { params: { streamerId: string } }) {
  // The LiveStreamContainer will use useParams to get streamerId internally
  // Or we can pass it as a prop if preferred.
  // For this setup, LiveStreamContainer already uses useParams.

  return (
    <div className="h-screen max-h-screen overflow-hidden">
      {/* Optional: Add a specific title or header for the viewing page if needed */}
      {/* <PageTitle>Watching Stream</PageTitle> */}
      <LiveStreamContainer viewerMode={true} />
    </div>
  );
}
