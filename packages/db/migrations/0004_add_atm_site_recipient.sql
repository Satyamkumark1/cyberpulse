-- 0004_add_atm_site_recipient — additive. Adds the ATM_SITE destination: the
-- staffed duty post at the predicted ATM. Addresses a post, never a person —
-- this schema holds no guard identity or contact number (DEC-010).
--
-- Rollback: enum values cannot be dropped in place. Reverting needs a type
-- rebuild — create recipient_kind_old without ATM_SITE, migrate any row whose
-- recipients contain it, swap the column type, drop the old type. Because of
-- that cost this value is intended to be permanent; a web rollback alone is
-- safe and needs nothing here, since an older build simply never writes it.
ALTER TYPE "public"."recipient_kind" ADD VALUE 'ATM_SITE';