const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { createPrivateKey, createPublicKey, createHash, randomUUID, sign } = require('node:crypto');
const { mkdir, readFile, writeFile, copyFile } = require('node:fs/promises');
const path = require('node:path');

const PRODUCT = 'Tolou Concrete QC';
const PRODUCT_CODE = 'TOLOU-QC';
const EXPECTED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAStz4jE9rrC8aPUbRi97K9g5cqNrq29gz9DvTXnxbx4Y=\n-----END PUBLIC KEY-----\n`;

let mainWindow;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stable(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(stable(value));
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeMachineCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function validateMachineCode(value) {
  const code = normalizeMachineCode(value);
  if (!/^[A-Z0-9][A-Z0-9\-_:]{7,127}$/.test(code)) throw new Error('Machine Code نامعتبر است.');
  return code;
}

function dataDir() {
  return path.join(app.getPath('userData'), 'issuer');
}

function keyPath() {
  return path.join(dataDir(), 'issuer-private.pem');
}

function registryPath() {
  return path.join(dataDir(), 'licenses.json');
}

async function ensureDataDir() {
  await mkdir(dataDir(), { recursive: true });
}

async function loadRegistry() {
  await ensureDataDir();
  try {
    const raw = await readFile(registryPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function saveRegistry(items) {
  await ensureDataDir();
  const tmp = `${registryPath()}.tmp`;
  await writeFile(tmp, JSON.stringify(items, null, 2), { encoding: 'utf8', mode: 0o600 });
  await copyFile(tmp, registryPath());
}

async function loadPrivateKey() {
  const pem = await readFile(keyPath(), 'utf8');
  const privateKey = createPrivateKey(pem);
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('کلید خصوصی باید Ed25519 باشد.');
  const publicPem = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString();
  if (publicPem.trim() !== EXPECTED_PUBLIC_KEY.trim()) throw new Error('این کلید خصوصی متعلق به Tolou QC نیست.');
  return { privateKey, publicPem };
}

async function keyStatus() {
  try {
    const { publicPem } = await loadPrivateKey();
    return { ready: true, fingerprint: sha256Hex(publicPem).match(/.{1,8}/g).slice(0, 4).join('-').toUpperCase() };
  } catch {
    return { ready: false, fingerprint: null };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 700,
    show: false,
    backgroundColor: '#0f1115',
    title: 'Tolou QC License Manager',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged
    }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function trusted(event) {
  const frame = event.senderFrame;
  return Boolean(frame && frame === event.sender.mainFrame && BrowserWindow.fromWebContents(event.sender));
}

function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!trusted(event)) throw new Error('IPC sender rejected');
    return fn(...args);
  });
}

function sanitize(input) {
  const customerName = String(input.customerName || '').trim();
  const customerCompany = String(input.customerCompany || '').trim();
  const notes = String(input.notes || '').trim();
  if (!customerName) throw new Error('نام مشتری الزامی است.');
  const machineCode = validateMachineCode(input.machineCode);
  const licenseType = ['trial', 'subscription', 'perpetual'].includes(input.licenseType) ? input.licenseType : 'subscription';
  let expiresAt = null;
  if (licenseType !== 'perpetual') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.expiresOn || ''))) throw new Error('تاریخ پایان اعتبار الزامی است.');
    expiresAt = new Date(`${input.expiresOn}T23:59:59.999Z`).toISOString();
    if (Date.parse(expiresAt) <= Date.now()) throw new Error('تاریخ پایان اعتبار باید در آینده باشد.');
  }
  return { customerName, customerCompany, notes, machineCode, licenseType, expiresAt };
}

handle('manager:state', async () => ({ key: await keyStatus(), licenses: await loadRegistry(), product: PRODUCT }));

handle('manager:import-key', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'انتخاب کلید خصوصی Tolou',
    properties: ['openFile'],
    filters: [{ name: 'PEM private key', extensions: ['pem'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return { cancelled: true };
  const sourcePem = await readFile(result.filePaths[0], 'utf8');
  const privateKey = createPrivateKey(sourcePem);
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('کلید انتخاب‌شده Ed25519 نیست.');
  const publicPem = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString();
  if (publicPem.trim() !== EXPECTED_PUBLIC_KEY.trim()) throw new Error('کلید انتخاب‌شده با کلید عمومی Tolou QC تطابق ندارد.');
  await ensureDataDir();
  await writeFile(keyPath(), sourcePem, { encoding: 'utf8', mode: 0o600 });
  return { cancelled: false, key: await keyStatus() };
});

handle('manager:issue-license', async (rawInput) => {
  const input = sanitize(rawInput || {});
  const { privateKey } = await loadPrivateKey();
  const now = new Date().toISOString();
  const payload = {
    schema: 'tolou-offline-license',
    schemaVersion: 1,
    licenseId: randomUUID(),
    product: PRODUCT,
    productCode: PRODUCT_CODE,
    customer: { name: input.customerName, company: input.customerCompany || null },
    machineCode: input.machineCode,
    licenseType: input.licenseType,
    issuedAt: now,
    expiresAt: input.expiresAt,
    features: ['qc-core', 'analytics', 'reporting', 'pdf-export', 'excel-export'],
    notes: input.notes || null
  };
  const bytes = Buffer.from(canonicalJson(payload), 'utf8');
  const signature = sign(null, bytes, privateKey).toString('base64');
  const envelope = { algorithm: 'Ed25519', payload, signature };
  const suggested = `Tolou-QC-${input.customerName.replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, '-')}-${payload.licenseId.slice(0, 8)}.tolou-license`;
  const save = await dialog.showSaveDialog(mainWindow, {
    title: 'ذخیره فایل لایسنس',
    defaultPath: suggested,
    filters: [{ name: 'Tolou License', extensions: ['tolou-license'] }]
  });
  if (save.canceled || !save.filePath) return { cancelled: true };
  await writeFile(save.filePath, JSON.stringify(envelope, null, 2), 'utf8');
  const registry = await loadRegistry();
  registry.unshift({
    licenseId: payload.licenseId,
    customerName: input.customerName,
    customerCompany: input.customerCompany || null,
    machineCode: input.machineCode,
    licenseType: input.licenseType,
    issuedAt: now,
    expiresAt: input.expiresAt,
    fileName: path.basename(save.filePath),
    status: 'issued'
  });
  await saveRegistry(registry.slice(0, 1000));
  return { cancelled: false, license: registry[0], path: save.filePath };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
