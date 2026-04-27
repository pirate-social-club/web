"use client";

import * as React from "react";
import {
  ChatCircle,
  Desktop,
  DotsThree,
  DeviceMobile,
  Export,
  House,
  Megaphone,
  MagnifyingGlass,
  Plus,
  ShareFat,
  Bell,
  ArrowFatUp,
  ArrowFatDown,
} from "@phosphor-icons/react";

import { navigate } from "@/app/router";
import {
  Modal,
  ModalFooter,
} from "@/components/compositions/system/modal/modal";
import {
  StandardModalContent,
  StandardModalHeader,
  StandardModalIconBadge,
} from "@/components/compositions/system/modal/standard-modal-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Type,
} from "@/components/primitives";
import { FormFieldLabel } from "@/components/primitives/form-layout";
import { PirateBrandMark } from "@/components/primitives/pirate-brand-mark";
import { buildAdvertisingMessagePath } from "@/lib/advertising";

type PreviewMode = "mobile" | "desktop";

// ─── Accordion Section ───

interface SectionProps {
  value: string;
  number: number;
  title: string;
  children?: React.ReactNode;
}

function Section({ value, number, title, children }: SectionProps) {
  return (
    <AccordionItem
      value={value}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <AccordionTrigger
        data-ads-no-modal
        className="px-5 py-4 text-start hover:no-underline [&>svg]:size-5 [&>svg]:text-muted-foreground"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {number}
          </span>
          <Type variant="body-strong">{title}</Type>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-0">
        <div className="border-t border-border px-5 pt-4">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

function AdPreviewContent() {
  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="size-8 rounded-full bg-primary" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">u/technohippi3</span>
          <span className="text-xs text-muted-foreground">Promoted</span>
        </div>
        <DotsThree className="ml-auto size-5 text-muted-foreground" weight="bold" />
      </div>

      <p className="mb-3 text-base font-semibold text-foreground">Write a compelling headline</p>

      <div className="mb-3 aspect-square w-full rounded-2xl bg-muted" />

      <p className="mb-3 text-xs text-muted-foreground">Display URL</p>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1">
            <ArrowFatUp className="size-5" />
            <span className="text-sm">Vote</span>
            <ArrowFatDown className="size-5" />
          </div>
          <div className="flex items-center gap-1">
            <ChatCircle className="size-5" />
            <span className="text-sm">0</span>
          </div>
          <div className="flex items-center gap-1">
            <ShareFat className="size-5" />
            <span className="text-sm">Share</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Shells ───

function MobileAdPreview() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[360px] rounded-[2.5rem] border-[6px] border-muted bg-background p-2 shadow-2xl">
        {/* Notch */}
        <div className="absolute left-1/2 top-2 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-muted" />

        {/* Screen */}
        <div className="relative overflow-hidden rounded-[2rem] bg-background">
          {/* App header */}
          <div className="flex items-center justify-between bg-muted px-4 py-2 pt-7">
            <div className="flex items-center gap-2">
              <PirateBrandMark className="size-6" />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MagnifyingGlass className="size-5" />
            </div>
          </div>

          <AdPreviewContent />

          {/* Bottom nav */}
          <div className="flex items-center justify-around border-t border-border bg-muted px-3 py-3">
            <House className="size-6 text-foreground" weight="fill" />
            <MagnifyingGlass className="size-6 text-muted-foreground" />
            <Plus className="size-6 text-muted-foreground" />
            <ChatCircle className="size-6 text-muted-foreground" />
            <Bell className="size-6 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopAdPreview() {
  return (
    <div className="w-full rounded-[1.5rem] border border-border bg-background shadow-lg">
      <div className="mx-auto w-full">
        <AdPreviewContent />
      </div>
    </div>
  );
}

// ─── Main Component ───

export function AdCreator() {
  const [headline, setHeadline] = React.useState("");
  const [allowComments, setAllowComments] = React.useState(true);
  const [addSourceParam, setAddSourceParam] = React.useState(false);
  const [cta, setCta] = React.useState("");
  const [openSection, setOpenSection] = React.useState("creative");
  const [previewMode, setPreviewMode] = React.useState<PreviewMode>("mobile");
  const [comingSoonOpen, setComingSoonOpen] = React.useState(false);
  const messageHref = React.useMemo(() => buildAdvertisingMessagePath(), []);

  const shouldBlockInteraction = React.useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.closest("[data-ads-coming-soon-modal]")) return false;
    if (target.closest("[data-ads-no-modal]")) return false;

    return !!target.closest(
      "button, input, textarea, label, a, [role='button'], [role='checkbox'], [role='combobox']",
    );
  }, []);

  const openComingSoonModal = React.useCallback(() => {
    setComingSoonOpen(true);
  }, []);

  const blurIfFocusable = React.useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return;
    if (
      target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLButtonElement
      || target.getAttribute("tabindex") !== null
      || target.getAttribute("role") === "combobox"
    ) {
      target.blur();
    }
  }, []);

  const handleInteractionCapture = React.useCallback(
    (event: React.SyntheticEvent) => {
      if (!shouldBlockInteraction(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      blurIfFocusable(event.target);
      openComingSoonModal();
    },
    [blurIfFocusable, openComingSoonModal, shouldBlockInteraction],
  );

  const handleKeyDownCapture = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!shouldBlockInteraction(event.target)) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      blurIfFocusable(event.target);
      openComingSoonModal();
    },
    [blurIfFocusable, openComingSoonModal, shouldBlockInteraction],
  );

  const handleFocusCapture = React.useCallback(
    (event: React.FocusEvent) => {
      if (!shouldBlockInteraction(event.target)) return;
      blurIfFocusable(event.target);
      openComingSoonModal();
    },
    [blurIfFocusable, openComingSoonModal, shouldBlockInteraction],
  );

  return (
    <>
      <div
        className="min-h-screen w-full bg-background lg:grid lg:grid-cols-2"
        onFocusCapture={handleFocusCapture}
        onPointerDownCapture={handleInteractionCapture}
        onKeyDownCapture={handleKeyDownCapture}
      >
        {/* Left Panel */}
        <div className="min-w-0 p-4 sm:p-6 lg:p-10">
          <div className="w-full space-y-4 sm:space-y-5">
            <Type as="h1" variant="h1">
              Create ad
            </Type>

            <div className="lg:hidden">
              <DesktopAdPreview />
            </div>

            <Accordion
              type="single"
              collapsible
              value={openSection}
              onValueChange={(value) => setOpenSection(value)}
              className="space-y-4"
            >
              {/* Section 1: Creative */}
              <Section value="creative" number={1} title="Creative">
                <div className="space-y-5">
                  {/* Images or video */}
                  <div>
                    <FormFieldLabel
                      className="mb-2"
                      label="Images or video"
                      counter={
                        <span>
                          You can also select an existing post from your{" "}
                          <span className="cursor-pointer font-medium text-primary underline">
                            post library
                          </span>
                        </span>
                      }
                    />

                    {/* Drop zone */}
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-input bg-muted/50 px-6 py-12">
                      <Export className="mb-2 size-7 text-muted-foreground" />
                      <p className="text-sm font-medium text-primary">
                        Drag and drop or browse files
                      </p>
                    </div>

                    {/* URL import */}
                    <div className="mt-3">
                      <FormFieldLabel className="mb-2" label="Add images from your website" />
                      <div className="flex gap-2">
                        <Input placeholder="https://" className="h-14 flex-1" />
                        <Button variant="secondary" size="sm" className="h-14 px-5">
                          Import
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Headline */}
                  <div>
                    <FormFieldLabel
                      className="mb-2"
                      label="Headline"
                      counter={`${headline.length}/300`}
                    />
                    <Textarea
                      placeholder="Write a compelling headline"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      maxLength={300}
                      className="min-h-[88px] resize-none"
                    />
                  </div>

                  {/* Call to Action */}
                  <div>
                    <FormFieldLabel className="mb-2" label="Call to Action" />
                    <Select value={cta} onValueChange={setCta}>
                      <SelectTrigger className="h-14">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="learn_more">Learn More</SelectItem>
                        <SelectItem value="shop_now">Shop Now</SelectItem>
                        <SelectItem value="sign_up">Sign Up</SelectItem>
                        <SelectItem value="download">Download</SelectItem>
                        <SelectItem value="watch_more">Watch More</SelectItem>
                        <SelectItem value="get_quote">Get Quote</SelectItem>
                        <SelectItem value="contact_us">Contact Us</SelectItem>
                        <SelectItem value="apply_now">Apply Now</SelectItem>
                        <SelectItem value="book_now">Book Now</SelectItem>
                        <SelectItem value="get_showtimes">Get Showtimes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Destination URL */}
                  <div>
                    <FormFieldLabel className="mb-2" label="Destination URL" />
                    <div className="flex gap-2">
                      <div className="flex h-14 flex-1 items-center overflow-hidden rounded-full border border-input bg-background">
                        <span className="px-4 text-sm text-muted-foreground">https://</span>
                        <input
                          type="text"
                          className="flex-1 bg-transparent py-2 pr-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
                          placeholder=""
                        />
                      </div>
                      <Button variant="outline" size="sm" className="h-14 gap-1.5 px-4">
                        <Export className="size-4" />
                        Preview
                      </Button>
                    </div>
                    <button className="mt-2 text-sm font-medium text-primary hover:underline">
                      Edit Display URL
                    </button>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id="source-param"
                        checked={addSourceParam}
                        onCheckedChange={(c) => setAddSourceParam(c === true)}
                      />
                      <label htmlFor="source-param" className="text-sm text-foreground">
                        Add source parameter
                      </label>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id="allow-comments"
                        checked={allowComments}
                        onCheckedChange={(c) => setAllowComments(c === true)}
                      />
                      <label htmlFor="allow-comments" className="text-sm text-foreground">
                        Allow comments
                      </label>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Section 2: Targeting & Delivery */}
              <Section value="targeting" number={2} title="Targeting & Delivery">
                <div className="space-y-5">
                  <div>
                    <FormFieldLabel className="mb-2" label="Targeting" />
                    <div className="flex gap-2">
                      <Button variant="outline" className="h-14 flex-1">
                        Broad
                      </Button>
                      <Button variant="outline" className="h-14 flex-1">
                        Custom
                      </Button>
                    </div>
                  </div>
                  <div>
                    <FormFieldLabel className="mb-2" label="Locations" />
                    <Input className="h-14" defaultValue="United States" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FormFieldLabel className="mb-2" label="Daily Budget" />
                      <Input className="h-14" defaultValue="$50.00" />
                    </div>
                    <div>
                      <FormFieldLabel className="mb-2" label="Start Date" />
                      <Input className="h-14" defaultValue="Apr 27, 2026" />
                    </div>
                  </div>
                </div>
              </Section>

              {/* Section 3: Payment */}
              <Section value="payment" number={3} title="Payment">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Advertising is coming soon. Message me if you want early access or want to discuss a campaign.
                  </p>
                  <Button
                    data-ads-no-modal
                    className="w-full sm:w-auto"
                    onClick={() => navigate(messageHref)}
                  >
                    <Megaphone className="mr-2 size-4" />
                    Message
                  </Button>
                </div>
              </Section>
            </Accordion>
          </div>
        </div>

        {/* Right Panel — Preview */}
        <div className="hidden min-w-0 bg-muted/30 lg:block">
          <div className="sticky top-0 h-screen overflow-hidden">
            <div className="relative flex h-full items-center justify-center">
              <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                <Button
                  variant={previewMode === "desktop" ? "secondary" : "outline"}
                  size="sm"
                  className="gap-2 rounded-full"
                  onClick={() => setPreviewMode("desktop")}
                >
                  <Desktop className="size-4" />
                  Desktop
                </Button>
                <Button
                  variant={previewMode === "mobile" ? "secondary" : "outline"}
                  size="sm"
                  className="gap-2 rounded-full"
                  onClick={() => setPreviewMode("mobile")}
                >
                  <DeviceMobile className="size-4" />
                  Mobile
                </Button>
              </div>

              {previewMode === "mobile" ? (
                <div className="flex w-full justify-center">
                  <MobileAdPreview />
                </div>
              ) : (
                <div className="w-full">
                  <DesktopAdPreview />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Modal onOpenChange={setComingSoonOpen} open={comingSoonOpen}>
        <StandardModalContent data-ads-coming-soon-modal width="default">
          <StandardModalHeader
            description="The full ads workflow is not open yet. Message me if you want early access or want to discuss a campaign."
            icon={
              <StandardModalIconBadge>
                <Megaphone className="size-7" />
              </StandardModalIconBadge>
            }
            title="Ads coming soon"
          />

          <ModalFooter className="mt-8">
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setComingSoonOpen(false);
                navigate(messageHref);
              }}
            >
              Message me
            </Button>
          </ModalFooter>
        </StandardModalContent>
      </Modal>
    </>
  );
}
