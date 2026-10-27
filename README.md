# NextStep AI · قالب إعلانات الورشات

## 1) إعداد Supabase (5 دقائق)
1. أنشئ مشروعاً جديداً على supabase.com.
2. SQL Editor ← الصق محتوى `supabase.sql` ثم `migration_v2.sql` ← Run. (غيّر إيميل الأدمن داخل الملف أولاً.)
3. Authentication ← Users ← Add user: أنشئ حساباً بنفس إيميل الأدمن + كلمة مرور.
4. Authentication ← Providers ← Email: عطّل "Allow new users to sign up".
5. Project Settings ← API: انسخ `Project URL` و `anon public key` إلى `config.js`.
   (مفتاح anon آمن للنشر العلني؛ الحماية تأتي من سياسات RLS في ملف SQL. لا تضع service_role أبداً.)

## 2) النشر على GitHub Pages
1. أنشئ مستودعاً وارفع محتويات هذا المجلد في الجذر.
2. Settings ← Pages ← Deploy from branch ← main / root.
3. الموقع: `https://USERNAME.github.io/REPO/` والإدارة: `/admin.html`.

## 3) الاستخدام
- من لوحة الإدارة: أضف ورشة (صورة، عنوان، تاريخ، محاضر، مقاعد)، عدّلها، أخفِها، احذفها، وانسخ رابطها المباشر.
- المسجّلون: بحث، فلترة حسب الورشة، حذف، وتصدير CSV.
- رابط ورشة محددة: `index.html?w=<id>`.
