"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BookOpenText, Check, ExternalLink, FilePlus2, LoaderCircle, Pencil, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

type ContentBlock = { type: "paragraph" | "heading" | "tip"; text: string } | { type: "list"; items: string[] };

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categorySlug: string;
  authorName: string;
  authorRole: string;
  content?: ContentBlock[];
  coverImage: string | null;
  coverAlt: string | null;
  coverTint: string;
  readingMinutes: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  tags: string[];
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  updatedAt: string;
};

type BlogPostInput = Omit<BlogPost, "id" | "content" | "readingMinutes" | "publishedAt" | "updatedAt"> & {
  content: ContentBlock[];
};

type BlogPage = { items: BlogPost[]; total: number; page: number; pageSize: number };

const emptyPost: BlogPostInput = {
  slug: "",
  title: "",
  excerpt: "",
  category: "",
  categorySlug: "",
  authorName: "تحریریه هلپر",
  authorRole: "راهنمای خدمات",
  content: [],
  coverImage: null,
  coverAlt: null,
  coverTint: "from-emerald-500/25 via-emerald-500/10 to-transparent",
  seoTitle: null,
  seoDescription: null,
  canonicalUrl: null,
  tags: [],
  status: "DRAFT",
};

function blocksToText(blocks: ContentBlock[] = []) {
  return blocks
    .map((block) => {
      if (block.type === "heading") return `## ${block.text}`;
      if (block.type === "tip") return `> ${block.text}`;
      if (block.type === "list") return block.items.map((item) => `- ${item}`).join("\n");
      return block.text;
    })
    .join("\n\n");
}

function textToBlocks(value: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = value.split(/\r?\n/);
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", items: list });
    list = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
    } else if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: trimmed.slice(3) });
    } else if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2));
    } else if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "tip", text: trimmed.slice(2) });
    } else {
      flushList();
      paragraph.push(trimmed);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

async function readApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as (T & { message?: string | string[] }) | null;
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join("، ") : payload?.message;
    throw new Error(message || "درخواست انجام نشد.");
  }
  if (payload === null) throw new Error("پاسخ سرویس قابل خواندن نبود.");
  return payload;
}

function fieldClass() {
  return "min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground hover:border-primary/35 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10";
}

