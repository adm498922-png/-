type Day = { label: string; date: string; count: number };

export default function WeekBarChart({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const todayKey = new Date().toDateString();

  return (
    <div className="flex items-end gap-2">
      {days.map((day, i) => {
        const isToday = new Date(day.date).toDateString() === todayKey;
        const heightPx = Math.max(3, Math.round((day.count / max) * 48));
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-neutral-400">
              {day.count > 0 ? day.count : ""}
            </span>
            <div className="flex h-12 w-full max-w-5 items-end justify-center">
              <div
                title={`${day.label}: ${day.count}개`}
                style={{
                  height: `${heightPx}px`,
                  backgroundColor: isToday ? "#3987e5" : "#3987e5b3",
                }}
                className="w-full max-w-5 rounded-t"
              />
            </div>
            <span className="text-[10px] text-neutral-500">{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}
