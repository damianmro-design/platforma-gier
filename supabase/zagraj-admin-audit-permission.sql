create or replace function public.zagraj_admin_dashboard()
returns jsonb language plpgsql stable security definer
set search_path='' as $$
declare m public.zagraj_admin_members%rowtype;
begin
 select * into m from public.zagraj_admin_members
 where user_id=auth.uid() and active=true;
 if m.user_id is null then raise exception 'ADMIN_FORBIDDEN' using errcode='42501'; end if;
 return jsonb_build_object(
  'staffTotal',(select count(*) from public.zagraj_admin_members where active),
  'staffByRole',(select coalesce(jsonb_object_agg(role,amount),'{}'::jsonb)
      from (select role,count(*) amount from public.zagraj_admin_members where active group by role) x),
  'auditTotal',case when m.role='owner' or 'audit.read'=any(m.permissions)
    then (select count(*) from public.zagraj_admin_audit) else null end,
  'recentEvents',case when m.role='owner' or 'audit.read'=any(m.permissions)
    then (select coalesce(jsonb_agg(jsonb_build_object('id',id,'action',action,
      'targetType',target_type,'targetId',target_id,'createdAt',created_at)
       order by created_at desc),'[]'::jsonb)
      from (select id,action,target_type,target_id,created_at from public.zagraj_admin_audit
        order by created_at desc limit 12) x)
    else '[]'::jsonb end
 );
end; $$;
revoke all on function public.zagraj_admin_dashboard() from public,anon;
grant execute on function public.zagraj_admin_dashboard() to authenticated;