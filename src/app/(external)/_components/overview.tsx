import Link from "next/link";

const includedScreens = [
  { name: "تحلیل و آمار", href: "/dashboard/analytics" },
  { name: "مدیریت مشتریان", href: "/dashboard/crm" },
  { name: "مالی", href: "/dashboard/finance" },
  { name: "فروشگاه", href: "/dashboard/ecommerce" },
  { name: "بهره‌وری", href: "/dashboard/productivity" },
  { name: "مدیریت فایل‌ها", href: "/dashboard/file-manager" },
  { name: "تقویم", href: "/dashboard/calendar" },
];

const editions = [
  {
    name: "Radix UI",
    repository: "https://github.com/arhamkhnz/next-shadcn-admin-dashboard",
  },
  {
    name: "Base UI",
    repository: "https://github.com/arhamkhnz/next-shadcn-admin-dashboard-baseui",
  },
  {
    name: "React Aria",
    repository: "https://github.com/arhamkhnz/next-shadcn-admin-dashboard-aria",
  },
  {
    name: "TanStack Start",
    repository: "https://github.com/arhamkhnz/tanstack-shadcn-admin-dashboard",
  },
];

export function Overview() {
  return (
    <section aria-labelledby="overview-title">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] md:gap-16">
        <div className="flex flex-col gap-10 md:gap-12">
          <div className="flex flex-col gap-4">
            <p className="font-medium text-muted-foreground text-xs">درباره‌ی قالب</p>
            <h2 className="text-pretty text-xl leading-7 tracking-tight" id="overview-title">
              داشبورد مدیریتی متن‌باز مبتنی بر shadcn/ui با بیش از ۲۵ صفحه‌ی آماده برای توسعه و شخصی‌سازی.
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            <p className="font-medium text-muted-foreground text-xs">مطابق نیاز شما</p>
            <p className="text-muted-foreground text-sm leading-6">
              فونت، پوسته، عرض محتوا، نوار پیمایش و چیدمان نوار کناری را به‌سادگی تغییر دهید و ظاهر یکپارچه‌ی قالب را حفظ
              کنید.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:gap-10">
          <div className="flex flex-col gap-4">
            <h3 className="font-medium text-muted-foreground text-xs">صفحات منتخب</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {includedScreens.map((screen) => (
                <li key={screen.name}>
                  <Link
                    className="underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                    href={screen.href}
                    prefetch={false}
                  >
                    {screen.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4" id="variants">
            <h3 className="font-medium text-muted-foreground text-xs">ویرایش‌ها</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {editions.map((edition) => (
                <li key={edition.name}>
                  <a
                    className="underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                    href={edition.repository}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {edition.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
