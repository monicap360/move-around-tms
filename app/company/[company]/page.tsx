// Company Dashboard Entry Point
export default async function CompanyPage(
  props: {
    params: Promise<{ company: string }>;
  }
) {
  const params = await props.params;
  return (
    <div style={{ padding: 40 }}>
      <h1>Company Dashboard: {params.company}</h1>
      <p>This is a clean, future-proof scaffold for company-specific routes.</p>
      {/* Add company-specific dashboard components here */}
    </div>
  );
}
