-- Assigning a worker failed with:
--   42P17: infinite recursion detected in policy for relation "complaint_assignments"
--
-- The two tables' policies referenced each other:
--   complaints.complaints_read_assigned_worker   -> subquery on complaint_assignments
--   complaint_assignments.assignments_*_muqaddam -> subquery on complaints
-- so evaluating either one re-entered the other.
--
-- SECURITY DEFINER functions run with the owner's rights and therefore do not
-- re-trigger RLS on the table they read, which breaks the cycle in both
-- directions. Each still scopes strictly to the calling user.

create or replace function public.is_assigned_worker(cid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.complaint_assignments a
    where a.complaint_id = cid and a.worker_id = (select auth.uid())
  );
$$;

create or replace function public.can_manage_complaint(cid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.complaints c
    where c.id = cid
      and (
        c.assigned_muqaddam = (select auth.uid())
        or c.ward_id = public.current_profile_ward()
        or public.current_profile_role() = 'admin'
      )
  );
$$;

revoke all on function public.is_assigned_worker(uuid)    from public, anon;
revoke all on function public.can_manage_complaint(uuid)  from public, anon;
grant execute on function public.is_assigned_worker(uuid)   to authenticated;
grant execute on function public.can_manage_complaint(uuid) to authenticated;

drop policy complaints_read_assigned_worker on public.complaints;
create policy complaints_read_assigned_worker on public.complaints
  for select to authenticated
  using (public.is_assigned_worker(id));

drop policy assignments_write_muqaddam on public.complaint_assignments;
create policy assignments_write_muqaddam on public.complaint_assignments
  for insert to authenticated
  with check (
    public.current_profile_role() in ('muqaddam', 'si', 'dsi', 'csi', 'admin')
    and public.is_active()
    and public.can_manage_complaint(complaint_id)
  );

drop policy assignments_delete_muqaddam on public.complaint_assignments;
create policy assignments_delete_muqaddam on public.complaint_assignments
  for delete to authenticated
  using (
    public.current_profile_role() in ('muqaddam', 'si', 'dsi', 'csi', 'admin')
    and public.can_manage_complaint(complaint_id)
  );
