import { useState } from "react";
import { X as CloseIcon, Share2, Link, Copy, Check } from "lucide-react";
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";

// WhatsApp Icon Component with original green color
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={className} fill="#25D366">
    <path d="M476.9 161.1C435 119.1 379.2 96 319.9 96C197.5 96 97.9 195.6 97.9 318C97.9 357.1 108.1 395.3 127.5 429L96 544L213.7 513.1C246.1 530.8 282.6 540.1 319.8 540.1L319.9 540.1C442.2 540.1 544 440.5 544 318.1C544 258.8 518.8 203.1 476.9 161.1zM319.9 502.7C286.7 502.7 254.2 493.8 225.9 477L219.2 473L149.4 491.3L168 423.2L163.6 416.2C145.1 386.8 135.4 352.9 135.4 318C135.4 216.3 218.2 133.5 320 133.5C369.3 133.5 415.6 152.7 450.4 187.6C485.2 222.5 506.6 268.8 506.5 318.1C506.5 419.9 421.6 502.7 319.9 502.7zM421.1 364.5C415.6 361.7 388.3 348.3 383.2 346.5C378.1 344.6 374.4 343.7 370.7 349.3C367 354.9 356.4 367.3 353.1 371.1C349.9 374.8 346.6 375.3 341.1 372.5C308.5 356.2 287.1 343.4 265.6 306.5C259.9 296.7 271.3 297.4 281.9 276.2C283.7 272.5 282.8 269.3 281.4 266.5C280 263.7 268.9 236.4 264.3 225.3C259.8 214.5 255.2 216 251.8 215.8C248.6 215.6 244.9 215.6 241.2 215.6C237.5 215.6 231.5 217 226.4 222.5C221.3 228.1 207 241.5 207 268.8C207 296.1 226.9 322.5 229.6 326.2C232.4 329.9 268.7 385.9 324.4 410C359.6 425.2 373.4 426.5 391 423.9C401.7 422.3 423.8 410.5 428.4 397.5C433 384.5 433 373.4 431.6 371.1C430.3 368.6 426.6 367.2 421.1 364.5z"/>
  </svg>
);

// X (Twitter) Icon Component with original black color
const XIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={className} fill="currentColor">
    <path d="M453.2 112L523.8 112L369.6 288.2L551 528L409 528L297.7 382.6L170.5 528L99.8 528L264.7 339.5L90.8 112L236.4 112L336.9 244.9L453.2 112zM428.4 485.8L467.5 485.8L215.1 152L173.1 152L428.4 485.8z"/>
  </svg>
);

// Facebook Icon Component with original blue color
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={className} fill="#1877F2">
    <path d="M576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 440 146.7 540.8 258.2 568.5L258.2 398.2L205.4 398.2L205.4 320L258.2 320L258.2 286.3C258.2 199.2 297.6 158.8 383.2 158.8C399.4 158.8 427.4 162 438.9 165.2L438.9 236C432.9 235.4 422.4 235 409.3 235C367.3 235 351.1 250.9 351.1 292.2L351.1 320L434.7 320L420.3 398.2L351 398.2L351 574.1C477.8 558.8 576 450.9 576 320z"/>
  </svg>
);

// Instagram Icon Component with original gradient colors
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={className}>
    <defs>
      <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#833AB4" />
        <stop offset="50%" stopColor="#E1306C" />
        <stop offset="100%" stopColor="#FCAF45" />
      </linearGradient>
    </defs>
    <path fill="url(#instagram-gradient)" d="M320.3 205C256.8 204.8 205.2 256.2 205 319.7C204.8 383.2 256.2 434.8 319.7 435C383.2 435.2 434.8 383.8 435 320.3C435.2 256.8 383.8 205.2 320.3 205zM319.7 245.4C360.9 245.2 394.4 278.5 394.6 319.7C394.8 360.9 361.5 394.4 320.3 394.6C279.1 394.8 245.6 361.5 245.4 320.3C245.2 279.1 278.5 245.6 319.7 245.4zM413.1 200.3C413.1 185.5 425.1 173.5 439.9 173.5C454.7 173.5 466.7 185.5 466.7 200.3C466.7 215.1 454.7 227.1 439.9 227.1C425.1 227.1 413.1 215.1 413.1 200.3zM542.8 227.5C541.1 191.6 532.9 159.8 506.6 133.6C480.4 107.4 448.6 99.2 412.7 97.4C375.7 95.3 264.8 95.3 227.8 97.4C192 99.1 160.2 107.3 133.9 133.5C107.6 159.7 99.5 191.5 97.7 227.4C95.6 264.4 95.6 375.3 97.7 412.3C99.4 448.2 107.6 480 133.9 506.2C160.2 532.4 191.9 540.6 227.8 542.4C264.8 544.5 375.7 544.5 412.7 542.4C448.6 540.7 480.4 532.5 506.6 506.2C532.8 480 541 448.2 542.8 412.3C544.9 375.3 544.9 264.5 542.8 227.5zM495 452C487.2 471.6 472.1 486.7 452.4 494.6C422.9 506.3 352.9 503.6 320.3 503.6C287.7 503.6 217.6 506.2 188.2 494.6C168.6 486.8 153.5 471.7 145.6 452C133.9 422.5 136.6 352.5 136.6 319.9C136.6 287.3 134 217.2 145.6 187.8C153.4 168.2 168.5 153.1 188.2 145.2C217.7 133.5 287.7 136.2 320.3 136.2C352.9 136.2 423 133.6 452.4 145.2C472 153 487.1 168.1 495 187.8C506.7 217.3 504 287.3 504 319.9C504 352.5 506.7 422.6 495 452z"/>
  </svg>
);

