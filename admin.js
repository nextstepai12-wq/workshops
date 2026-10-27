const $ = s => document.querySelector(s);
const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = d => new Intl.DateTimeFormat('ar-u-nu-latn', {dateStyle:'medium', timeStyle:'short'}).format(new Date(d));
let W = [], R = [], editing = null;
const toast = (t, bad) => { const e = $('#toast'); e.textContent = t; e.className = 'toast show' + (bad ? ' bad' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => e.className = 'toast', 2600); };

// ---- auth
async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { $('#login').hidden = false; $('#app').hidden = true; return; }
  const { data: ok } = await sb.rpc('wk_is_admin');
  if (!ok) { await sb.auth.signOut(); $('#login').hidden = false; $('#loginMsg').className = 'msg err'; $('#loginMsg').textContent = 'هذا الحساب ليس أدمن.'; return; }
  $('#login').hidden = true; $('#app').hidden = false; $('#who').textContent = session.user.email; load();
}
$('#login').onsubmit = async e => {
  e.preventDefault();
  const { error } = await sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value });
  if (error) { $('#loginMsg').className = 'msg err'; return $('#loginMsg').textContent = 'بيانات الدخول غير صحيحة.'; }
  $('#pw').value = ''; boot();
};
$('#out').onclick = async () => { await sb.auth.signOut(); boot(); };

// ---- tabs
document.querySelectorAll('.atabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.atabs button').forEach(x => x.setAttribute('aria-selected', x === b));
  $('#tw').hidden = b.dataset.t !== 'w'; $('#tr').hidden = b.dataset.t !== 'r';
});

// ---- data
async function load() {
  const [w, r] = await Promise.all([
    sb.from('wk_workshops').select('*').order('starts_at', { ascending: false }),
    sb.from('wk_registrations').select('*').order('created_at', { ascending: false })
  ]);
  W = w.data || []; R = r.data || [];
  drawStats(); drawWorkshops(); drawFilter(); drawRows();
}
const count = id => R.filter(x => x.workshop_id === id).length;

function drawStats() {
  const top = k => { const m = {}; R.forEach(x => m[x[k]] = (m[x[k]] || 0) + 1); return Object.entries(m).sort((a, b) => b[1] - a[1])[0]; };
  const c = top('country'), u = top('university');
  $('#stats').innerHTML = [
    ['🗂️', W.length, 'إجمالي الورشات'], ['🟢', W.filter(x => x.is_active).length, 'ورشات منشورة'], ['👥', R.length, 'إجمالي المسجّلين'],
    ['🌍', c ? c[0] : '—', c ? `أكثر بلد (${c[1]})` : 'أكثر بلد'], ['🎓', u ? u[0] : '—', u ? `أكثر جامعة (${u[1]})` : 'أكثر جامعة']
  ].map(([i, n, l]) => `<div class="stat"><i>${i}</i><div><b class="${String(n).length > 9 ? 'sm' : ''}">${esc(n)}</b><span>${l}</span></div></div>`).join('');
}

function drawWorkshops() {
  $('#wlist').innerHTML = W.length ? W.map(w => {
    const n = count(w.id), pct = w.capacity ? Math.min(100, Math.round(n / w.capacity * 100)) : null, past = new Date(w.starts_at) < Date.now();
    return `<article class="wcard">
      <img src="${esc(w.image_url || 'assets/logo-icon.png')}" alt="" class="${w.image_url ? '' : 'ph'}">
      <div class="info">
        <h3>${esc(w.title)}</h3>
        <div class="meta"><span class="badge ${w.is_active ? '' : 'off'}">${w.is_active ? 'منشورة' : 'مخفية'}</span>${past ? '<span class="badge off">انتهت</span>' : ''}
          <small>📅 ${fmt(w.starts_at)}</small>${w.location ? `<small>📍 ${esc(w.location)}</small>` : ''}</div>
        <div class="prog"><div><b>${n}</b> مسجّل${w.capacity ? ` من ${w.capacity}` : ''}</div>${pct !== null ? `<i style="--p:${pct}%"></i>` : ''}</div>
      </div>
      <div class="acts">
        <button class="btn sm" data-a="edit" data-id="${w.id}">تعديل</button>
        <button class="btn sm ghost" data-a="reg" data-id="${w.id}">المسجّلون</button>
        <button class="btn sm ghost" data-a="link" data-id="${w.id}">نسخ الرابط</button>
        <button class="btn sm ghost" data-a="tog" data-id="${w.id}">${w.is_active ? 'إخفاء' : 'نشر'}</button>
        <button class="btn sm red" data-a="del" data-id="${w.id}">حذف</button>
      </div></article>`; }).join('') : '<div class="empty"><b>لا توجد ورشات بعد</b><br>اضغط «ورشة جديدة» لإضافة أول إعلان.</div>';
}
$('#wlist').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  const w = W.find(x => x.id === b.dataset.id), a = b.dataset.a;
  if (a === 'edit') openForm(w);
  if (a === 'link') { const u = new URL('index.html?w=' + w.id, location.href.replace('admin.html', '')); await navigator.clipboard.writeText(u.href); toast('تم نسخ رابط الورشة ✓'); }
  if (a === 'reg') { document.querySelector('[data-t=r]').click(); $('#fw').value = w.id; drawRows(); }
  if (a === 'tog') { await sb.from('wk_workshops').update({ is_active: !w.is_active }).eq('id', w.id); load(); }
  if (a === 'del' && confirm(`حذف «${w.title}» وكل تسجيلاتها نهائياً؟`)) { await sb.from('wk_workshops').delete().eq('id', w.id); load(); }
};

