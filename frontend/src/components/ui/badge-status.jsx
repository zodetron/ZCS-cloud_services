import { cn } from "@/lib/utils";

const statusConfig = {
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  inactive: { label: "Inactive", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  suspended: { label: "Suspended", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  overdue: { label: "Overdue", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  revoked: { label: "Revoked", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  pro: { label: "Pro", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  free: { label: "Free", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  enterprise: { label: "Enterprise", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
};

export function BadgeStatus({ status, className }) {
  const config = statusConfig[status] || { label: status, className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
