import type { Metadata } from "next";

import { ConversationManagement } from "./_components/conversation-management";

export const metadata: Metadata = {
  title: "مدیریت گفتگوها",
};

export default function Page() {
  return <ConversationManagement />;
}
