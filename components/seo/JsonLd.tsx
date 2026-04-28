// Componentă pentru injectare JSON-LD structured data.
// Escape-uim "<" în output ca să nu poată evada din <script>.
//
// Usage:
//   <JsonLd data={organizationSchema()} />
//   <JsonLd data={[serviceSchema(...), breadcrumbSchema(...)]} />

export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
