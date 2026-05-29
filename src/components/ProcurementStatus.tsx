import { Check, Clock, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { ProcurementStatus as ProcurementStatusType } from "@/types/database"

export function ProcurementStatus({ status }: { status: ProcurementStatusType }) {
  if (status === "delivered") {
    return (
      <Badge tone="success">
        <Check size={14} aria-hidden />
        Delivered
      </Badge>
    )
  }

  if (status === "failed") {
    return (
      <Badge tone="danger">
        <X size={14} aria-hidden />
        Failed
      </Badge>
    )
  }

  return (
    <Badge tone="warning">
      <Clock size={14} aria-hidden />
      {status === "delivering" ? "Delivering" : "Pending"}
    </Badge>
  )
}