export function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | BlogPost["status"]>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogPostInput>(emptyPost);
  const [bodyText, setBodyText] = useState("");
  const loadSequence = useRef(0);

  const loadPosts = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    try {
      const result = await readApi<BlogPage>(`/api/admin/blog?${params}`);
      if (sequence !== loadSequence.current) return;
      setPosts(result.items);
      setTotal(result.total);
      setPage(result.page);
    } catch (loadError) {
      if (sequence !== loadSequence.current) return;
      const message = loadError instanceof Error ? loadError.message : "دریافت مقاله‌ها ناموفق بود.";
      setError(message);
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPosts(), 250);
    return () => window.clearTimeout(timer);
  }, [loadPosts]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    if (!loading && page > pageCount) setPage(pageCount);
  }, [loading, page, pageSize, total]);

  function startNew() {
    setSelected(null);
    setForm(emptyPost);
    setBodyText("");
  }

  async function editPost(post: BlogPost) {
    try {
      const fullPost = await readApi<BlogPost>(`/api/admin/blog/${post.id}`);
      setSelected(fullPost);
      setForm({
        ...emptyPost,
        ...fullPost,
        content: fullPost.content ?? [],
      });
      setBodyText(blocksToText(fullPost.content));
      document.getElementById("blog-editor")?.scrollIntoView({ behavior: "smooth" });
    } catch (editError) {
      toast.error(editError instanceof Error ? editError.message : "دریافت مقاله ناموفق بود.");
    }
  }

  async function savePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const payload: BlogPostInput = {
      ...form,
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim(),
      content: textToBlocks(bodyText),
      tags: form.tags.map((tag) => tag.trim()).filter(Boolean),
      status: form.status,
    };
    try {
      await readApi<BlogPost>(selected ? `/api/admin/blog/${selected.id}` : "/api/admin/blog", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success(payload.status === "PUBLISHED" ? "مقاله منتشر شد." : "پیش‌نویس ذخیره شد.");
      startNew();
      await loadPosts();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "ذخیره‌ی مقاله ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  let saveButtonLabel = "ذخیره‌ی پیش‌نویس";
  if (saving) saveButtonLabel = "در حال ذخیره…";
  else if (form.status === "PUBLISHED") saveButtonLabel = "ذخیره و انتشار";

  let postListContent: React.ReactNode;
  if (error) {
    postListContent = (
      <div
        className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm"
        role="alert"
      >
        <span>{error}</span>
        <button type="button" onClick={() => void loadPosts()} className="font-medium text-primary underline">
          تلاش دوباره
        </button>
      </div>
    );
  } else if (loading && posts.length === 0) {
    postListContent = (
      <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground" role="status">
        <LoaderCircle className="size-4 animate-spin" />
        در حال دریافت مقاله‌ها…
      </div>
    );
  } else if (posts.length === 0) {
    postListContent = (
      <p className="p-12 text-center text-sm text-muted-foreground">
        مقاله‌ای پیدا نشد. می‌توانید اولین مقاله را بنویسید.
      </p>
    );
  } else {
    postListContent = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">مقاله</th>
              <th className="px-4 py-3 font-medium">دسته</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
              <th className="px-4 py-3 font-medium">آخرین تغییر</th>
              <th className="px-4 py-3 font-medium">اقدام</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-muted/30">
                <td className="max-w-[380px] px-4 py-4">
                  <p className="truncate font-medium">{post.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground" dir="ltr">
                    /blog/{post.slug}
                  </p>
                </td>
                <td className="px-4 py-4">{post.category}</td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${post.status === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}
                  >
                    {post.status === "PUBLISHED" ? "منتشرشده" : "پیش‌نویس"}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(post.updatedAt))}
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => void editPost(post)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted"
                  >
                    <Pencil className="size-3.5" />
                    ویرایش
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t px-4 py-3 text-xs text-muted-foreground">
          نمایش {((page - 1) * pageSize + 1).toLocaleString("fa-IR")} تا{" "}
          {((page - 1) * pageSize + posts.length).toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")} مقاله
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">محتوا و بهینه‌سازی جست‌وجو</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
            <BookOpenText className="size-6 text-primary" />
            وبلاگ هلپر
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            پیش‌نویس بسازید، اطلاعات SEO را تکمیل کنید و مقاله را منتشر کنید.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <FilePlus2 className="size-4" />
          مقاله‌ی جدید
        </button>
      </header>

      <section id="blog-editor" className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{selected ? "ویرایش مقاله" : "نوشتن مقاله"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">تیترهای متن را با «## » و فهرست را با «- » شروع کنید.</p>
          </div>
          {selected?.status === "PUBLISHED" ? (
            <a
              href={`${process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL ?? "https://helper.ir"}/blog/${selected.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              مشاهده‌ی مقاله
              <ExternalLink className="size-4" />
            </a>
          ) : null}
        </div>

        <form onSubmit={savePost} className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            عنوان مقاله
            <input
              className={fieldClass()}
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              required
              maxLength={160}
            />
            <span className="text-xs text-muted-foreground">{form.title.length}/160</span>
          </label>
          <label className="grid gap-1.5 text-sm">
            نشانی انگلیسی (slug)
            <input
              className={fieldClass()}
              value={form.slug}
              onChange={(event) => set("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
              maxLength={120}
              dir="ltr"
            />
            <span className="text-xs text-muted-foreground" dir="ltr">
              /blog/{form.slug || "article-slug"}
            </span>
          </label>
          <label className="grid gap-1.5 text-sm lg:col-span-2">
            خلاصه‌ی مقاله
            <textarea
              className={fieldClass()}
              value={form.excerpt}
              onChange={(event) => set("excerpt", event.target.value)}
              required
              maxLength={320}
              rows={2}
            />
            <span className="text-xs text-muted-foreground">
              {form.excerpt.length}/320 · خلاصه‌ای روشن و مرتبط با جست‌وجوی کاربر بنویسید.
            </span>
          </label>
          <label className="grid gap-1.5 text-sm">
            دسته‌بندی
            <input
              className={fieldClass()}
              value={form.category}
              onChange={(event) => set("category", event.target.value)}
              required
              maxLength={100}
              placeholder="مثلاً لوله‌کشی"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            نشانی دسته‌بندی
            <input
              className={fieldClass()}
              value={form.categorySlug}
              onChange={(event) => set("categorySlug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
              maxLength={100}
              dir="ltr"
              placeholder="plumbing"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            نام نویسنده
            <input
              className={fieldClass()}
              value={form.authorName}
              onChange={(event) => set("authorName", event.target.value)}
              required
              maxLength={100}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            عنوان نویسنده
            <input
              className={fieldClass()}
              value={form.authorRole}
              onChange={(event) => set("authorRole", event.target.value)}
              required
              maxLength={100}
            />
          </label>
          <label className="grid gap-1.5 text-sm lg:col-span-2">
            متن مقاله
            <textarea
              className={`${fieldClass()} min-h-72 leading-7`}
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              required
              placeholder={
                "مقدمه‌ی مقاله...\n\n## تیتر بخش\nتوضیح این بخش...\n\n- نکته‌ی اول\n- نکته‌ی دوم\n\n> نکته‌ی مهم"
              }
            />
            <span className="text-xs text-muted-foreground">متن به‌صورت امن و بدون اجرای HTML نمایش داده می‌شود.</span>
          </label>
          <label className="grid gap-1.5 text-sm">
            عنوان SEO
            <input
              className={fieldClass()}
              value={form.seoTitle ?? ""}
              onChange={(event) => set("seoTitle", event.target.value || null)}
              maxLength={70}
            />
            <span className="text-xs text-muted-foreground">{form.seoTitle?.length ?? 0}/70</span>
          </label>
          <label className="grid gap-1.5 text-sm">
            توضیحات SEO
            <textarea
              className={fieldClass()}
              value={form.seoDescription ?? ""}
              onChange={(event) => set("seoDescription", event.target.value || null)}
              maxLength={320}
              rows={2}
            />
            <span className="text-xs text-muted-foreground">{form.seoDescription?.length ?? 0}/320</span>
          </label>
          <label className="grid gap-1.5 text-sm">
            برچسب‌ها (با ویرگول جدا کنید)
            <input
              className={fieldClass()}
              value={form.tags.join(", ")}
              onChange={(event) => set("tags", event.target.value.split(","))}
              maxLength={500}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            متن جایگزین تصویر کاور
            <input
              className={fieldClass()}
              value={form.coverAlt ?? ""}
              onChange={(event) => set("coverAlt", event.target.value || null)}
              maxLength={200}
            />
          </label>
          <label className="grid gap-1.5 text-sm lg:col-span-2">
            نشانی تصویر کاور (اختیاری)
            <input
              className={fieldClass()}
              type="url"
              value={form.coverImage ?? ""}
              onChange={(event) => set("coverImage", event.target.value || null)}
              maxLength={2048}
              dir="ltr"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            نشانی canonical (اختیاری)
            <input
              className={fieldClass()}
              type="url"
              value={form.canonicalUrl ?? ""}
              onChange={(event) => set("canonicalUrl", event.target.value || null)}
              maxLength={2048}
              dir="ltr"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            وضعیت انتشار
            <select
              className={fieldClass()}
              value={form.status}
              onChange={(event) => set("status", event.target.value as BlogPostInput["status"])}
            >
              <option value="DRAFT">پیش‌نویس</option>
              <option value="PUBLISHED">منتشرشده</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2 pt-2 lg:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              {saveButtonLabel}
            </button>
            {selected ? (
              <button type="button" onClick={startNew} className="h-10 rounded-lg border px-4 text-sm hover:bg-muted">
                لغو ویرایش
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${fieldClass()} pr-9`}
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="جست‌وجو در عنوان، دسته یا نشانی مقاله"
            />
          </label>
          <select
            className={`${fieldClass()} sm:w-40`}
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value as typeof statusFilter);
            }}
          >
            <option value="ALL">همه‌ی وضعیت‌ها</option>
            <option value="PUBLISHED">منتشرشده</option>
            <option value="DRAFT">پیش‌نویس</option>
          </select>
          <button
            type="button"
            onClick={() => void loadPosts()}
            disabled={loading}
            aria-label="بارگذاری دوباره"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm hover:bg-muted disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            تازه‌سازی
          </button>
        </div>

        {postListContent}
        {!error && total > 0 ? (
          <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              تعداد در صفحه
              <select
                className={fieldClass().replace("min-h-11", "min-h-9").replace("w-full", "w-24")}
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size.toLocaleString("fa-IR")}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-xl border border-border bg-card px-3 py-2 transition-colors hover:border-primary/35 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              قبلی
            </button>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              صفحه‌ی {page.toLocaleString("fa-IR")} از {Math.ceil(total / pageSize).toLocaleString("fa-IR")}
            </span>
            <button
              type="button"
              disabled={loading || page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl border border-border bg-card px-3 py-2 transition-colors hover:border-primary/35 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              بعدی
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
