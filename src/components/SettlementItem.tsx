import { motion } from "framer-motion";
import { Settlement } from "@/hooks/useSettlements";
import { GroupMember } from "@/hooks/useGroups";

interface SettlementItemProps {
  settlement: Settlement;
  members: GroupMember[];
  index?: number;
  onEdit: (settlement: Settlement) => void;
  currentUserId?: string;
}

export function SettlementItem({
  settlement,
  members,
  onEdit,
  currentUserId,
}: SettlementItemProps) {
  const fromMember = members.find((m) => m.user_id === settlement.from_user);
  const toMember = members.find((m) => m.user_id === settlement.to_user);
  const canEdit = !!currentUserId;

  const formattedDate = new Date(settlement.date).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });

  return (
    <motion.button
      type="button"
      whileTap={canEdit ? { scale: 0.98 } : undefined}
      className={`
        group w-full text-left appearance-none border-0
        flex items-center justify-between gap-4 py-3
        bg-transparent transition-colors duration-150 touch-pan-y
        ${canEdit ? "cursor-pointer active:bg-muted/30 focus:outline-none" : "cursor-default"}
      `}
      onClick={() => canEdit && onEdit(settlement)}
      tabIndex={canEdit ? 0 : -1}
      onKeyDown={(e) => {
        if (canEdit && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onEdit(settlement);
        }
      }}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-medium text-foreground">
            Swish
          </p>
          <span className="text-[11px] px-1.5 py-0.5 bg-primary/10 rounded text-primary shrink-0">
            Betalning
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mt-0.5">
          <span>{fromMember?.name || "Okänd"}</span>
          <span className="opacity-60">→</span>
          <span>{toMember?.name || "Okänd"}</span>
          <span className="opacity-40">•</span>
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Amount */}
      <span className="text-[15px] font-semibold text-primary tabular-nums shrink-0">
        {Math.round(settlement.amount).toLocaleString("sv-SE")} kr
      </span>
    </motion.button>
  );
}
