-- ============================================================================
-- Phase 2 follow-up: customer names for the operator console
--
-- Found by the live verification run on 2026-08-21: the operator reservation
-- board renders a customer name and avatar per booking, but every row came
-- back as "—". The join was `reservations -> profiles(name)`, and `profiles`
-- is readable only by its owner and by admins. An operator is neither, so
-- PostgREST returned the reservation with an empty embed.
--
-- Widening the `profiles` policy to operators would hand them every account's
-- email, spend and plan to solve a name lookup. Instead this view exposes the
-- one column the board needs. It is a plain (security definer) view, so it
-- reads past the `profiles` policies on purpose.
--
-- Display names are already visible to any signed-in user through
-- `reviews.author_name`, `posts.author_name` and the `leaderboard` view, so
-- this widens nothing that was not already public.
-- ============================================================================

CREATE OR REPLACE VIEW public.customer_directory AS
SELECT p.id, p.name
FROM public.profiles p;

GRANT SELECT ON public.customer_directory TO authenticated;
