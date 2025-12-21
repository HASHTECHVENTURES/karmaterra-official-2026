import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

interface ServiceCardProps {
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  iconBg: string;
  textColor: string;
  onClick: () => void;
}

// Memoized service card to prevent unnecessary re-renders
export const ServiceCard = memo<ServiceCardProps>(({ title, icon, bgColor, iconBg, textColor, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`${bgColor} rounded-2xl p-6 text-center transition-transform hover:scale-105`}
    >
      <div className={`${iconBg} ${title === "Ask Karma" ? "w-12 h-12" : "w-16 h-16"} rounded-xl flex items-center justify-center mx-auto mb-3`}>
        <div className="text-white brightness-150">
          {icon}
        </div>
      </div>
      <div className={`${textColor} font-semibold text-sm`}>
        {title}
      </div>
    </button>
  );
});

ServiceCard.displayName = 'ServiceCard';


