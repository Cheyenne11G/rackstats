-- =============================================================================
-- RackStats — READ-ONLY schema introspection (v2)
-- =============================================================================
-- Returns one row / one cell ("schema") describing the public schema's
-- structure. It changes nothing and returns NO row data, users, emails or
-- secrets (only approximate row counts per table).
--
-- Run the SAME query on live and staging, save the outputs as
--   db-schema-live.json     (gitignored)
--   db-schema-staging.json
-- and compare them.
--
-- v2 adds: server version, table owners, function owners, service_role table
-- privileges, and raw table ACLs (which also reveal PostgreSQL 17 MAINTAIN).
-- There is deliberately no hard-coded project label: identify the project by
-- the browser address bar when you run it, and by the file name you save to.
-- =============================================================================
select jsonb_build_object(
 'server_version',(select current_setting('server_version')),
 'exported_at',(select now()),
 'columns',(select jsonb_agg(jsonb_build_object('t',table_name,'c',column_name,'type',data_type,'udt',udt_name,'null',is_nullable,'default',column_default) order by table_name,ordinal_position) from information_schema.columns where table_schema='public'),
 'types',(select jsonb_agg(jsonb_build_object('name',t.typname,'labels',(select jsonb_agg(enumlabel order by enumsortorder) from pg_enum e where e.enumtypid=t.oid))) from pg_type t where t.typnamespace='public'::regnamespace and t.typtype='e'),
 'extensions',(select jsonb_agg(jsonb_build_object('name',extname,'schema',extnamespace::regnamespace::text) order by extname) from pg_extension),
 'constraints',(select jsonb_agg(jsonb_build_object('t',conrelid::regclass::text,'name',conname,'type',contype,'def',pg_get_constraintdef(oid)) order by conrelid::regclass::text,conname) from pg_constraint where connamespace='public'::regnamespace and conrelid<>0),
 'indexes',(select jsonb_agg(jsonb_build_object('t',tablename,'name',indexname,'def',indexdef) order by tablename,indexname) from pg_indexes where schemaname='public'),
 'rls',(select jsonb_agg(jsonb_build_object('t',relname,'enabled',relrowsecurity,'forced',relforcerowsecurity) order by relname) from pg_class where relnamespace='public'::regnamespace and relkind in ('r','p')),
 'table_owners',(select jsonb_agg(jsonb_build_object('t',relname,'kind',relkind,'owner',pg_get_userbyid(relowner)) order by relname) from pg_class where relnamespace='public'::regnamespace and relkind in ('r','p','v','m','S')),
 'table_acl',(select jsonb_agg(jsonb_build_object('t',relname,'acl',relacl::text) order by relname) from pg_class where relnamespace='public'::regnamespace and relkind in ('r','p')),
 'policies',(select jsonb_agg(jsonb_build_object('t',tablename,'name',policyname,'permissive',permissive,'cmd',cmd,'roles',roles,'using',qual,'check',with_check) order by tablename,policyname) from pg_policies where schemaname in ('public','storage')),
 'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'src',pg_get_functiondef(p.oid)) order by p.proname,p.oid) from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind in ('f','p') and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')),
 'function_grants',(select jsonb_agg(jsonb_build_object('fn',routine_name,'grantee',grantee,'priv',privilege_type) order by routine_name,grantee) from information_schema.routine_privileges where routine_schema='public' and grantee in ('anon','authenticated','PUBLIC','service_role')),
 'triggers',(select jsonb_agg(jsonb_build_object('t',event_object_schema||'.'||event_object_table,'name',trigger_name,'timing',action_timing,'event',event_manipulation,'action',action_statement) order by event_object_table,trigger_name) from information_schema.triggers where trigger_schema in ('public','auth')),
 'auth_user_triggers',(select jsonb_agg(jsonb_build_object('name',tgname,'fn',tgfoid::regproc::text,'def',pg_get_triggerdef(oid)) order by tgname) from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal),
 'table_grants',(select jsonb_agg(jsonb_build_object('t',table_name,'grantee',grantee,'priv',privilege_type) order by table_name,grantee,privilege_type) from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role')),
 'views',(select jsonb_agg(jsonb_build_object('name',viewname,'def',definition)) from pg_views where schemaname='public'),
 'storage_buckets',(select jsonb_agg(jsonb_build_object('id',id,'public',public,'size_limit',file_size_limit,'mime',allowed_mime_types)) from storage.buckets),
 'realtime_tables',(select jsonb_agg(tablename) from pg_publication_tables where pubname='supabase_realtime'),
 'approx_row_counts',(select jsonb_object_agg(relname,n_live_tup) from pg_stat_user_tables where schemaname='public')
) as schema;
