export default function EndorsementBadge({ endorsement }: { endorsement: any }) {
  return (
    <span className="px-2 py-1 bg-blue-900 rounded text-xs mr-1">
      {endorsement}
    </span>
  );
}
