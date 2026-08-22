"use client";

import * as React from "react";

// Browser-only SDKs are replaced in the Worker/SSR graph. Their real modules
// remain in the client build and are loaded after hydration or from effects.
// Keeping them out of the SSR bridge prevents browser WASM/media runtimes from
// consuming the entire Cloudflare Worker upload budget.

export default {
  createClient() {
    throw new Error("Agora is available in the browser only");
  },
};

export class ZKPassport {
  constructor(_domain: string) {}
  async request(): Promise<never> {
    throw new Error("ZKPassport is available in the browser only");
  }
}

export class StoryClient {
  static newClient(): never {
    throw new Error("StoryClient is available in the browser only");
  }
}

export const WIP_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";

export type SelfApp = Record<string, unknown>;

export function SelfQRcodeWrapper() {
  return null;
}

type ElementProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
  src?: string;
  alt?: string;
};

export function MediaPlayer({ children, ...props }: ElementProps) {
  return <div {...props}>{children}</div>;
}

export function MediaProvider({ children }: ElementProps) {
  return <>{children}</>;
}

export function Poster({ src, alt, ...props }: ElementProps) {
  return src ? <img src={src} alt={alt ?? ""} {...props} /> : null;
}

export function Gesture() {
  return null;
}

export function DefaultVideoLayout() {
  return null;
}

export const defaultLayoutIcons = {};

export function createVeryWidget(): never {
  throw new Error("Very widget is available in the browser only");
}
