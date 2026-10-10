import {
  Banknote,
  BookOpenText,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  MessageSquareText,
  Percent,
  ScrollText,
  Stethoscope,
  Users,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  url: string;
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "نمای کلی",
    items: [
      {
        id: "overview",
        title: "داشبورد",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 2,
    label: "صف‌های نیازمند اقدام",
    items: [
      {
        id: "pending-providers",
        title: "ثبت‌نام‌های در انتظار تأیید",
        url: "/dashboard/pending-providers",
        icon: Users,
      },
      {
        id: "service-requests",
        title: "در انتظار بررسی مدیر",
        url: "/dashboard/services/review",
        icon: ClipboardList,
      },
      {
        id: "service-request-disputes",
        title: "اختلاف‌های سرویس",
        url: "/dashboard/services/disputes",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: 3,
    label: "مالی و پرداخت‌ها",
    items: [
      {
        id: "accounting",
        title: "امور مالی",
        url: "/dashboard/accounting",
        icon: Banknote,
        subItems: [
          {
            id: "provider-payouts",
            title: "درخواست‌های برداشت",
            url: "/dashboard/accounting/payouts",
            icon: Banknote,
          },
          {
            id: "customer-payments",
            title: "پرداخت‌های مشتریان",
            url: "/dashboard/accounting/payments",
            icon: CreditCard,
          },
          {
            id: "financial-overview",
            title: "گزارش مالی",
            url: "/dashboard/accounting",
            icon: ChartNoAxesCombined,
          },
          {
            id: "wallet-ledger",
            title: "گردش کیف پول",
            url: "/dashboard/accounting/ledger",
            icon: BookOpenText,
          },
          {
            id: "commission-settings",
            title: "تنظیم کمیسیون",
            url: "/dashboard/accounting/commission",
            icon: Percent,
          },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "مدیریت کاربران و سرویس‌ها",
    items: [
      {
        id: "all-service-requests",
        title: "همه‌ی درخواست‌های سرویس",
        url: "/dashboard/services",
        icon: ClipboardList,
      },
      {
        id: "providers",
        title: "فهرست متخصصان",
        url: "/dashboard/providers",
        icon: Users,
      },
      {
        id: "users",
        title: "کاربران",
        url: "/dashboard/users",
        icon: Users,
      },
      {
        id: "conversations",
        title: "گفت‌وگوها",
        url: "/dashboard/conversations",
        icon: MessageSquareText,
      },
    ],
  },
  {
    id: 5,
    label: "محتوا و تنظیمات پایه",
    items: [
      {
        id: "specialties",
        title: "گروه‌ها و تخصص‌ها",
        url: "/dashboard/specialties",
        icon: Stethoscope,
      },
      {
        id: "blog",
        title: "مدیریت وبلاگ",
        url: "/dashboard/blog",
        icon: BookOpenText,
      },
    ],
  },
  {
    id: 6,
    label: "گزارش و پیگیری",
    items: [
      {
        id: "audit-logs",
        title: "سوابق اقدامات مدیران",
        url: "/dashboard/audit-logs",
        icon: ScrollText,
      },
    ],
  },
];
