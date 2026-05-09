
const PAGE_SIZE = 50;
let allData = [];
let filtered = [];
let currentPage = 1;

// Embed data inline
const DATA_JSON = window.DATA_JSON || [];

function init() {
  allData = DATA_JSON.map(r => {
    const name = normalizeDisplayArabic(r.name);
    return {
      ...r,
      floor: normalizeDisplayArabic(r.floor),
      name,
      _searchName: normalizeArabic(name) + ' ' + normalizeArabic(name.split(' ').reverse().join(' ')),
      region: normalizeRegion(r.region),
      relation: normalizeDisplayArabic(r.relation)
    };
  });
  filtered = [...allData];

  // Stats
  const rooms = new Set(allData.map(r => r.room));
  const floors = new Set(allData.map(r => r.floor));
  const regions = new Set(allData.map(r => r.region).filter(Boolean));

  document.getElementById('stat-total').textContent = allData.length.toLocaleString('ar');
  document.getElementById('stat-rooms').textContent = rooms.size.toLocaleString('ar');
  document.getElementById('stat-floors').textContent = floors.size;
  document.getElementById('stat-regions').textContent = regions.size;

  // Populate filters
  const floorOrder = ['الدور الأول','الدور الثاني','الدور الثالث','الدور الرابع','الدور الخامس','الدور السادس','الدور السابع','الدور الثامن','الدور التاسع','الدور العاشر','الدور الحادي عشر','الدور الثاني عشر','الدور الثالث عشر'];
  const sortedFloors = [...floors].sort((a, b) => {
    const ai = floorOrder.findIndex(f => normalizeArabic(f) === normalizeArabic(a));
    const bi = floorOrder.findIndex(f => normalizeArabic(f) === normalizeArabic(b));
    if (ai === -1 && bi === -1) return a.localeCompare(b, 'ar');
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  populateSelect('floorFilter', sortedFloors, f => f);
  populateSelect('regionFilter', [...regions].sort(), r => r);
  const relations = [...new Set(allData.map(r => r.relation).filter(Boolean))].sort();
  populateSelect('relationFilter', relations, r => r);
  populateSelect('roomFilter', [...rooms].sort((a,b) => parseInt(a)-parseInt(b)), r => 'غرفة ' + r);

  // Events
  document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 250));
  document.getElementById('floorFilter').addEventListener('change', () => { updateRoomFilter(); applyFilters(); });
  document.getElementById('regionFilter').addEventListener('change', applyFilters);
  document.getElementById('relationFilter').addEventListener('change', applyFilters);
  document.getElementById('roomFilter').addEventListener('change', applyFilters);
  document.getElementById('clearBtn').addEventListener('click', clearFilters);

  applyFilters();

  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = '';
}

function populateSelect(id, items, labelFn) {
  const sel = document.getElementById(id);
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = labelFn(item);
    sel.appendChild(opt);
  });
}

