-- NextStep AI · Workshops template — شغّله مرة واحدة في Supabase > SQL Editor
-- الجداول بادئتها wk_ حتى لا تتعارض مع أي جداول أخرى في المشروع

create table if not exists wk_workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  description text,
  speaker text,
  starts_at timestamptz not null,
  location text default 'أونلاين',
  image_url text,
  capacity int,                    -- اتركه فارغاً لمقاعد غير محدودة
  whatsapp_link text,              -- رابط مجتمع الواتساب لهذه الورشة
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists wk_registrations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references wk_workshops(id) on delete cascade,
  name text not null,
  whatsapp text not null,
  email text not null,
  specialization text not null,
  university text not null,
  country text not null,
  created_at timestamptz default now(),
  unique (workshop_id, email)
);

create table if not exists wk_admins (email text primary key);

-- ⚠️ ضع إيميل الأدمن هنا (نفس الإيميل الذي ستنشئ له حساباً في Authentication > Users)
insert into wk_admins(email) values ('ahmed@example.com') on conflict do nothing;

create or replace function wk_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from wk_admins where email = auth.jwt() ->> 'email');
$$;

-- عدد المسجلين (عام، بدون كشف أي بيانات شخصية)
create or replace function wk_registration_count(w uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from wk_registrations where workshop_id = w;
$$;
grant execute on function wk_registration_count(uuid) to anon, authenticated;

alter table wk_workshops enable row level security;
alter table wk_registrations enable row level security;
alter table wk_admins enable row level security;

create policy "wk public reads active wk_workshops" on wk_workshops for select using (is_active or wk_is_admin());
create policy "wk admin manages wk_workshops" on wk_workshops for all using (wk_is_admin()) with check (wk_is_admin());

create policy "wk anyone can register" on wk_registrations for insert
  with check (exists (select 1 from wk_workshops w where w.id = workshop_id and w.is_active));
create policy "wk admin reads wk_registrations" on wk_registrations for select using (wk_is_admin());
create policy "wk admin manages wk_registrations" on wk_registrations for delete using (wk_is_admin());
create policy "wk admin updates wk_registrations" on wk_registrations for update using (wk_is_admin());

create policy "wk admin reads wk_admins" on wk_admins for select using (wk_is_admin());

-- مخزن صور الإعلانات
insert into storage.buckets (id, name, public) values ('workshop-images','workshop-images', true) on conflict do nothing;
create policy "wk public views images" on storage.objects for select using (bucket_id = 'workshop-images');
create policy "wk admin uploads images" on storage.objects for insert with check (bucket_id = 'workshop-images' and wk_is_admin());
create policy "wk admin updates images" on storage.objects for update using (bucket_id = 'workshop-images' and wk_is_admin());
create policy "wk admin deletes images" on storage.objects for delete using (bucket_id = 'workshop-images' and wk_is_admin());

-- ورشة تجريبية
insert into wk_workshops (title, subtitle, description, speaker, starts_at, location, capacity)
values ('ابدأ رحلتك في الذكاء الاصطناعي','ورشة عملية للطلبة',
'ورشة تفاعلية نتعرف فيها على أساسيات الذكاء الاصطناعي وكيف تبني خطوتك التالية في مسارك الأكاديمي والمهني.',
'Eng. Ahmed Alhayek', now() + interval '10 days', 'أونلاين عبر Zoom', 200);
