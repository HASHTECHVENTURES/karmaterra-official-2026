import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const getBreadcrumbLabel = (path: string): string => {
    const labels: Record<string, string> = {
      'know-your-skin': 'Know Your Skin',
      'know-your-hair': 'Know Your Hair',
      'hair-analysis': 'Hair Analysis',
      'ask-karma': 'Ask Karma',
      'profile': 'Profile',
      'blogs': 'Blogs',
      'market': 'Shop',
      'feedback': 'Feedback',
      'help': 'Help',
      'community': 'Community',
      'ingredients': 'Ingredients',
      'progress-tracking': 'Progress Tracking',
    };
    return labels[path] || path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/' },
    ...pathnames.map((path, index) => ({
      label: getBreadcrumbLabel(path),
      path: `/${pathnames.slice(0, index + 1).join('/')}`,
    })),
  ];

  // Don't show breadcrumbs on home page
  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4 px-4" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <div key={crumb.path} className="flex items-center gap-2">
            {index === 0 ? (
              <Link
                to={crumb.path}
                className="flex items-center gap-1 hover:text-karma-gold transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="sr-only">Home</span>
              </Link>
            ) : (
              <>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                {isLast ? (
                  <span className="text-gray-800 font-medium" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="hover:text-karma-gold transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
};


