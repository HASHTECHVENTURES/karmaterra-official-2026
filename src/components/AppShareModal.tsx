import { useState } from "react";
import { X, Share2, MessageCircle, Facebook, Instagram, Twitter, Link, Copy, Check } from "lucide-react";
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";

interface AppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppShareModal = ({ isOpen, onClose }: AppShareModalProps) => {
  const [copied, setCopied] = useState(false);
  
  const appName = "KarmaTerra";
  const shareText = `Check out ${appName} - Your AI-powered skin and hair analysis companion! Discover personalized skincare and haircare recommendations.`;
  const shareUrl = window.location.origin;
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
        // Instagram doesn't support direct URL sharing, so copy to clipboard
        await copyToClipboard();
        toast.info("Link copied! Paste it in your Instagram story or post.");
        break;
      
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        window.open(shareLink, '_blank', 'width=600,height=400');
        toast.success("Opening Twitter...");
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
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-white'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90',
      textColor: 'text-white'
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-sky-500 hover:bg-sky-600',
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
            <X className="w-5 h-5 text-gray-600" />
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

          {/* Share Text Preview */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Share message:</p>
            <p className="text-sm text-gray-800 italic">"{shareText}"</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppShareModal;

