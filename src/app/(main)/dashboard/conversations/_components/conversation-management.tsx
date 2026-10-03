"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, LoaderCircle, MessageSquareText, Pause, Play, RefreshCw, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { ApiError, apiFetch } from "../../services/_components/api";
import type {
  ChatConversationPage,
  ChatMessage,
  ChatMessagesResult,
  ConversationStatus,
  MessageStatus,
} from "./chat-api";

const CONVERSATIONS_KEY = ["admin-chat-conversations"] as const;
const MESSAGES_KEY = ["admin-chat-messages"] as const;
const statusLabels: Record<ConversationStatus, string> = {
  ACTIVE: "فعال",
  PAUSED: "متوقف",
  CLOSED: "بسته",
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 401) return "نشست مدیر معتبر نیست؛ دوباره وارد پنل شوید.";
  if (error instanceof ApiError && error.status === 403) return "حساب شما مجوز مدیریت گفتگوها را ندارد.";
  if (error instanceof TypeError) return "ارتباط با سرویس گفتگو برقرار نشد؛ اتصال API را بررسی کنید.";
  return error instanceof Error ? error.message : fallback;
}

function StatusBadge({ status }: { status: ConversationStatus }) {
  return <Badge variant="outline">{statusLabels[status]}</Badge>;
}

function statusActionTitle(status: ConversationStatus | null) {
  if (status === "PAUSED") return "توقف گفتگو";
  if (status === "CLOSED") return "بستن گفتگو";
  return "فعال‌کردن گفتگو";
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center text-sm" role="alert">
      <p>{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={retry}>
        تلاش دوباره
      </Button>
    </div>
  );
}

