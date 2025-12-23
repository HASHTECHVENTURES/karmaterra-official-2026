import { useEffect } from 'react';

interface StructuredDataProps {
  type: 'Organization' | 'WebSite' | 'WebPage' | 'Article' | 'BreadcrumbList';
  data: Record<string, any>;
}

export const StructuredData = ({ type, data }: StructuredDataProps) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = `structured-data-${type.toLowerCase()}`;
    
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': type,
      ...data,
    };

    script.textContent = JSON.stringify(jsonLd);
    
    // Remove existing script if present
    const existing = document.getElementById(script.id);
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById(script.id);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [type, data]);

  return null;
};

// Pre-configured structured data components
export const OrganizationSchema = () => (
  <StructuredData
    type="Organization"
    data={{
      name: 'KarmaTerra',
      url: 'https://karmaterra.in',
      logo: 'https://karmaterra.in/app-icon.png',
      description: 'Your comprehensive skincare and haircare companion app with AI-powered analysis',
      sameAs: [
        // Add social media links here
      ],
    }}
  />
);

export const WebSiteSchema = () => (
  <StructuredData
    type="WebSite"
    data={{
      name: 'KarmaTerra',
      url: 'https://karmaterra.in',
      description: 'Your comprehensive skincare and haircare companion app with AI-powered analysis',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://karmaterra.in/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    }}
  />
);

export const BreadcrumbSchema = ({ items }: { items: Array<{ name: string; url: string }> }) => (
  <StructuredData
    type="BreadcrumbList"
    data={{
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    }}
  />
);




