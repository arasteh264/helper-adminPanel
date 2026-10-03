export type ConversationStatus = "ACTIVE" | "PAUSED" | "CLOSED";
export type MessageStatus = "VISIBLE" | "HIDDEN";

export type ConversationMessagePreview = {
  id: string;
  body: string;
  status: MessageStatus;
  createdAt: string;
  sender: { name: string };
};

export type ChatConversation = {
  id: string;
  status: ConversationStatus;
  pausedReason: string | null;
  serviceRequestId: string;
  requestTitle: string;
  requestStatus: string;
  customerName: string | null;
  providerName: string | null;
  messageCount: number;
  lastMessage: ConversationMessagePreview | null;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  body: string;
  status: MessageStatus;
  createdAt: string;
  moderationNote: string | null;
  moderatedAt: string | null;
  sender: { id: string; name: string; role: string };
};

export type ChatConversationPage = {
  items: ChatConversation[];
  page: number;
  pageSize: number;
  total: number;
};

export type ChatMessagesResult = {
  conversation: Pick<ChatConversation, "id" | "status" | "pausedReason">;
  messages: ChatMessage[];
};
