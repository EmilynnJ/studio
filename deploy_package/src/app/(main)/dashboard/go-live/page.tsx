
import LiveStreamContainer from '@/components/stream/LiveStreamContainer';
import { PageTitle } from '@/components/ui/page-title';

export default function GoLivePage() {
  // LiveStreamContainer will use useAuth to get the current user (streamer)
  // and operate in streamer mode when viewerMode is false.
  return (
    <div className="h-screen max-h-screen overflow-hidden">
       {/* <PageTitle>Go Live!</PageTitle> */}
      <LiveStreamContainer viewerMode={false} />
    </div>
  );
}