interface AppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppShareModal = ({ isOpen, onClose }: AppShareModalProps) => {
  const [copied, setCopied] = useState(false);
  
  const appName = "KarmaTerra";
  const shareText = `Check out ${appName} - Your AI-powered skin and hair analysis companion! Discover personalized skincare and haircare recommendations.`;
  const shareUrl = "https://karmaterra-official-2026.vercel.app/";
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const handleShare = async (platform: string) => {
    let shareLink = '';

    switch (platform) {
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        window.open(shareLink, '_blank');
        toast.success("Opening WhatsApp...");
        break;
      
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        window.open(shareLink, '_blank', 'width=600,height=400');
        toast.success("Opening Facebook...");
        break;
      
      case 'instagram':
        // Copy link and guide user to send in DM
        await copyToClipboard();
        
        // Try to open Instagram app (works on mobile)
        if (Capacitor.isNativePlatform()) {
          try {
            // Try to open Instagram app using a hidden link (safer than window.location)
            const instagramUrl = 'instagram://direct-inbox';
            const link = document.createElement('a');
            link.href = instagramUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show success message
            toast.success("Link copied! Opening Instagram DM...", {
              duration: 3000,
            });
            
            // Fallback message after delay
            setTimeout(() => {
              toast.info("If Instagram didn't open, paste the link in your DM manually.", {
                duration: 4000,
              });
            }, 2000);
          } catch (error) {
            toast.success("Link copied! Open Instagram and send it in a DM message.", {
              duration: 4000,
            });
          }
        } else {
          // For web, try to open Instagram web or show instructions
          try {
            // Try Instagram web URL
            window.open('https://www.instagram.com/direct/inbox/', '_blank');
            toast.success("Link copied! Send it in the Instagram DM that opened.", {
              duration: 4000,
            });
          } catch (error) {
            toast.success("Link copied! Open Instagram and send it in a DM message.", {
              duration: 4000,
            });
          }
        }
        break;
      
      case 'x':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        window.open(shareLink, '_blank', 'width=600,height=400');
        toast.success("Opening X...");
        break;
      
      case 'native':
        // Use native share (Android/iOS)
        if (Capacitor.isNativePlatform()) {
          try {
            await Share.share({
              title: `Share ${appName}`,
              text: shareText,
              url: shareUrl,
              dialogTitle: `Share ${appName}`,
            });
            toast.success("Share dialog opened!");
          } catch (error) {
            console.error('Error sharing:', error);
          }
        } else {
          // Use Web Share API
          if (navigator.share) {
            try {
              await navigator.share({
                title: appName,
                text: shareText,
                url: shareUrl,
              });
              toast.success("Shared successfully!");
            } catch (error: any) {
              if (error.name !== 'AbortError') {
                await copyToClipboard();
              }
            }
          } else {
            await copyToClipboard();
          }
        }
        break;
      
      case 'copy':
        await copyToClipboard();
        break;
      
      default:
        break;
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  if (!isOpen) return null;

  const shareOptions = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: WhatsAppIcon,
      color: 'bg-white hover:bg-gray-50 border-2 border-[#25D366]',
      textColor: 'text-[#25D366]'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: FacebookIcon,
      color: 'bg-white hover:bg-gray-50 border-2 border-[#1877F2]',
      textColor: 'text-[#1877F2]'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: InstagramIcon,
      color: 'bg-white hover:bg-gray-50 border-2 border-transparent',
      textColor: 'text-gray-800'
    },
    {
      id: 'x',
      name: 'X',
      icon: XIcon,
      color: 'bg-black hover:bg-gray-800',
      textColor: 'text-white'
    },
    {
      id: 'native',
      name: Capacitor.isNativePlatform() ? 'More Options' : 'Share',
      icon: Share2,
      color: 'bg-karma-green hover:bg-green-600',
      textColor: 'text-white'
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: copied ? Check : Copy,
      color: copied ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600',
      textColor: 'text-white'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-karma-green rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Share {appName}</h2>
              <p className="text-sm text-gray-500">Help others discover our app!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Share Options */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {shareOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleShare(option.id)}
                  className={`${option.color} ${option.textColor} p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-md`}
                  aria-label={`Share via ${option.name}`}
                >
                  <IconComponent className="w-8 h-8" />
                  <span className="font-semibold text-sm">{option.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppShareModal;


