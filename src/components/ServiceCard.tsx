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
      className={`${bgColor} rounded-2xl p-4 text-center transition-transform hover:scale-105 flex flex-col items-center justify-center min-h-[180px] w-full`}
    >
      <div className={`${iconBg === "bg-transparent" ? "" : iconBg} ${title === "Ask Karma" ? "w-36 h-36" : "w-28 h-28"} ${iconBg !== "bg-transparent" ? "rounded-xl" : ""} flex items-center justify-center mb-3 overflow-hidden flex-shrink-0`}>
        {icon}
      </div>
      <div className={`${textColor} font-semibold text-sm mt-auto`}>
        {title}
      </div>
    </button>
  );
});

ServiceCard.displayName = 'ServiceCard';


