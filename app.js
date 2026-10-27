const $ = s => document.querySelector(s);
const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const fmt = (d, o) => new Intl.DateTimeFormat('ar-u-nu-latn', o).format(new Date(d));
const esc = t => (t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let workshops = [], current = null, timer;

// ---- static bits
$('#fName').textContent = CONFIG.FOUNDER.name; $('#fTitle').textContent = CONFIG.FOUNDER.title;
$('#fIn').href = CONFIG.FOUNDER.linkedin; $('#pIn').href = CONFIG.PLATFORM_LINKEDIN;
$('#country').innerHTML = '<option value="">اختر البلد</option>' + ['فلسطين','مصر','الأردن','السعودية','الإمارات','قطر','الكويت','البحرين','عُمان','العراق','سوريا','لبنان','اليمن','ليبيا','تونس','الجزائر','المغرب','السودان','تركيا','أخرى']
  .map(c => `<option>${c}</option>`).join('');

// ---- 3D logo: layered depth + mouse/touch tilt
const rig = $('#rig');
for (let i = 0; i < 8; i++) rig.insertAdjacentHTML('beforeend', `<img class="back" src="assets/logo-icon.png" alt="" style="transform:translateZ(${-i*9}px)">`);
rig.insertAdjacentHTML('beforeend', '<img class="front" src="assets/logo-icon.png" alt="" style="transform:translateZ(18px)">');
const tilt = e => {
  const p = e.touches ? e.touches[0] : e, r = $('#stage').getBoundingClientRect();
  const x = (p.clientX - r.left) / r.width - .5, y = (p.clientY - r.top) / r.height - .5;
  rig.style.transform = `rotateY(${x*38}deg) rotateX(${-y*30}deg)`;
};
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.addEventListener('mousemove', tilt); document.addEventListener('touchmove', tilt, {passive:true});
}

// ---- load workshops
(async function init() {
  const { data, error } = await sb.from('wk_workshops').select('*').eq('is_active', true).order('starts_at');
  if (error || !data.length) {
    $('#title').textContent = error ? 'تعذّر تحميل الورشات' : 'لا توجد ورشات حالياً';
    $('#subtitle').textContent = error ? 'تحقق من إعدادات الاتصال ثم أعد المحاولة.' : 'ترقّب إعلان الورشة القادمة قريباً.';
    return;
  }
  workshops = data;
  const now = Date.now(), upcoming = data.filter(w => new Date(w.starts_at) > now);
  const wanted = new URLSearchParams(location.search).get('w');
  show(data.find(w => w.id === wanted) || upcoming[0] || data[data.length - 1]);
})();

async function show(w) {
  current = w;
  document.title = `${w.title} · NextStep AI`;
  $('#title').textContent = w.title; $('#subtitle').textContent = w.subtitle || '';
  $('#desc').textContent = w.description || '';
  if (w.image_url) $('#poster').src = w.image_url;
  $('#chips').innerHTML = [
    '📅 ' + fmt(w.starts_at, {weekday:'long', day:'numeric', month:'long', year:'numeric'}),
    '🕒 ' + fmt(w.starts_at, {hour:'numeric', minute:'2-digit'}),
    w.location && '📍 ' + w.location
  ].filter(Boolean).map(t => `<span class="chip">${esc(t)}</span>`).join('');
  $('#facts').innerHTML = [
    ['🎤','المحاضر', w.speaker], ['📍','المكان', w.location],
    ['📅','التاريخ', fmt(w.starts_at, {dateStyle:'full'})], ['🕒','الوقت', fmt(w.starts_at, {timeStyle:'short'})],
    ['⏳','المدة', w.duration], ['📊','المستوى', w.level], ['🌐','لغة الورشة', w.language], ['🏅','الشهادة', w.has_certificate ? 'شهادة حضور' : '']
  ].filter(f => f[2]).map(f => `<div><i>${f[0]}</i><span><small>${f[1]}</small>${esc(f[2])}</span></div>`).join('');
  $('#tabs').innerHTML = workshops.length > 1 ? workshops.map(x =>
    `<button aria-pressed="${x.id === w.id}" data-id="${x.id}">${esc(x.title)}</button>`).join('') : '';
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => show(workshops.find(x => x.id === b.dataset.id)));
  const L = t => (t || '').split('\n').map(x => x.trim()).filter(Boolean), P = l => l.split('|').map(x => x.trim());
  const set = (id, items, html) => { $('#' + id).innerHTML = items.map(html).join(''); return items.length; };
  const o = set('outcomes', L(w.outcomes), (t, i) => `<div class="card"><b>${i + 1}</b><p>${esc(t)}</p></div>`);
  const au = set('audience', L(w.audience), t => `<li>${esc(t)}</li>`);
  const ag = set('agenda', L(w.agenda), t => { const [a, b] = P(t); return b ? `<li><time>${esc(a)}</time><span>${esc(b)}</span></li>` : `<li><span>${esc(a)}</span></li>`; });
  const fq = set('faq', L(w.faq), t => { const [q, r] = P(t); return `<details><summary>${esc(q)}</summary><p>${esc(r || '')}</p></details>`; });
  $('#learn').hidden = !o; $('#who').hidden = !(au || ag); $('#agWrap').hidden = !ag; $('#faqS').hidden = !fq;
  document.querySelectorAll('.sec .rv').forEach(el => el.classList.add('in'));
  countdown(); seats();
}

