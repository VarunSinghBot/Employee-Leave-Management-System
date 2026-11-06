import { RotateCcw, Search } from "lucide-react";
import { LEAVE_POLICY, LEAVE_STATUS, LEAVE_TYPES } from "@elms/shared";
import type { LeaveFilterValues } from "../../services/leave.service";
import { STATUS_META } from "../../constants/ui.constants";
import { Input, Select } from "../ui/Field";
import { Button } from "../ui/Button";

interface LeaveFiltersProps {
  values: LeaveFilterValues;
  onChange: (patch: Partial<LeaveFilterValues>) => void;
  onReset: () => void;
  showSearch?: boolean;
  showStatus?: boolean;
}

const currentYear = new Date().getFullYear();
const YEARS = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

export function LeaveFilters({ values, onChange, onReset, showSearch, showStatus = true }: LeaveFiltersProps) {
  return (
    <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-5 py-4 md:grid-cols-3 xl:grid-cols-6">
      {showSearch && (
        <div className="relative col-span-2 md:col-span-3 xl:col-span-1">
          <Search className="pointer-events-none absolute top-3 left-3 size-4 text-slate-400" />
          <Input
            placeholder="Employee or reason"
            value={values.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="[&_input]:pl-9"
            aria-label="Search"
          />
        </div>
      )}
      {showStatus && (
        <Select value={values.status} onChange={(e) => onChange({ status: e.target.value })} aria-label="Status">
          <option value="">All statuses</option>
          {Object.values(LEAVE_STATUS).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
      )}
      <Select value={values.type} onChange={(e) => onChange({ type: e.target.value })} aria-label="Leave type">
        <option value="">All leave types</option>
        {Object.values(LEAVE_TYPES).map((t) => (
          <option key={t} value={t}>
            {LEAVE_POLICY[t].label}
          </option>
        ))}
      </Select>
      <Select value={values.year} onChange={(e) => onChange({ year: e.target.value })} aria-label="Year">
        <option value="">Any year</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
      <Input type="date" value={values.from} onChange={(e) => onChange({ from: e.target.value })} aria-label="From date" title="From date" />
      <div className="flex gap-2">
        <Input type="date" value={values.to} onChange={(e) => onChange({ to: e.target.value })} aria-label="To date" title="To date" className="flex-1" />
        <Button variant="secondary" onClick={onReset} title="Reset filters" aria-label="Reset filters" className="w-10 shrink-0 px-0">
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
