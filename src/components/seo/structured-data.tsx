import { BUSINESS, OFFICES, OFFICE_DETAILS, OPENING_HOURS, SITE_URL, mapsUrl, type OfficeName } from "@/config/site";
import { getFinalPrice } from "@/lib/pricing";
import type { Procedure } from "@/types/database";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORGANIZATION_ID = `${SITE_URL}/#organization`;

const SALON_SEO: Record<OfficeName, { slug: string; region: string }> = {
  "София": { slug: "sofia", region: "София-град" },
  "Лом": { slug: "lom", region: "Монтана" },
};

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

function JsonLd({ data }: { data: unknown }) {
  // Escaping "<" keeps a "</script>" inside the data from closing the tag.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** The company, one BeautySalon per location, and the website. Rendered on every page. */
export function SiteSchema() {
  const salons = OFFICES.map((office) => {
    const { slug, region } = SALON_SEO[office];
    const address = OFFICE_DETAILS[office].address;
    const map = mapsUrl(office);
    return {
      "@type": "BeautySalon",
      "@id": `${SITE_URL}/#salon-${slug}`,
      name: `${BUSINESS.name} ${office}`,
      url: SITE_URL,
      image: `${SITE_URL}/og-image.jpg`,
      telephone: BUSINESS.phone,
      priceRange: "€€",
      currenciesAccepted: "EUR",
      parentOrganization: { "@id": ORGANIZATION_ID },
      openingHoursSpecification: openingHoursSpecification(),
      address: {
        "@type": "PostalAddress",
        ...(address ? { streetAddress: address } : {}),
        addressLocality: office,
        addressRegion: region,
        addressCountry: "BG",
      },
      areaServed: { "@type": "City", name: office },
      ...(map ? { hasMap: map } : {}),
      potentialAction: {
        "@type": "ReserveAction",
        target: `${SITE_URL}/rezervacii`,
        name: "Запази час",
      },
    };
  });

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": ORGANIZATION_ID,
            name: BUSINESS.name,
            alternateName: BUSINESS.alternateName,
            url: SITE_URL,
            logo: `${SITE_URL}/logo.svg`,
            telephone: BUSINESS.phone,
                  sameAs: [BUSINESS.facebook, BUSINESS.instagram],
          },
          ...salons,
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: BUSINESS.name,
            description: "Салон за красота в София и Лом",
            publisher: { "@id": ORGANIZATION_ID },
            inLanguage: "bg-BG",
          },
        ],
      }}
    />
  );
}

/** Breadcrumb trail for a page directly under the home page. */
export function BreadcrumbSchema({ name, path }: { name: string; path: string }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Начало", item: SITE_URL },
          { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${path}` },
        ],
      }}
    />
  );
}

/** The real price list, grouped by category, so search engines can read services and prices. */
export function PriceListSchema({ procedures }: { procedures: Procedure[] }) {
  if (procedures.length === 0) return null;

  const byType = new Map<string, Procedure[]>();
  for (const procedure of procedures) {
    byType.set(procedure.type, [...(byType.get(procedure.type) ?? []), procedure]);
  }

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "OfferCatalog",
        "@id": `${SITE_URL}/proceduri#cenorazpis`,
        name: "Процедури и цени",
        url: `${SITE_URL}/proceduri`,
        provider: { "@id": ORGANIZATION_ID },
        itemListElement: Array.from(byType, ([type, items]) => ({
          "@type": "OfferCatalog",
          name: type,
          itemListElement: items.map((procedure) => ({
            "@type": "Offer",
            price: getFinalPrice(procedure).toFixed(2),
            priceCurrency: "EUR",
            itemOffered: {
              "@type": "Service",
              name: procedure.name,
              provider: { "@id": ORGANIZATION_ID },
            },
          })),
        })),
      }}
    />
  );
}
