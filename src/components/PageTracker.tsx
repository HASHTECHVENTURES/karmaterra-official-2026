import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';
import { SEOHead } from './SEOHead';

interface PageTrackerProps {
  title?: string;
  description?: string;
}

export const PageTracker = ({ title, description }: PageTrackerProps) => {
  const location = useLocation();

  useEffect(() => {
    // Track page view for analytics
    trackPageView(location.pathname);
  }, [location.pathname]);

  if (title || description) {
    return <SEOHead title={title} description={description} />;
  }

  return null;
};

