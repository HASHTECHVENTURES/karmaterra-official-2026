import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
  className?: string;
}

export const ShareButton = ({ title, text, url, className }: ShareButtonProps) => {
  const handleShare = async () => {
    const shareUrl = url || window.location.href;

    if (Capacitor.isNativePlatform()) {
      // Use native share on mobile
      try {
        await Share.share({
          title,
          text,
          url: shareUrl,
          dialogTitle: 'Share KarmaTerra',
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Use Web Share API or fallback to clipboard
      if (navigator.share) {
        try {
          await navigator.share({
            title,
            text,
            url: shareUrl,
          });
        } catch (error) {
          // User cancelled or error occurred
          if ((error as Error).name !== 'AbortError') {
            fallbackShare(shareUrl);
          }
        }
      } else {
        fallbackShare(shareUrl);
      }
    }
  };

  const fallbackShare = async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } catch (error) {
      // Fallback: show URL in prompt
      prompt('Copy this link:', shareUrl);
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      size="sm"
      className={className}
      aria-label="Share"
    >
      <Share2 className="w-4 h-4 mr-2" />
      Share
    </Button>
  );
};


