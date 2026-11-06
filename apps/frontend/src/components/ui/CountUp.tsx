import { useCountUp } from "../../hooks/useCountUp";

export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const display = useCountUp(value);
  return (
    <span className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}