// ---- workshop form
const f = $('#wf'), toLocal = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
function openForm(w) {
  editing = w; f.reset(); $('#wmMsg').textContent = ''; $('#wmT').textContent = w ? 'تعديل الورشة' : 'ورشة جديدة';
  if (w) { for (const k of ['title','subtitle','description','speaker','location','capacity','whatsapp_link','duration','level','language','outcomes','audience','agenda','faq']) f[k].value = w[k] ?? ''; f.starts_at.value = toLocal(w.starts_at); f.is_active.checked = w.is_active; f.has_certificate.checked = !!w.has_certificate; }
  $('#wm').classList.add('open');
}
$('#add').onclick = () => openForm(null);
$('#cancel').onclick = () => $('#wm').classList.remove('open');
f.onsubmit = async e => {
  e.preventDefault(); const btn = $('#save'); btn.disabled = true; const m = $('#wmMsg'); m.className = ''; m.textContent = 'جارٍ الحفظ...';
  try {
    let image_url = editing?.image_url ?? null; const file = f.image.files[0];
    if (file) {
      const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const up = await sb.storage.from('workshop-images').upload(path, file); if (up.error) throw up.error;
      image_url = sb.storage.from('workshop-images').getPublicUrl(path).data.publicUrl;
    }
    const row = { title: f.title.value.trim(), subtitle: f.subtitle.value.trim() || null, description: f.description.value.trim() || null,
      speaker: f.speaker.value.trim() || null, location: f.location.value.trim() || null, starts_at: new Date(f.starts_at.value).toISOString(),
      capacity: f.capacity.value ? +f.capacity.value : null, whatsapp_link: f.whatsapp_link.value.trim() || null, is_active: f.is_active.checked, image_url, has_certificate: f.has_certificate.checked,
      ...Object.fromEntries(['duration','level','language','outcomes','audience','agenda','faq'].map(k => [k, f[k].value.trim() || null])) };
    const { error } = editing ? await sb.from('wk_workshops').update(row).eq('id', editing.id) : await sb.from('wk_workshops').insert(row);
    if (error) throw error;
    $('#wm').classList.remove('open'); toast('تم الحفظ ✓'); load();
  } catch (err) { m.className = 'msg err'; m.textContent = 'تعذّر الحفظ: ' + err.message; }
  btn.disabled = false;
};

// ---- registrants
function drawFilter() {
  const v = $('#fw').value;
  $('#fw').innerHTML = '<option value="">كل الورشات</option>' + W.map(w => `<option value="${w.id}">${esc(w.title)} (${count(w.id)})</option>`).join('');
  $('#fw').value = v;
}
const view = () => { const q = $('#q').value.trim().toLowerCase(), id = $('#fw').value;
  return R.filter(x => (!id || x.workshop_id === id) && (!q || [x.name, x.email, x.university, x.specialization, x.whatsapp, x.country].join(' ').toLowerCase().includes(q))); };
function drawRows() {
  const rows = view(), t = id => esc(W.find(w => w.id === id)?.title || '');
  $('#rcount').textContent = `عرض ${rows.length} من ${R.length} مسجّل`;
  $('#rows').innerHTML = rows.length ? rows.map((x, i) => `<tr><td>${i + 1}</td>
    <td><span class="who2"><i class="av">${esc([...x.name.trim()][0] || '?')}</i>${esc(x.name)}</span></td>
    <td dir="ltr"><a href="https://wa.me/${esc(x.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">${esc(x.whatsapp)}</a></td>
    <td dir="ltr">${esc(x.email)}</td><td>${esc(x.specialization)}</td><td>${esc(x.university)}</td>
    <td><span class="badge">${esc(x.country)}</span></td><td>${t(x.workshop_id)}</td><td>${fmt(x.created_at)}</td>
    <td><button class="btn sm red" data-id="${x.id}">حذف</button></td></tr>`).join('') : '<tr><td colspan="10" class="empty">لا يوجد مسجّلون</td></tr>';
}
$('#fw').onchange = $('#q').oninput = drawRows;
$('#rows').onclick = async e => { const b = e.target.closest('button'); if (b && confirm('حذف هذا التسجيل؟')) { await sb.from('wk_registrations').delete().eq('id', b.dataset.id); load(); } };
$('#csv').onclick = () => {
  const head = ['الاسم','الواتساب','الإيميل','التخصص','الجامعة','البلد','الورشة','تاريخ التسجيل'];
  const line = x => [x.name, x.whatsapp, x.email, x.specialization, x.university, x.country, W.find(w => w.id === x.workshop_id)?.title, x.created_at].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
  const blob = new Blob(['\ufeff' + [head.join(','), ...view().map(line)].join('\n')], { type: 'text/csv;charset=utf-8' });
  Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'registrations.csv' }).click();
};
boot();
