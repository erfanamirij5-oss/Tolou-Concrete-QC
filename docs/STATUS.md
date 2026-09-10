# وضعیت توسعه Tolou Concrete QC

مالک محصول: مهندس عرفان امیری

مخزن: `erfanamirij5-oss/Tolou-Concrete-QC`
شاخه توسعه فعال: `feature/windows-desktop-foundation`
پلتفرم هدف: Windows Desktop / Offline

## وضعیت Release Candidate
Tolou Concrete QC اکنون وارد مرحله Release Candidate شده است. هسته محصول، Analytics/Reporting، بسته‌بندی Windows و Release Security Hardening روی شاخه توسعه فعال شده‌اند و CI ویندوز باید قبل از هر انتشار نهایی سبز باشد.

آخرین Gate امنیتی تأییدشده: CI #294 روی commit `a6020f1ad4f9b5a6043b6ef3f0e3fa1203e99ac3` با نتیجه SUCCESS.

## قابلیت‌های تثبیت‌شده
- Electron + React + TypeScript + Vite با Renderer ایزوله و Preload محدود.
- SQLite محلی در `userData` با migrationهای نسخه‌دار و کنترل checksum/upgrade.
- پروژه، بتن‌ریزی، سری نمونه و نمونه‌های ۷ روزه، ۲۸ روزه و شاهد.
- workflow نتایج revision-based شامل draft/review/approval/correction/void و audit trail.
- زمان‌بندی revision-based نمونه شاهد.
- مشخصات مهندسی طرح اختلاط و QC بتن‌ریزی.
- مشتری، منشأ بتن، آزمایشگاه خارجی و نتایج خارجی.
- پیوست مدیریت‌شده با allow-list فرمت، سقف اندازه، SHA-256، کنترل regular-file و containment مسیر ذخیره‌سازی.
- مشخصات فیزیکی Sample شامل شکل، ابعاد، جرم، حجم و جرم حجمی بتن سخت‌شده.
- داده بتن تازه شامل اسلامپ و دما با revision history.
- Analytics Core مشترک برای مقاومت، اسلامپ، دما و جرم حجمی.
- گزارش‌های دوره‌ای/فصلی و داشبورد مدیریت بر Source of Truth مشترک.
- گزارش پروژه و خروجی PDF/Excel از Main process؛ Renderer فایل‌سیستم privileged را کنترل نمی‌کند.
- رابط فارسی/RTL، تاریخ شمسی در UI و UTC داخلی.
- Windows Squirrel installer و lifecycle handling.
- آیکن رسمی برنامه در executable و shortcut.

## Release Security Hardening
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- DevTools در build بسته‌بندی‌شده غیرفعال است.
- بازکردن window جدید مسدود و navigation محدود شده است.
- IPC sender برای main frame / BrowserWindow / origin مورد اعتماد اعتبارسنجی می‌شود.
- Preload فقط APIهای محدود Tolou را expose می‌کند و raw Electron/IPC API به Renderer داده نمی‌شود.
- Content Security Policy برای Renderer فعال است.
- Electron Fuses برای Release تنظیم شده‌اند: RunAsNode، NODE_OPTIONS و CLI inspect غیرفعال؛ Embedded ASAR Integrity و OnlyLoadAppFromAsar فعال.
- CI بعد از package شدن، Fuseهای executable واقعی `TolouConcreteQC.exe` را می‌خواند و مقدار مورد انتظار را assert می‌کند.
- چون production renderer فعلاً با `loadFile`/`file:` اجرا می‌شود، `GrantFileProtocolExtraPrivileges` عمداً در این مرحله خاموش نشده است؛ مهاجرت به custom protocol فقط در صورت انجام یک تغییر معماری مستقل و regression-safe انجام شود.

## اصول معماری تثبیت‌شده
- Renderer دسترسی مستقیم به SQLite، فایل‌سیستم حساس، licensing یا عملیات privileged ندارد.
- Electron Main مرز اجرای Application Service و persistence است.
- IPC قرارداد typed دارد و خطاهای خام زیرساخت نباید به UI نشت کنند.
- داده‌های مهندسی باید deterministic، traceable، unit-safe و audit-friendly باشند.
- هیچ rule پذیرش استانداردی بدون reference/version/test وارد production نمی‌شود.
- داشبورد مدیریت و QC از یک Analytics/Application Service مشترک استفاده می‌کنند.

## Release Gate باقی‌مانده
پیش از اعلام نسخه نهایی عمومی، فقط Gateهای انتشار انجام می‌شوند:
1. Full regression روی آخرین HEAD شامل `npm ci`, checks, tests, typecheck, build, Forge make و Fuse verification.
2. smoke test نصب/اجرای Windows روی artifact نهایی در محیط واقعی Windows در صورت دسترسی مالک.
3. تصمیم مالک درباره code signing؛ برای انتشار عمومی حرفه‌ای توصیه می‌شود ولی نیازمند certificate/credentials مالک است.
4. تعیین شماره نسخه عمومی و release notes با تأیید مالک.
5. merge/tag/release فقط با تأیید صریح مالک.

## موارد خارج از Gate این Release
- نقش‌ها/احراز هویت چندکاربره و permission model کامل.
- backup/restore پیشرفته و encryption-at-rest.
- licensing/expiration تجاری.
- custom `app://` protocol به‌جای `file://`.
- قابلیت‌های توسعه‌ای آینده که برای عملکرد نسخه فعلی الزامی نیستند.

این موارد نباید به‌صورت شتاب‌زده وارد Release Candidate شوند و ریسک regression ایجاد کنند؛ در roadmap نسخه‌های بعدی مدیریت می‌شوند.

## قانون انتشار
هیچ merge به `main`، release branch، tag یا انتشار عمومی بدون تأیید صریح مالک پروژه انجام نمی‌شود.
