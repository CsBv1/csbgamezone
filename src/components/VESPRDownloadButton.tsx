import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';

const VESPR_APP_STORE_URL = 'https://apps.apple.com/app/vespr-cardano-wallet/id1565749376';
const VESPR_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=art.nft_craze.gallery.main';

interface VESPRDownloadButtonProps {
  className?: string;
}

export const VESPRDownloadButton = ({ className = '' }: VESPRDownloadButtonProps) => {
  const handleDownload = () => {
    // Detect if iOS or Android
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) {
      window.open(VESPR_APP_STORE_URL, '_blank');
    } else if (isAndroid) {
      window.open(VESPR_PLAY_STORE_URL, '_blank');
    } else {
      // Desktop - show both options or default to App Store
      window.open(VESPR_APP_STORE_URL, '_blank');
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      className={`gap-2 border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/10 ${className}`}
    >
      <Download className="w-4 h-4" />
      Get VESPR Wallet
      <ExternalLink className="w-3 h-3" />
    </Button>
  );
};
