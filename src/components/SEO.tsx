import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: 'website' | 'product';
  /** Pass for product pages — rendered as product:price OG tags */
  price?: number;
  /** Pass for product pages — 'InStock' | 'OutOfStock' */
  availability?: string;
  structuredData?: object | object[];
  noIndex?: boolean;
}

export function SEO({
  title,
  description,
  canonical,
  ogImage = 'https://customerapp.mygendaphool.com/og-image.jpg',
  ogType = 'website',
  price,
  availability,
  structuredData,
  noIndex = false,
}: SEOProps) {
  const fullTitle = title.includes('Genda Phool')
    ? title
    : `${title} | Genda Phool`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Genda Phool" />
      <meta property="og:locale" content="en_IN" />

      {/* Product-specific OG tags */}
      {ogType === 'product' && price !== undefined && (
        <meta property="product:price:amount" content={String(price)} />
      )}
      {ogType === 'product' && (
        <meta property="product:price:currency" content="INR" />
      )}
      {ogType === 'product' && availability && (
        <meta property="product:availability" content={availability} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data — handles single object or array */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
