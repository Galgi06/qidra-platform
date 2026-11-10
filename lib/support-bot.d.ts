import type { SiteContentSnapshot } from "./site-content";

export type SupportBotReply = {
  body: string;
  category: string;
  escalate: boolean;
};

export function buildSupportBotReply(input: {
  faqItems?: SiteContentSnapshot["faqItems"];
  hasAttachments?: boolean;
  locale?: "en" | "ru";
  message: string;
}): SupportBotReply;

export function supportBotEnabled(): boolean;
