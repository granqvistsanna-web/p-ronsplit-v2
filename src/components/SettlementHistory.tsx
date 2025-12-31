import { Settlement } from "@/hooks/useSettlements";
import { GroupMember } from "@/hooks/useGroups";

interface SettlementHistoryProps {
  settlements: Settlement[];
  members: GroupMember[];
}

export function SettlementHistory({ settlements, members }: SettlementHistoryProps) {
  if (settlements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="rounded-full bg-muted p-3 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">Ingen historik ännu</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {settlements.map((settlement) => {
        const fromUser = members.find((u) => u.user_id === settlement.from_user);
        const toUser = members.find((u) => u.user_id === settlement.to_user);

        return (
          <div
            key={settlement.id}
            className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-xs font-semibold text-green-600 dark:text-green-400">
                  {fromUser?.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <span className="text-sm text-muted-foreground">→</span>
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {toUser?.name?.charAt(0).toUpperCase() || "?"}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {fromUser?.name || "Okänd"} → {toUser?.name || "Okänd"}
                </p>
                <p className="text-xs text-muted-foreground">{settlement.month}</p>
              </div>
            </div>
            <span className="text-number text-foreground">
              {settlement.amount.toLocaleString("sv-SE")} kr
            </span>
          </div>
        );
      })}
    </div>
  );
}
