# 🚀 Step-by-Step Website Live & Real-Time Setup Guide (ওয়েবসাইট ইন্টারনেটে লাইভ করার সহজ নির্দেশিকা)

এই নির্দেশিকাটি অনুসরণ করে আপনি কোনো কোডিং জানা ছাড়াই **সম্পূর্ণ বিনামূল্যে (Free)** আপনার ওয়েবসাইট ইন্টারনেটে লাইভ করতে পারবেন এবং রিয়েল-টাইম ডাটাবেস ও অ্যাডমিন প্যানেল যুক্ত করতে পারবেন।

---

## 📌 ধাপ ১: ফ্রি Supabase ডাটাবেস এবং অ্যাকউন্ট তৈরি (Database & Auth Setup)

১. [https://supabase.com](https://supabase.com) -এ যান এবং একটি ফ্রি অ্যাকাউন্ট তৈরি করুন (**Start your project**)।
২. **New Project**-এ ক্লিক করে আপনার প্রজেক্ট তৈরি করুন (প্রজেক্ট নাম দিন যেমন: `gulabi-devi-cup` এবং একটি পাসওয়ার্ড দিন)।
৩. প্রজেক্ট তৈরি হয়ে গেলে বামপাশের মেগার মেনু থেকে **SQL Editor** -এ যান।
৪. **New Query** -এ ক্লিক করে নিচের পুরো SQL কোডটি কপি করে পেস্ট করুন এবং **Run** বাটন চাপুন:

```sql
-- Create tournament_content table
create table if not exists public.tournament_content (
  id text primary key default 'main' check (id = 'main'),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.tournament_content enable row level security;

-- Create admin security table
create table if not exists public.tournament_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.tournament_admins enable row level security;

-- Function to check admin privileges
create or replace function public.is_tournament_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tournament_admins where user_id = auth.uid()
  );
$$;

-- RLS Policies
create policy "public can read tournament content"
on public.tournament_content for select using (true);

create policy "tournament admins can create tournament content"
on public.tournament_content for insert to authenticated with check (public.is_tournament_admin());

create policy "tournament admins can update tournament content"
on public.tournament_content for update to authenticated using (public.is_tournament_admin()) with check (public.is_tournament_admin());

insert into public.tournament_content (id, content)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;
```

---

## 📌 ধাপ ২: অ্যাডমিন ইউজার (Admin User) তৈরি করা

১. Supabase ড্যাশবোর্ডের বাম পাশের মেনু থেকে **Authentication** > **Users** -এ যান।
২. **Add User** > **Create User** -এ ক্লিক করুন।
৩. আপনার অ্যাডমিন ইমেইল (যেমন: `admin@bbit.ac.in`) এবং একটি শক্তিশালী পাসওয়ার্ড দিন।
৪. ইউজার তৈরি হলে ওই টেবিল থেকে সেই ইউজারের **User UID** (একগুচ্ছ অক্ষরের কোড, যেমন `a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) কপি করুন।
৫. এবার আবার **SQL Editor**-এ গিয়ে নিচের কোডটি রান করুন (`YOUR-USER-UUID-HERE`-এর জায়গায় কপি করা UID পেস্ট করুন):

```sql
insert into public.tournament_admins (user_id) 
values ('YOUR-USER-UUID-HERE');
```

---

## 📌 ধাপ ৩: Supabase URL এবং Anon Key সংগ্রহ করা

১. Supabase-এর **Project Settings** (নিচের গিয়ার আইকন) > **API** -তে যান।
২. এখান থেকে **Project URL** এবং **anon public key** কপি করে রাখুন:
   - `Project URL`: `https://xxxxxxxx.supabase.co`
   - `anon key`: `eyJhbGciOi...`

---

## 📌 ধাপ ৪: ইন্টারনেটে ওয়েবসাইট সম্পূর্ণ বিনামূল্যে ফ্রিতে হোস্ট করা (Deploy to Netlify)

১. [https://netlify.com](https://netlify.com) -এ গিয়ে একটি বিনামূল্যে অ্যাকাউন্ট খুলুন (Sign up with GitHub or Email)।
২. আপনার GitHub রিপোজিটরি (`mrsouvick/Gulabi-Devi-Memorial-Cup_Website`) Netlify-এর সাথে কানেক্ট করুন (**Add new site** > **Import an existing project**)।
৩. **Site configuration** > **Environment variables** -এ গিয়ে নিচের ২টি Variable যোগ করুন:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | আপনার Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | আপনার Supabase anon key |

৪. **Deploy site** বাটনে চাপ দিন! কয়েক সেকেন্ডের মধ্যে আপনার ওয়েবসাইট সম্পূর্ণ ইন্টারনেটে লাইভ হয়ে যাবে (যেমন: `gulabi-devi-cup.netlify.app`)!

---

## 📌 ধাপ ৫: লাইভ ওয়েবসাইট ম্যানেজ ও আপডেট করা (Admin Panel)

১. লাইভ ওয়েবসাইটের লিংকের শেষে `/#admin` যুক্ত করে অ্যাডমিন প্যানেলে প্রবেশ করুন (যেমন: `https://your-site.netlify.app/#admin`)।
২. ধাপ ২-এ তৈরি করা **Admin Email** এবং **Password** দিয়ে Sign in করুন।
৩. এখান থেকে আপনি:
   - **Teams**: টীম যোগ/মুছে ফেলতে পারবেন।
   - **Fixtures & Live Scores**: খেলার সময়সূচী এবং রিয়েল-টাইম লাইভ স্কোর আপডেট করতে পারবেন।
   - **Standings**: পয়েন্ট টেবিল আপডেট করতে পারবেন।
   - **Tournament Settings**: টুর্নামেন্ট ফি, তারিখ, ভেন্যু এবং রেজিস্ট্রেশন স্ট্যাটাস অন/অফ করতে পারবেন।
৪. আপনার প্রতিটি সেভ করার সাথে সাথে ওয়েবসাইটের সকল ভিজিটররা কোন রিফ্রেশ ছাড়াই লাইভ রিয়েল-টাইম আপডেট দেখতে পাবে!
