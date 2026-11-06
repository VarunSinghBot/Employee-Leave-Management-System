import { cn } from "../../utils/format.util";

interface Tab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

// Pill-style tab group (like "General / News / Amazon")
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition",
            value === tab.value ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn("rounded-md px-1.5 text-[11px]", value === tab.value ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-600")}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
