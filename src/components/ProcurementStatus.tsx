import { Badge } from "@/components/ui/badge"
import type { ProcurementStatus as ProcurementStatusType } from "@/types/database"

export function ProcurementStatus({ status }: { status: ProcurementStatusType }) {
  const tone = status === "delivered" ? "pass" : status === "failed" ? "fail" : "run"
  const label =
    status === "delivered"
      ? "Delivered"
      : status === "failed"
        ? "Failed"
        : status === "delivering"
          ? "Delivering"
          : "Pending"

  return (
    <Badge tone={tone}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tone === "pass" ? "bg-[var(--pass)]" : tone === "fail" ? "bg-[var(--fail)]" : "bg-[var(--run)]"
        }`}
        aria-hidden
      />
      {label}
    </Badge>
  )
}
