// Simple ComplianceCalendar (reuse from DVIR dashboard, but inline for now)
function ComplianceCalendar({ data, onDayClick }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Group data by week
  const weeks = [];
  let week = [];
  let lastDate = null;
  data.forEach((d, i) => {
    const date = new Date(d.date);
    if (i === 0) {
      for (let j = 0; j < (date.getDay() + 6) % 7; j++) week.push(null);
    }
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    lastDate = date;
  });
  if (week.length) weeks.push(week);

  function getColor(d) {
    if (!d) return "bg-gray-100";
    if (d.total === 0) return "bg-gray-200";
    if (d.compliant === d.total) return "bg-green-400";
    if (d.noncompliant === d.total) return "bg-red-400";
    return "bg-yellow-300";
  }

  return (
    <div>
      <div className="mb-2 font-semibold">Compliance Calendar</div>
      <table className="border text-xs">
        <thead>
          <tr>
            {days.map((day) => (
              <th key={day} className="border px-2 py-1">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, i) => (
            <tr key={i}>
              {w.map((d, j) => (
                <td
                  key={j}
                  className={`border w-12 h-12 text-center cursor-pointer ${getColor(d)}`}
                  onClick={() => d && onDayClick && onDayClick(d.date)}
                  title={
                    d ? `${d.date}: ${d.compliant}/${d.total} compliant` : ""
                  }
                >
                  {d ? new Date(d.date).getDate() : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