function normalizeArabic(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ً-ْ]/g, '')
    .replace(/\u0640/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeDisplayArabic(text) {
  return String(text || '').normalize('NFKC').trim();
}

function normalizeRegion(value) {
  const v = normalizeDisplayArabic(value);
  const vNorm = normalizeArabic(v);
  if (!v) return v;
  if (vNorm === normalizeArabic('البحر الاحمر')) return 'البحر الاحمر';
  if (vNorm.startsWith(normalizeArabic('البحر'))) return 'البحر الاحمر';
  return v;
}

function applyFilters() {
  const qRaw = document.getElementById('searchInput').value.trim();
  const q = normalizeArabic(qRaw);
  const floor = document.getElementById('floorFilter').value;
  const region = document.getElementById('regionFilter').value;
  const relation = document.getElementById('relationFilter').value;
  const room = document.getElementById('roomFilter').value;

  filtered = allData.filter(r => {
    if (floor && r.floor !== floor) return false;
    if (region && r.region !== region) return false;
    if (relation && r.relation !== relation) return false;
    if (room && r.room !== room) return false;
    if (q) {
      const search = (r._searchName || '') + ' ' + normalizeArabic(
        (r.passport || '') + ' ' + (r.national_id || '') + ' ' + (r.request_num || '')
      );
      if (!search.includes(q)) return false;
    }
    return true;
  });

  currentPage = 1;
  document.getElementById('stat-filtered').textContent = filtered.length.toLocaleString('ar');
  
  const hasFilters = q || floor || region || relation || room;
  document.getElementById('resultsCount').innerHTML = hasFilters 
    ? `تم العثور على <span>${filtered.length.toLocaleString('ar')}</span> نتيجة من أصل <span>${allData.length.toLocaleString('ar')}</span> حاج`
    : `إجمالي السجلات: <span>${allData.length.toLocaleString('ar')}</span> حاج`;

  renderTable();
  renderPagination();
}

function updateRoomFilter(preserveSelection = true) {
  const floor = document.getElementById('floorFilter').value;
  const sel = document.getElementById('roomFilter');
  const currentRoom = preserveSelection ? sel.value : '';
  sel.innerHTML = '<option value="">جميع الغرف</option>';
  const rooms = [...new Set(
    (floor ? allData.filter(r => r.floor === floor) : allData).map(r => r.room)
  )].sort((a, b) => parseInt(a) - parseInt(b));
  rooms.forEach(room => {
    const opt = document.createElement('option');
    opt.value = room;
    opt.textContent = 'غرفة ' + room;
    sel.appendChild(opt);
  });
  sel.value = (preserveSelection && rooms.includes(currentRoom)) ? currentRoom : '';
}

function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('floorFilter').value = '';
  document.getElementById('regionFilter').value = '';
  document.getElementById('relationFilter').value = '';
  updateRoomFilter(false);
  applyFilters();
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');
  
  const q = document.getElementById('searchInput').value.trim();
  
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filtered.slice(start, start + PAGE_SIZE);

  if (!pageData.length) {
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = pageData.map((r, i) => `
    <tr>
      <td class="td-num">${(start + i + 1).toLocaleString('ar')}</td>
      <td class="td-name">${highlight(r.name.split(' ').reverse().join(' '), q)}</td>
      <td class="td-passport">${highlight(r.passport, q)}</td>
      <td class="td-national" dir="ltr">${highlight(r.national_id, q)}</td>
      <td><span class="room-badge">${r.room}</span></td>
      <td><span class="floor-badge">${r.floor}</span></td>
      <td class="region-text">${r.region || '—'}</td>
      <td style="text-align:center; color: rgba(247,240,224,0.5); font-size:12px">${/^\d+$/.test(String(r.flight_code || '').trim()) ? r.flight_code : '—'}</td>
      <td><span class="relation-tag">${r.relation || '—'}</span></td>
      <td style="font-size:12px; color: rgba(247,240,224,0.5)">${highlight(r.request_num, q)}</td>
    </tr>
  `).join('');
}

function highlight(text, q) {
  if (!q || !text) return text || '';
  const qNorm = normalizeArabic(q);
  if (!qNorm) return String(text);
  const source = String(text);
  const sourceNorm = normalizeArabic(source);
  const idx = sourceNorm.indexOf(qNorm);
  if (idx === -1) return source;
  // Walk source and normalized in parallel to find mark boundaries
  let ni = 0;
  let out = '';
  let inMark = false;
  for (let si = 0; si < source.length; si++) {
    if (ni === idx && !inMark) { out += '<mark class="highlight">'; inMark = true; }
    out += source[si];
    const chNorm = normalizeArabic(source[si]);
    if (chNorm) ni += chNorm.length;
    if (inMark && ni >= idx + qNorm.length) { out += '</mark>'; inMark = false; }
  }
  if (inMark) out += '</mark>';
  return out;
}

function renderPagination() {
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pag = document.getElementById('pagination');
  const info = document.getElementById('pageInfo');

  if (totalPages <= 1) {
    pag.innerHTML = '';
    info.textContent = '';
    return;
  }

  info.textContent = `صفحة ${currentPage.toLocaleString('ar')} من ${totalPages.toLocaleString('ar')}`;

  let html = '';
  html += `<button class="page-btn" onclick="goPage(1)" ${currentPage===1?'disabled':''}>«</button>`;
  html += `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;

  let start = Math.max(1, currentPage - 3);
  let end = Math.min(totalPages, currentPage + 3);

  if (start > 1) html += `<button class="page-btn" onclick="goPage(1)">1</button>`;
  if (start > 2) html += `<span style="color:rgba(247,240,224,0.3);padding:0 4px">…</span>`;

  for (let p = start; p <= end; p++) {
    html += `<button class="page-btn ${p===currentPage?'active':''}" onclick="goPage(${p})">${p.toLocaleString('ar')}</button>`;
  }

  if (end < totalPages - 1) html += `<span style="color:rgba(247,240,224,0.3);padding:0 4px">…</span>`;
  if (end < totalPages) html += `<button class="page-btn" onclick="goPage(${totalPages})">${totalPages.toLocaleString('ar')}</button>`;

  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>`;
  html += `<button class="page-btn" onclick="goPage(${totalPages})" ${currentPage===totalPages?'disabled':''}>»</button>`;

  pag.innerHTML = html;
}

function goPage(p) {
  currentPage = p;
  renderTable();
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Init on load
window.addEventListener('DOMContentLoaded', init);


