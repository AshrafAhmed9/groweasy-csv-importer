interface StatCardProps {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
}

const TONE_CLASSES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function StatCard({ label, value, tone = "default", icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
      {icon && <div className={`shrink-0 ${TONE_CLASSES[tone]}`}>{icon}</div>}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{label}</p>
        <p className={`text-2xl font-semibold ${TONE_CLASSES[tone]}`}>{value}</p>
      </div>
    </div>
  );
}