export function ConversationManagement() {
  const { data: session, status: sessionStatus } = useSession();
  const token = session?.accessToken as string | undefined;
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusIntent, setStatusIntent] = useState<ConversationStatus | null>(null);
  const [pausedReason, setPausedReason] = useState("");
  const [moderationIntent, setModerationIntent] = useState<{
    message: ChatMessage;
    status: MessageStatus;
  } | null>(null);
  const [moderationNote, setModerationNote] = useState("");

  const conversationQuery = useQuery({
    queryKey: [...CONVERSATIONS_KEY, page, pageSize, statusFilter],
    enabled: !!token,
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      return apiFetch<ChatConversationPage>(`/admin/chats?${params}`, token as string);
    },
  });

  const conversations = conversationQuery.data?.items ?? [];
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) ?? null;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((conversationQuery.data?.total ?? 0) / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [conversationQuery.data?.total, page, pageSize]);

  useEffect(() => {
    if (selectedId && conversations.some((conversation) => conversation.id === selectedId)) return;
    setSelectedId(conversations[0]?.id ?? null);
  }, [conversations, selectedId]);

  const messagesQuery = useQuery({
    queryKey: [...MESSAGES_KEY, selectedId],
    enabled: !!token && !!selectedId,
    queryFn: () =>
      apiFetch<ChatMessagesResult>(`/admin/chats/${encodeURIComponent(selectedId as string)}`, token as string),
  });

  const refreshRelated = async (conversationId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
      queryClient.invalidateQueries({
        queryKey: [...MESSAGES_KEY, conversationId],
      }),
    ]);
  };

  const updateStatus = useMutation({
    mutationFn: ({
      conversationId,
      status,
      reason,
    }: {
      conversationId: string;
      status: ConversationStatus;
      reason: string;
    }) =>
      apiFetch(`/admin/chats/${encodeURIComponent(conversationId)}`, token as string, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ...(status === "PAUSED" && reason.trim() ? { pausedReason: reason.trim() } : {}),
        }),
      }),
    onSuccess: async (_, variables) => {
      await refreshRelated(variables.conversationId);
      setStatusIntent(null);
      setPausedReason("");
      toast.success("وضعیت گفتگو به‌روزرسانی شد");
    },
    onError: (error) => toast.error(errorMessage(error, "تغییر وضعیت گفتگو ناموفق بود")),
  });

  const moderateMessage = useMutation({
    mutationFn: ({
      conversationId,
      messageId,
      status,
      note,
    }: {
      conversationId: string;
      messageId: string;
      status: MessageStatus;
      note: string;
    }) =>
      apiFetch<ChatMessage>(
        `/admin/chats/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
        token as string,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            ...(note.trim() ? { note: note.trim() } : {}),
          }),
        },
      ),
    onSuccess: async (_, variables) => {
      await refreshRelated(variables.conversationId);
      setModerationIntent(null);
      setModerationNote("");
      toast.success(variables.status === "HIDDEN" ? "پیام مخفی شد" : "پیام دوباره قابل مشاهده شد");
    },
    onError: (error) => toast.error(errorMessage(error, "تغییر وضعیت نمایش پیام ناموفق بود")),
  });

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground text-sm">
        <LoaderCircle className="size-4 animate-spin" /> در حال بررسی نشست...
      </div>
    );
  }
  if (sessionStatus === "unauthenticated") {
    return <div className="p-6 text-center text-sm">برای مشاهده گفتگوها وارد پنل ادمین شوید.</div>;
  }

  const messages = messagesQuery.data?.messages ?? [];
  const pageCount = Math.max(1, Math.ceil((conversationQuery.data?.total ?? 0) / pageSize));

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-xl">مدیریت گفتگوها</h1>
          <p className="mt-1 text-muted-foreground text-sm">نظارت بر گفتگوی مشتری و ارائه‌دهنده</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={conversationQuery.isFetching}
          onClick={() => void conversationQuery.refetch()}
        >
          <RefreshCw className={conversationQuery.isFetching ? "animate-spin" : ""} />
          تازه‌سازی فهرست
        </Button>
      </header>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.5fr)]">
        <Card className="min-w-0">
          <CardHeader className="border-b">
            <CardTitle className="text-base">گفتگوها</CardTitle>
            <CardDescription>مرتب‌شده بر اساس آخرین فعالیت</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as typeof statusFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="w-40" aria-label="فیلتر وضعیت گفتگو">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
                    <SelectItem value="ACTIVE">فعال</SelectItem>
                    <SelectItem value="PAUSED">متوقف</SelectItem>
                    <SelectItem value="CLOSED">بسته</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="w-28" aria-label="تعداد گفتگو در صفحه">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {[10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} مورد
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {conversationQuery.isPending && (
              <div
                className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground text-sm"
                role="status"
              >
                <LoaderCircle className="size-4 animate-spin" /> در حال بارگذاری گفتگوها...
              </div>
            )}
            {conversationQuery.isError && (
              <ErrorState
                message={errorMessage(conversationQuery.error, "دریافت فهرست گفتگوها ناموفق بود")}
                retry={() => void conversationQuery.refetch()}
              />
            )}
            {!conversationQuery.isPending && !conversationQuery.isError && conversations.length === 0 && (
              <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground text-sm">
                <MessageSquareText className="size-5" /> گفتگویی برای این فیلتر پیدا نشد.
              </div>
            )}
            {!conversationQuery.isPending && !conversationQuery.isError && conversations.length > 0 && (
              <div className="divide-y">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    aria-pressed={selectedId === conversation.id}
                    onClick={() => setSelectedId(conversation.id)}
                    className={`flex w-full min-w-0 flex-col gap-2 px-4 py-3 text-right transition-colors hover:bg-muted/50 ${selectedId === conversation.id ? "bg-muted" : ""}`}
                  >
                    <span className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate font-medium text-sm">{conversation.requestTitle}</span>
                      <StatusBadge status={conversation.status} />
                    </span>
                    <span className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
                      <span>مشتری: {conversation.customerName ?? "نامشخص"}</span>
                      <span>ارائه‌دهنده: {conversation.providerName ?? "نامشخص"}</span>
                    </span>
                    <span className="wrap-break-word line-clamp-2 text-muted-foreground text-xs">
                      {conversation.lastMessage?.body ?? "هنوز پیامی ثبت نشده است"}
                    </span>
                    <span className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
                      <span>{conversation.messageCount.toLocaleString("fa-IR")} پیام</span>
                      <time dateTime={conversation.updatedAt}>{formatDate(conversation.updatedAt)}</time>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs">
              <span className="text-muted-foreground">
                صفحه {page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")} ·{" "}
                {(conversationQuery.data?.total ?? 0).toLocaleString("fa-IR")} گفتگو
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || conversationQuery.isFetching}
                  onClick={() => setPage((current) => current - 1)}
                >
                  قبلی
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount || conversationQuery.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  بعدی
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          {!selectedConversation ? (
            <CardContent className="flex min-h-80 flex-col items-center justify-center gap-2 text-center text-muted-foreground text-sm">
              <MessageSquareText className="size-5" /> یک گفتگو را برای مشاهده تاریخچه انتخاب کنید.
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{selectedConversation.requestTitle}</CardTitle>
                    <CardDescription className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span>مشتری: {selectedConversation.customerName ?? "نامشخص"}</span>
                      <span>ارائه‌دهنده: {selectedConversation.providerName ?? "نامشخص"}</span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedConversation.status} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={messagesQuery.isFetching}
                      onClick={() => void messagesQuery.refetch()}
                    >
                      <RefreshCw className={messagesQuery.isFetching ? "animate-spin" : ""} /> تازه‌سازی پیام‌ها
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedConversation.status !== "ACTIVE" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => setStatusIntent("ACTIVE")}
                    >
                      <Play /> فعال‌کردن
                    </Button>
                  )}
                  {selectedConversation.status === "ACTIVE" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => setStatusIntent("PAUSED")}
                    >
                      <Pause /> توقف گفتگو
                    </Button>
                  )}
                  {selectedConversation.status !== "CLOSED" && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => setStatusIntent("CLOSED")}
                    >
                      <X /> بستن گفتگو
                    </Button>
                  )}
                </div>
                {selectedConversation.pausedReason && (
                  <p className="text-muted-foreground text-xs">دلیل توقف: {selectedConversation.pausedReason}</p>
                )}
              </CardHeader>

              <CardContent className="p-0">
                {messagesQuery.isPending && (
                  <div
                    className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground text-sm"
                    role="status"
                  >
                    <LoaderCircle className="size-4 animate-spin" /> در حال بارگذاری پیام‌ها...
                  </div>
                )}
                {messagesQuery.isError && (
                  <ErrorState
                    message={errorMessage(messagesQuery.error, "دریافت پیام‌های گفتگو ناموفق بود")}
                    retry={() => void messagesQuery.refetch()}
                  />
                )}
                {!messagesQuery.isPending && !messagesQuery.isError && messages.length === 0 && (
                  <div className="flex min-h-64 items-center justify-center p-6 text-center text-muted-foreground text-sm">
                    این گفتگو هنوز پیامی ندارد.
                  </div>
                )}
                {!messagesQuery.isPending && !messagesQuery.isError && messages.length > 0 && (
                  <ol className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto p-4">
                    {messages.map((message) => (
                      <li
                        key={message.id}
                        className={`min-w-0 rounded-md border p-3 ${message.status === "HIDDEN" ? "border-destructive/40 bg-destructive/5" : "bg-background"}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium text-sm">{message.sender.name}</span>
                            <Badge variant="outline">{message.sender.role === "ADMIN" ? "ادمین" : "طرف گفتگو"}</Badge>
                            <Badge variant={message.status === "VISIBLE" ? "secondary" : "destructive"}>
                              {message.status === "VISIBLE" ? "قابل مشاهده" : "مخفی"}
                            </Badge>
                          </div>
                          <time className="text-muted-foreground text-xs" dateTime={message.createdAt}>
                            {formatDate(message.createdAt)}
                          </time>
                        </div>
                        <p className="wrap-break-word mt-3 whitespace-pre-wrap text-sm leading-7">{message.body}</p>
                        {message.moderationNote && (
                          <p className="mt-2 border-t pt-2 text-muted-foreground text-xs">
                            یادداشت مدیریت: {message.moderationNote}
                          </p>
                        )}
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={moderateMessage.isPending}
                            onClick={() => {
                              setModerationIntent({
                                message,
                                status: message.status === "VISIBLE" ? "HIDDEN" : "VISIBLE",
                              });
                              setModerationNote("");
                            }}
                          >
                            {message.status === "VISIBLE" ? (
                              <>
                                <EyeOff /> مخفی‌کردن پیام
                              </>
                            ) : (
                              <>
                                <Eye /> بازگرداندن نمایش
                              </>
                            )}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      <AlertDialog
        open={statusIntent !== null}
        onOpenChange={(open) => {
          if (!open) setStatusIntent(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{statusActionTitle(statusIntent)}</AlertDialogTitle>
            <AlertDialogDescription>
              این تغییر از طریق پنل مدیریت روی دسترسی طرفین به گفتگو اعمال می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {statusIntent === "PAUSED" && (
            <div className="grid gap-2">
              <Label htmlFor="paused-reason">دلیل توقف (اختیاری)</Label>
              <Textarea
                id="paused-reason"
                maxLength={500}
                value={pausedReason}
                onChange={(event) => setPausedReason(event.target.value)}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatus.isPending}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateStatus.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (statusIntent && selectedId)
                  updateStatus.mutate({
                    conversationId: selectedId,
                    status: statusIntent,
                    reason: pausedReason,
                  });
              }}
            >
              {updateStatus.isPending ? "در حال ثبت..." : "تأیید تغییر"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={moderationIntent !== null}
        onOpenChange={(open) => {
          if (!open) setModerationIntent(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {moderationIntent?.status === "HIDDEN" ? "مخفی‌کردن پیام" : "بازگرداندن نمایش پیام"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              یادداشت مدیریت ثبت می‌شود و برای طرفین به‌عنوان پیام جدید ارسال نخواهد شد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="moderation-note">یادداشت (اختیاری)</Label>
            <Textarea
              id="moderation-note"
              maxLength={500}
              value={moderationNote}
              onChange={(event) => setModerationNote(event.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={moderateMessage.isPending}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={moderateMessage.isPending || !moderationIntent || !selectedId}
              onClick={(event) => {
                event.preventDefault();
                if (moderationIntent && selectedId)
                  moderateMessage.mutate({
                    conversationId: selectedId,
                    messageId: moderationIntent.message.id,
                    status: moderationIntent.status,
                    note: moderationNote,
                  });
              }}
            >
              {moderateMessage.isPending ? "در حال ثبت..." : "تأیید تغییر"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
