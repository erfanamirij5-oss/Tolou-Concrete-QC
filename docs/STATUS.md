# وضعیت توسعه Tolou Concrete QC

مالک محصول: مهندس عرفان امیری

مخزن: `erfanamirij5-oss/Tolou-Concrete-QC`
شاخه توسعه فعال: `feature/windows-desktop-foundation`
پلتفرم هدف: Windows Desktop / Offline

## وضعیت پایدار فعلی
- Electron + React + TypeScript + Vite با Renderer ایزوله و Preload محدود.
- SQLite محلی در `userData` و migration پایه نسخه ۱.
- ثبت واقعی پروژه و بتن‌ریزی با تفکیک شرکت.
- ثبت سری نمونه کنترل داخلی و پروژه مشتری با ایجاد اتمیک شش نمونه.
- ثبت پیش‌نویس نتایج با optimistic concurrency و revision افزایشی.
- فهرست پایدار نمونه‌ها و نتایج از SQLite؛ اطلاعات پس از restart قابل بازیابی است.
- گردش Review/Approval اولیه با ثبت تأیید به‌صورت revision جدید و immutable.
- تاریخچه نتیجه برای هر نمونه بدون UPDATE/DELETE روی revisionهای قبلی.
- داشبورد زنده برای پروژه‌ها، سری‌ها، نتایج بدون نتیجه و draftها.
- refresh هماهنگ بین پروژه، میز آزمایشگاه، داشبورد و پنل نتایج.
- شناسه جدید پس از هر ثبت پروژه، بتن‌ریزی و سری نمونه تولید می‌شود.
- خطاهای داخلی SQLite/constraint در مرز IPC به پیام امن فارسی نگاشت می‌شوند.
- CI ویندوز شامل check، test، typecheck و build است؛ milestone جاری با CI #70 سبز شده است.

## اصول معماری تثبیت‌شده
- Renderer دسترسی مستقیم به SQLite، فایل‌سیستم حساس یا عملیات privileged ندارد.
- Electron Main تنها مرز اجرای Application Service و persistence است.
- IPC قرارداد typed دارد و خطاهای خام زیرساخت نباید به UI نشت کنند.
- نتیجه‌ها revision-based و immutable هستند؛ تغییر نتیجه با درج revision جدید انجام می‌شود.
- UTC فقط برای ذخیره‌سازی داخلی است؛ رابط نهایی باید تاریخ شمسی/فارسی ارائه کند.
- هیچ migration جدیدی تا بازطراحی migration runner برای نسخه‌های ترتیبی و قابل‌آزمون اضافه نشود.

## بدهی‌ها و ریسک‌های باز
- ورودی `datetime-local` هنوز میلادی است و باید با کنترل تاریخ شمسی جایگزین شود.
- فونت Vazir هنوز به‌عنوان asset محصول تثبیت/بسته‌بندی نشده است.
- مدل داده مشخصات کامل بتن، طرح اختلاط و اطلاعات فنی پروژه هنوز توسعه نیافته است.
- نقش‌ها، احراز هویت، session و مجوزهای Review/Approval هنوز پیاده‌سازی نشده‌اند.
- backup/restore، رمزنگاری، licensing و expiration هنوز باقی است.
- گزارش A4/PDF/PNG/Excel و workflow مدیریتی هنوز باقی است.
- installer ویندوز و آزمون نصب/ارتقا هنوز باقی است.
- CSP و hardening نهایی navigation باید قبل از release تکمیل شود.

## ادامه Roadmap
۱. تکمیل مدل QC: مشخصات بتن/طرح اختلاط، اطلاعات پروژه و فیلدهای مهندسی موردنیاز.
۲. بازطراحی migration runner و سپس migrationهای نسخه‌دار با تست rollback/upgrade.
۳. تکمیل workflow نتایج: review queue، approval permissions، void/correction و audit trail.
۴. تقویم شمسی و UX فارسی کامل، سپس polish رابط Liquid Glass.
۵. تحلیل QC، هشدارها و شاخص‌های آماری با منطق deterministic و traceable.
۶. گزارش‌ها و خروجی‌های مدیریتی.
۷. backup/security/licensing.
۸. Windows packaging، installer، upgrade tests و release candidate.

## قانون انتشار
هیچ merge به `main`، release branch یا tag بدون تأیید صریح مالک پروژه انجام نمی‌شود.
