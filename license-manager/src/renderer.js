const api = window.tolouLicenseManager;
const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function formatDate(value) {
  if (!value) return 'دائمی';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value)); }
  catch { return value; }
}

function setMessage(text, kind = '') {
  const node = $('message');
  node.textContent = text;
  node.className = `message ${kind}`;
}

function updateExpiryVisibility() {
  const perpetual = $('licenseType').value === 'perpetual';
  $('expiryWrap').classList.toggle('hidden', perpetual);
  $('expiresOn').required = !perpetual;
}

function renderState(state) {
  $('keyDot').classList.toggle('ready', state.key.ready);
  $('keyStatus').textContent = state.key.ready ? 'کلید امضای Tolou آماده است' : 'کلید خصوصی وارد نشده';
  $('fingerprint').textContent = state.key.fingerprint ? `Fingerprint: ${state.key.fingerprint}` : 'برای صدور لایسنس، کلید خصوصی را وارد کنید.';
  $('issueBtn').disabled = !state.key.ready;

  const items = state.licenses || [];
  $('licenseCount').textContent = String(items.length);
  $('emptyState').classList.toggle('hidden', items.length > 0);
  $('history').innerHTML = items.map((item) => `
    <div class="license-row">
      <div class="license-main"><strong>${esc(item.customerName)}</strong><small>${esc(item.customerCompany || '—')}</small></div>
      <div><span class="pill">${esc(item.licenseType)}</span><small>${esc(item.machineCode)}</small></div>
      <div><strong>${formatDate(item.expiresAt)}</strong><small>${formatDate(item.issuedAt)}</small></div>
      <code>${esc(item.licenseId.slice(0, 8))}</code>
    </div>
  `).join('');
}

async function refresh() {
  try { renderState(await api.getState()); }
  catch (error) { setMessage(error?.message || 'خواندن وضعیت برنامه انجام نشد.', 'error'); }
}

$('importKeyBtn').addEventListener('click', async () => {
  setMessage('');
  try {
    const result = await api.importKey();
    if (!result.cancelled) {
      setMessage('کلید خصوصی معتبر با موفقیت ثبت شد.', 'success');
      await refresh();
    }
  } catch (error) {
    setMessage(error?.message || 'ورود کلید انجام نشد.', 'error');
  }
});

$('licenseType').addEventListener('change', updateExpiryVisibility);

$('licenseForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('');
  $('issueBtn').disabled = true;
  try {
    const result = await api.issueLicense({
      customerName: $('customerName').value,
      customerCompany: $('customerCompany').value,
      machineCode: $('machineCode').value,
      licenseType: $('licenseType').value,
      expiresOn: $('expiresOn').value,
      notes: $('notes').value
    });
    if (!result.cancelled) {
      setMessage(`لایسنس با موفقیت صادر شد: ${result.license.licenseId}`, 'success');
      $('licenseForm').reset();
      updateExpiryVisibility();
      await refresh();
    }
  } catch (error) {
    setMessage(error?.message || 'صدور لایسنس انجام نشد.', 'error');
  } finally {
    const state = await api.getState().catch(() => null);
    $('issueBtn').disabled = !(state && state.key.ready);
  }
});

updateExpiryVisibility();
refresh();