async function seats() {
  $('#seats').textContent = '';
  const { data } = await sb.rpc('wk_registration_count', { w: current.id });
  if (data == null) return;
  const left = current.capacity ? current.capacity - data : null;
  current._full = left !== null && left <= 0;
  $('#seats').textContent = current._full ? 'اكتملت المقاعد' : left !== null ? `${data} مسجّل · تبقّى ${left} مقعد` : `${data} مسجّل حتى الآن`;
  $('#submit').disabled = current._full;
}

function countdown() {
  clearInterval(timer);
  const draw = () => {
    let s = Math.max(0, Math.floor((new Date(current.starts_at) - Date.now()) / 1000));
    if (!s) { $('#count').innerHTML = '<div style="min-width:0"><b style="font-size:1.1rem">بدأت الورشة أو انتهت</b></div>'; clearInterval(timer); return; }
    const u = [['يوم', 86400], ['ساعة', 3600], ['دقيقة', 60], ['ثانية', 1]];
    $('#count').innerHTML = u.map(([l, n]) => { const v = Math.floor(s / n); s %= n; return `<div><b>${String(v).padStart(2,'0')}</b><span>${l}</span></div>`; }).join('');
  };
  draw(); timer = setInterval(draw, 1000);
}

// ---- registration
$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target)), msg = $('#formMsg');
  msg.className = 'msg err';
  if (Object.values(f).some(v => !v.trim())) return msg.textContent = 'يرجى تعبئة جميع الحقول.';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) return msg.textContent = 'البريد الإلكتروني غير صحيح.';
  if (!/^\+?[0-9\s-]{8,16}$/.test(f.whatsapp)) return msg.textContent = 'أدخل رقم واتساب صحيحاً مع رمز الدولة.';
  if (!current || current._full) return msg.textContent = 'التسجيل غير متاح لهذه الورشة.';
  msg.className = ''; msg.textContent = ''; $('#submit').disabled = true;
  const { error } = await sb.from('wk_registrations').insert({ ...f, email: f.email.trim().toLowerCase(), workshop_id: current.id });
  $('#submit').disabled = false;
  if (error) {
    msg.className = 'msg err';
    return msg.textContent = error.code === '23505' ? 'هذا البريد مسجّل مسبقاً في هذه الورشة.' : 'حدث خطأ أثناء التسجيل، حاول مرة أخرى.';
  }
  e.target.reset(); seats();
  $('#wa').href = current.whatsapp_link || CONFIG.WHATSAPP_LINK;
  $('#done').classList.add('open'); $('#wa').focus();
});
$('#close').onclick = () => $('#done').classList.remove('open');
$('#done').addEventListener('click', e => { if (e.target.id === 'done') e.target.classList.remove('open'); });
addEventListener('keydown', e => { if (e.key === 'Escape') $('#done').classList.remove('open'); });

// ---- polish: cursor spotlight, scroll reveal, closed state
const spot = $('#spot');
addEventListener('pointermove', e => { spot.style.left = e.clientX + 'px'; spot.style.top = e.clientY + 'px'; }, { passive: true });
const io = new IntersectionObserver(es => es.forEach(x => x.isIntersecting && (x.target.classList.add('in'), io.unobserve(x.target))), { threshold: .12 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));
new MutationObserver(() => { const p = $('#pill'); if (!current) return;
  const past = new Date(current.starts_at) < Date.now(); p.textContent = current._full ? 'اكتملت المقاعد' : past ? 'انتهت الورشة' : 'التسجيل مفتوح'; }).observe($('#seats'), { childList: true });
