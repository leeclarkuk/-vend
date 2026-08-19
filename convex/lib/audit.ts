import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function logAudit(
  ctx: MutationCtx,
  entry: {
    type: string;
    email: string;
    actor: string;
    eventId?: Id<"events">;
    details?: string;
  },
): Promise<void> {
  await ctx.db.insert("auditLog", {
    ...entry,
    createdAt: Date.now(),
  });
}
