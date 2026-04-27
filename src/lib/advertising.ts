"use client";

import { buildChatTargetPath } from "@/app/authenticated-routes/chat/chat-addressing";

export const ADVERTISING_ROUTE_PATH = "/advertise";
export const ADVERTISING_XMTP_TARGET = "0x5F8a65EE12Db7B35C990aEdc3f93C4e1290356e3";
export const ADVERTISING_MESSAGE_DRAFT = "I'm interested in advertising on this site. My budget is... ";

export function buildAdvertisingMessagePath(): string {
  return buildChatTargetPath(ADVERTISING_XMTP_TARGET, {
    initialMessage: ADVERTISING_MESSAGE_DRAFT,
  });
}
