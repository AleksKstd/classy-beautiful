export function LocalBusinessSchema() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://classybeautiful.bg";
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "@id": `${siteUrl}/#organization`,
    name: "Classy & Beautiful",
    alternateName: "CB Classy & Beautiful",
    description: "Професионален козметичен салон предлагащ маникюр, педикюр, лазерна епилация, мигли, вежди и терапии за лице в София и Лом.",
    url: siteUrl,
    logo: `${siteUrl}/logo.svg`,
    image: `${siteUrl}/og-image.jpg`,
    telephone: "+359878378083",
    email: "info@classybeautiful.bg",
    priceRange: "$$",
    currenciesAccepted: "BGN",
    paymentAccepted: "Cash, Card",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "19:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "10:00",
        closes: "17:00",
      },
    ],
    address: [
      {
        "@type": "PostalAddress",
        addressLocality: "София",
        addressRegion: "София-град",
        addressCountry: "BG",
        streetAddress: "ул. Примерна 1",
      },
      {
        "@type": "PostalAddress",
        addressLocality: "Лом",
        addressRegion: "Монтана",
        addressCountry: "BG",
        streetAddress: "ул. Примерна 2",
      },
    ],
    geo: {
      "@type": "GeoCoordinates",
      latitude: 42.6977,
      longitude: 23.3219,
    },
    areaServed: [
      { "@type": "City", name: "София" },
      { "@type": "City", name: "Лом" },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Козметични услуги",
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Маникюр и педикюр",
          itemListElement: [
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Класически маникюр" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Гел лак маникюр" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Педикюр" } },
          ],
        },
        {
          "@type": "OfferCatalog",
          name: "Лазерна епилация",
          itemListElement: [
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Лазерна епилация жени" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Лазерна епилация мъже" } },
          ],
        },
        {
          "@type": "OfferCatalog",
          name: "Мигли и вежди",
          itemListElement: [
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Ламиниране на мигли" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Оформяне на вежди" } },
          ],
        },
      ],
    },
    sameAs: [
      "https://www.facebook.com/classybeautiful",
      "https://www.instagram.com/classybeautiful",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function WebsiteSchema() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://classybeautiful.bg";
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: "Classy & Beautiful",
    description: "Елегантен салон за красота в София и Лом",
    publisher: {
      "@id": `${siteUrl}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/reserve?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "bg-BG",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
