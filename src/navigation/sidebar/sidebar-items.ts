import {
  Banknote,
  BookOpenCheck,
  ChartBar,
  FolderOpen,
  Forklift,
  Gauge,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  ListTodo,
  type LucideIcon,
  MessageSquareText,
  Server,
  ShoppingBag,
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
    label: "داشبوردها",
    items: [
      {
        id: "default",
        title: "پیش‌فرض",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        id: "crm",
        title: "CRM",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
      {
        id: "finance",
        title: "مالی",
        url: "/dashboard/finance",
        icon: Banknote,
      },
      {
        id: "analytics",
        title: "تحلیل و آمار",
        url: "/dashboard/analytics",
        icon: Gauge,
      },
      {
        id: "productivity",
        title: "بهره‌وری",
        url: "/dashboard/productivity",
        icon: ListTodo,
      },
      {
        id: "ecommerce",
        title: "فروشگاه",
        url: "/dashboard/ecommerce",
        icon: ShoppingBag,
      },
      {
        id: "academy",
        title: "آموزش",
        url: "/dashboard/academy",
        icon: GraduationCap,
      },
      {
        id: "logistics",
        title: "لجستیک",
        url: "/dashboard/logistics",
        icon: Forklift,
      },
      {
        id: "infrastructure",
        title: "زیرساخت",
        url: "/dashboard/infrastructure",
        icon: Server,
      },
      {
        id: "file-manager",
        title: "مدیریت فایل‌ها",
        url: "/dashboard/file-manager",
        icon: FolderOpen,
      },
      {
        id: "patient-monitoring",
        title: "پایش بیماران",
        url: "/dashboard/patient-monitoring",
        icon: HeartPulse,
      },
    ],
  },
  {
    id: 2,
    label: "صفحات",
    items: [
      // {
      //   id: "email",
      //   title: "ایمیل",
      //   url: "/dashboard/mail",
      //   icon: Mail,
      // },
      // {
      //   id: "chat",
      //   title: "گفت‌وگو",
      //   url: "/dashboard/chat",
      //   icon: MessageSquare,
      // },
      // {
      //   id: "calendar",
      //   title: "تقویم",
      //   url: "/dashboard/calendar",
      //   icon: Calendar,
      // },
      // {
      //   id: "kanban",
      //   title: "کانبان",
      //   url: "/dashboard/kanban",
      //   icon: Kanban,
      // },
      // {
      //   id: "tasks",
      //   title: "وظایف",
      //   url: "/dashboard/tasks",
      //   icon: CheckSquare,
      // },
      // {
      //   id: "invoice",
      //   title: "فاکتور",
      //   url: "/dashboard/invoice",
      //   icon: ReceiptText,
      // },
      // {
      //   id: "profile",
      //   title: "پروفایل",
      //   url: "/dashboard/profile",
      //   icon: UserRound,
      // },
      // {
      //   id: "users",
      //   title: "کاربران",
      //   url: "/dashboard/users",
      //   icon: Users,
      // },
      // {
      //   id: "roles",
      //   title: "نقش‌ها",
      //   url: "/dashboard/roles",
      //   icon: Lock,
      // },
      // {
      //   id: "authentication",
      //   title: "احراز هویت",
      //   icon: Fingerprint,
      //   subItems: [
      //     {
      //       id: "auth-login-v1",
      //       title: "ورود نسخه ۱",
      //       url: "/auth/v1/login",
      //       newTab: true,
      //     },
      //     {
      //       id: "auth-login-v2",
      //       title: "ورود نسخه ۲",
      //       url: "/auth/v2/login",
      //       newTab: true,
      //     },
      //     {
      //       id: "auth-register-v1",
      //       title: "ثبت‌نام نسخه ۱",
      //       url: "/auth/v1/register",
      //       newTab: true,
      //     },
      //     {
      //       id: "auth-register-v2",
      //       title: "ثبت‌نام نسخه ۲",
      //       url: "/auth/v2/register",
      //       newTab: true,
      //     },
      //   ],
      // },
    ],
  },
  {
    id: 3,
    label: " مدیریت سرویس ها",
    items: [
      {
        id: "providers",
        title: "سرویس ها",
        icon: Users,
        subItems: [
          {
            id: "services-list",
            title: "لیست  سرویس ها",
            url: "/dashboard/services",
          },
          {
            id: "conversation-management",
            title: "مدیریت گفتگوها",
            url: "/dashboard/conversations",
            icon: MessageSquareText,
          },
          // { id: "pending-providers", title: "سرویس‌دهنده‌های در انتظار", url: "/dashboard/pending-providers" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: " مدیریت سرویس دهنگان",
    items: [
      {
        id: "providers",
        title: "سرویس دهندگان",
        icon: Users,
        subItems: [
          {
            id: "providers-list",
            title: "لیست سرویس دهنگان",
            url: "/dashboard/providers",
          },
          {
            id: "pending-providers",
            title: "سرویس‌دهنده‌های در انتظار",
            url: "/dashboard/pending-providers",
          },
        ],
      },
    ],
  },
  {
    id: 5,
    label: "مدیریت کاربران",
    items: [
      {
        id: "user-management",
        title: "کاربران",
        icon: Users,
        subItems: [{ id: "users-list", title: "همه‌ی کاربران", url: "/dashboard/users" }],
      },
    ],
  },
  {
    id: 6,
    label: "مدیریت تخصص‌ها",
    items: [
      {
        id: "specialty-management",
        title: "گروه‌ها و تخصص‌ها",
        url: "/dashboard/specialties",
        icon: Stethoscope,
      },
    ],
  },
  {
    id: 7,
    label: "حسابداری",
    items: [
      {
        id: "accounting-management",
        title: "پرداخت و برداشت‌ها",
        url: "/dashboard/accounting",
        icon: BookOpenCheck,
      },
    ],
  },
];
