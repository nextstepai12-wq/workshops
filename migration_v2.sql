-- تحديث v2: تفاصيل أوفى للورشة — شغّله مرة واحدة في SQL Editor
alter table wk_workshops
  add column if not exists duration text,
  add column if not exists level text,
  add column if not exists language text,
  add column if not exists has_certificate boolean default false,
  add column if not exists outcomes text,   -- كل سطر = نقطة
  add column if not exists audience text,   -- كل سطر = فئة
  add column if not exists agenda text,     -- كل سطر: الوقت | العنوان
  add column if not exists faq text;        -- كل سطر: السؤال | الجواب

-- تعبئة الورشة التجريبية بمثال
update wk_workshops set
  duration='3 ساعات', level='مبتدئ', language='العربية', has_certificate=true,
  outcomes=E'فهم أساسيات الذكاء الاصطناعي وتطبيقاته الحقيقية\nاكتشاف المسارات المهنية المناسبة لتخصصك\nبناء خطة عملية لخطوتك التالية\nتجربة أدوات ذكاء اصطناعي تستخدمها فوراً',
  audience=E'طلبة الجامعات من كل التخصصات\nالخريجون الجدد الباحثون عن اتجاه مهني\nكل من يريد دخول عالم الذكاء الاصطناعي بلا خبرة سابقة',
  agenda=E'السبت 5:00 م | الافتتاح والتعريف بالمنصة\n5:20 م | أساسيات الذكاء الاصطناعي بلغة بسيطة\n6:10 م | تطبيق عملي مباشر\n7:00 م | رسم خطتك: من تخصصك إلى وظيفتك\n7:40 م | أسئلة ونقاش مفتوح',
  faq=E'هل الورشة مجانية؟ | نعم، التسجيل مجاني بالكامل.\nهل أحتاج خبرة سابقة؟ | لا، الورشة مناسبة للمبتدئين.\nهل سأحصل على شهادة؟ | نعم، شهادة حضور معتمدة لمن يحضر الورشة.\nكيف يصلني رابط الحضور؟ | عبر مجتمعنا على واتساب بعد التسجيل.'
where duration is null;
