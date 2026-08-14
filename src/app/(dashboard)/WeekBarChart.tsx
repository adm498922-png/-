type Day = { label: string; date: string; count: number };

export default function WeekBarChart({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const todayKey = new Date().toDateString();

  return (
    <div className="flex items-end gap-3">
      {days.map((day, i) => {
        const isToday = new Date(day.date).toDateString() === todayKey;
        const heightPx = Math.max(4, Math.round((day.count / max) * 96));
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-medium text-neutral-300">
              {day.count > 0 ? day.count : ""}
            </span>
            <div className="flex h-24 w-full max-w-6 items-end justify-center">
              <div
                title={`${day.label}: ${day.count}개`}
                style={{
                  height: `${heightPx}px`,
                  backgroundColor: isToday ? "#3987e5" : "#3987e5b3",
                }}
                className="w-full max-w-6 rounded-t"
              />
            </div>
            <span className="text-xs text-neutral-500">{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}
