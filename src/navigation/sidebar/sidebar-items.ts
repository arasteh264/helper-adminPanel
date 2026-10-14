import {
  Banknote,
  BookOpenText,
  Camera,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  MessageSquareText,
  Percent,
  ScrollText,
  Send,
  ShieldCheck,
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
    label: "صف بررسی",
    items: [
      {
        id: "pending-providers",
        title: "تأیید متخصصان",
        url: "/dashboard/pending-providers",
        icon: Users,
      },
      {
        id: "service-requests",
        title: "تأیید درخواست‌ها",
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
    label: "درخواست‌ها و پیام‌ها",
    items: [
      {
        id: "all-service-requests",
        title: "همه درخواست‌های سرویس",
        url: "/dashboard/services",
        icon: ClipboardList,
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
    id: 4,
    label: "کاربران و متخصصان",
    items: [
      {
        id: "providers",
        title: "فهرست متخصصان",
        url: "/dashboard/providers",
        icon: Users,
      },
      {
        id: "provider-invitations",
        title: "دعوت متخصص",
        url: "/dashboard/providers/invitations",
        icon: Send,
      },
      {
        id: "users",
        title: "کاربران",
        url: "/dashboard/users",
        icon: Users,
      },
    ],
  },
  {
    id: 5,
    label: "استوری متخصصان",
    items: [
      {
        id: "provider-stories",
        title: "بررسی استوری‌ها",
        url: "/dashboard/provider-stories",
        icon: Camera,
      },
      {
        id: "provider-story-access",
        title: "مجوز انتشار",
        url: "/dashboard/provider-stories/access",
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: 6,
    label: "مالی و درآمد",
    items: [
      {
        id: "accounting",
        title: "امور مالی",
        url: "/dashboard/accounting",
        icon: Banknote,
        subItems: [
          {
            id: "financial-overview",
            title: "گزارش درآمد و سود",
            url: "/dashboard/accounting",
            icon: ChartNoAxesCombined,
          },
          {
            id: "provider-payouts",
            title: "برداشت متخصصان",
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
    id: 7,
    label: "محتوا و تخصص‌ها",
    items: [
      {
        id: "specialties",
        title: "گروه‌ها و تخصص‌ها",
        url: "/dashboard/specialties",
        icon: Stethoscope,
      },
      {
        id: "blog",
        title: "وبلاگ",
        url: "/dashboard/blog",
        icon: BookOpenText,
      },
    ],
  },
  {
    id: 8,
    label: "سوابق مدیریت",
    items: [
      {
        id: "audit-logs",
        title: "اقدامات مدیران",
        url: "/dashboard/audit-logs",
        icon: ScrollText,
      },
    ],
  },
];
