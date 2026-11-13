import { BUSINESS, OPENING_HOURS, SITE_URL as siteUrl } from "@/config/site";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Groups identical opening hours into schema.org OpeningHoursSpecification entries. */
function openingHoursSpecification() {
  const groups = new Map<string, string[]>();
  for (let day = 0; day < 7; day++) {
    const hours = OPENING_HOURS[day];
    if (!hours) continue;
    const key = `${hours.open}-${hours.close}`;
    groups.set(key, [...(groups.get(key) ?? []), DAY_NAMES[day]]);
  }
  return Array.from(groups, ([key, days]) => {
    const [opens, closes] = key.split("-");
    return { "@type": "OpeningHoursSpecification", dayOfWeek: days, opens, closes };
  });
}

/** Safe JSON for an inline <script>: prevents "</script>" breaking out. */
function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export function LocalBusinessSchema() {
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "@id": `${siteUrl}/#organization`,
    name: BUSINESS.name,
    alternateName: BUSINESS.alternateName,
    description: "Професионален козметичен салон предлагащ маникюр, педикюр, лазерна епилация, мигли, вежди и терапии за лице в София и Лом.",
    url: siteUrl,
    logo: `${siteUrl}/logo.svg`,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    priceRange: "$$",
    currenciesAccepted: "EUR",
    paymentAccepted: "Cash, Card",
    openingHoursSpecification: openingHoursSpecification(),
    address: [
      {
        "@type": "PostalAddress",
        addressLocality: "София",
        addressRegion: "София-град",
        addressCountry: "BG",
      },
      {
        "@type": "PostalAddress",
        addressLocality: "Лом",
        addressRegion: "Монтана",
        addressCountry: "BG",
      },
    ],
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
    sameAs: [BUSINESS.facebook, BUSINESS.instagram],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={jsonLd(structuredData)}
    />
  );
}

export function WebsiteSchema() {
  
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
    inLanguage: "bg-BG",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={jsonLd(structuredData)}
    />
  );
}
