-- 0005_add_guard_i4c_roles — additive. Adds two ActorRole values: GUARD (ATM
-- Site Guard — read-only, identity-free duty-post visibility) and I4C
-- (Intelligence Analyst, I4C CIS Division — national-scope reader, PER-02).
-- Neither stores any new identity; GUARD extends the existing
-- asserted-not-verified role model (ADR-019) and does not reverse DEC-010
-- (project-management/decision-log.md DEC-011 explains why).
--
-- Rollback: enum values cannot be dropped in place. Reverting needs a type
-- rebuild — create actor_role_old without GUARD/I4C, migrate any row whose
-- actor_role / created_by_role / acknowledged_by_role / assigned_role /
-- author_role column holds one of these two values, swap the column type,
-- drop the old type. A web rollback alone is safe and needs nothing here,
-- since an older build simply never writes them.
ALTER TYPE "public"."actor_role" ADD VALUE 'GUARD';
--> statement-breakpoint
ALTER TYPE "public"."actor_role" ADD VALUE 'I4C';
