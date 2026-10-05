

## اتصال به API

در اجرای محلی، API روی پورت `3005` در دسترس است. آدرس Swagger بک‌اند روی Vercel
`https://helper-api-eight.vercel.app/api` است؛ `/api` مسیر مستندات Swagger است، پس
نشانی پایه‌ای که فرانت‌اند برای درخواست‌های API استفاده می‌کند خود دامنه است:

```env
API_URL=http://localhost:3005
NEXT_PUBLIC_API_URL=http://localhost:3005
```

در Vercel، هر دو متغیر را در تنظیمات پروژه و برای محیط‌های مورد استفاده (Production و
Preview) روی مقدار زیر بگذارید:

```env
API_URL=https://helper-api-eight.vercel.app
NEXT_PUBLIC_API_URL=https://helper-api-eight.vercel.app
```

`API_URL` برای درخواست‌های سروری و ورود استفاده می‌شود؛ `NEXT_PUBLIC_API_URL` برای
صفحه‌های مدیریتی که مستقیماً از مرورگر API را فراخوانی می‌کنند. روی بک‌اند نیز دامنه‌ی
فرانت‌اند Vercel را در متغیر `CORS_ORIGINS` وارد کنید تا درخواست‌های مرورگر پذیرفته شوند.
اطلاعات محرمانه را در متغیرهای `NEXT_PUBLIC_*` قرار ندهید.

### مواردی که به تکمیل API نیاز دارند

- فهرست کاربران در API فعلی گارد مدیر ندارد و موجودیت خام، شامل اطلاعات حساس احراز هویت و بازیابی حساب را برمی‌گرداند. مسیر پنل فقط فیلدهای لازم را عبور می‌دهد، اما این محافظت جایگزین اصلاح `helper-api` نیست؛ endpoint اصلی باید فوراً گارد مدیر و DTO امن داشته باشد.
- API فعلی برای تغییر نقش، وضعیت، تعلیق یا فعال‌سازی کاربران endpoint مدیریتی ندارد.
- نقش‌ها enum ثابت هستند و API مدیریت نقش ندارد؛ به همین دلیل صفحه‌ی نمایشی نقش‌ها در پنل نگه‌داری نمی‌شود.
- API مدیریت سرویس‌دهندگان برای تأیید اولیه و مدارک است؛ فهرست و مدیریت عمومی سرویس‌دهندگان تأییدشده هنوز کامل نیست.

## Colocation File System Architecture

ساختار پروژه بر پایه‌ی هم‌مکانی است: اجزای هر بخش کنار مسیر همان بخش قرار دارند و اجزای مشترک در پوشه‌های اصلی `src/components`، `src/hooks` و `src/lib` نگه‌داری می‌شوند.

## Getting Started

### اجرای محلی

1. **Clone the repository**
   ```bash
   git clone https://github.com/arasteh264/helper-adminPanel.git
   ```

2. **Navigate into the project**
   ```bash
   cd helper-adminPanel
   ```

3. **تنظیم نشانی API** در فایل `.env.local`
   ```env
   API_URL=http://localhost:3005
   NEXT_PUBLIC_API_URL=http://localhost:3005
   ```

4. **نصب وابستگی‌ها**
   ```bash
   npm install
   ```

5. **اجرای پنل**
   ```bash
   npm run dev
   ```

پنل در [http://localhost:3000](http://localhost:3000) در دسترس است و ورود آن به یک حساب مدیر معتبر در `helper-api` نیاز دارد.

### بررسی کد

```bash
npm run lint
npm run check
```
