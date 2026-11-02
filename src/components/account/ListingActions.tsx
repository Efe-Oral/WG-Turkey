"use client";

import { MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu, Toast as RadixToast } from "radix-ui";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Radio } from "@/components/ui/Choice";
import { Modal } from "@/components/ui/Modal";
import type { MyListing } from "@/lib/account/queries";
import {
  deleteListing,
  markRented,
  pauseListing,
  recordBoostInterest,
  resumeListing,
} from "@/lib/listings/lifecycle";

const itemClasses =
  "block cursor-pointer rounded-input px-3 py-2 font-normal outline-none data-highlighted:bg-black/4 hover:no-underline";

const DELETE_REASONS = [
  "rented_here",
  "rented_elsewhere",
  "changed_mind",
  "other",
] as const;

export function ListingActions({ listing }: { listing: MyListing }) {
  const t = useTranslations("myListings");
  const common = useTranslations("common");
  const router = useRouter();

  const [rentedOpen, setRentedOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [via, setVia] = useState<"yes" | "no" | "elsewhere">();
  const [conversationId, setConversationId] = useState("");
  const [reason, setReason] = useState<(typeof DELETE_REASONS)[number]>();
  const [toast, setToast] = useState<string>();
  const [toastOpen, setToastOpen] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setToastOpen(true);
  };

  const run = async (action: () => Promise<{ ok: boolean }>) => {
    const { ok } = await action();
    if (ok) router.refresh();
    else showToast(t("actionFailed"));
    return ok;
  };

  const canPause = listing.status === "active";
  const canResume = listing.status === "paused";
  const canRent = listing.status === "active" || listing.status === "paused";

  return (
    <RadixToast.Provider duration={4000}>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          aria-label={t("menu")}
          className="relative z-10 flex size-9 cursor-pointer items-center justify-center rounded-pill hover:bg-black/4"
        >
          <MoreVertical aria-hidden="true" size={20} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-50 min-w-56 rounded-card bg-white p-1 shadow-float"
          >
            <DropdownMenu.Item asChild>
              <Link href={`/ilan/${listing.publicNumber}/duzenle`} className={itemClasses}>
                {t("edit")}
              </Link>
            </DropdownMenu.Item>
            {canPause ? (
              <DropdownMenu.Item
                className={itemClasses}
                onSelect={() => void run(() => pauseListing(listing.id))}
              >
                {t("pause")}
              </DropdownMenu.Item>
            ) : null}
            {canResume ? (
              <DropdownMenu.Item
                className={itemClasses}
                onSelect={() => void run(() => resumeListing(listing.id))}
              >
                {t("resume")}
              </DropdownMenu.Item>
            ) : null}
            {canRent ? (
              <DropdownMenu.Item
                className={itemClasses}
                onSelect={() => setRentedOpen(true)}
              >
                {t("markRented")}
              </DropdownMenu.Item>
            ) : null}
            <DropdownMenu.Item
              className={itemClasses}
              onSelect={() => {
                showToast(t("boostToast"));
                void recordBoostInterest(listing.id);
              }}
            >
              {t("boost")}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={itemClasses}
              onSelect={() => setDeleteOpen(true)}
            >
              {t("delete")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Modal
        title={t("rentedTitle")}
        closeLabel={common("close")}
        open={rentedOpen}
        onOpenChange={setRentedOpen}
      >
        <div className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium">{t("rentedQuestion")}</legend>
            <Radio
              name="rented-via"
              label={t("rentedYes")}
              checked={via === "yes"}
              onChange={() => setVia("yes")}
            />
            <Radio
              name="rented-via"
              label={t("rentedNo")}
              checked={via === "no"}
              onChange={() => setVia("no")}
            />
            <Radio
              name="rented-via"
              label={t("rentedElsewhere")}
              checked={via === "elsewhere"}
              onChange={() => setVia("elsewhere")}
            />
          </fieldset>
          {via === "yes" && listing.conversations.length > 0 ? (
            <label className="flex flex-col gap-1 text-meta font-semibold">
              {t("rentedConversation")}
              <select
                value={conversationId}
                onChange={(event) => setConversationId(event.target.value)}
                className="h-11 rounded-input border border-black/20 bg-white px-3 text-body font-normal"
              >
                <option value="">{t("rentedConversationNone")}</option>
                {listing.conversations.map((conversation) => (
                  <option key={conversation.id} value={conversation.id}>
                    {conversation.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Button
            disabled={!via}
            onClick={() => {
              if (!via) return;
              void run(() =>
                markRented(
                  listing.id,
                  via,
                  via === "yes" && conversationId ? conversationId : null,
                ),
              ).then(() => setRentedOpen(false));
            }}
          >
            {t("rentedSave")}
          </Button>
        </div>
      </Modal>

      <Modal
        title={t("deleteTitle")}
        closeLabel={common("close")}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      >
        <div className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium">{t("deleteQuestion")}</legend>
            {DELETE_REASONS.map((item) => (
              <Radio
                key={item}
                name="delete-reason"
                label={t(`reasons.${item}`)}
                checked={reason === item}
                onChange={() => setReason(item)}
              />
            ))}
          </fieldset>
          <Button
            variant="dark"
            disabled={!reason}
            onClick={() => {
              if (!reason) return;
              void run(() => deleteListing(listing.id, reason)).then(() =>
                setDeleteOpen(false),
              );
            }}
          >
            {t("deleteConfirm")}
          </Button>
        </div>
      </Modal>

      <RadixToast.Root
        open={toastOpen}
        onOpenChange={setToastOpen}
        className="rounded-card bg-graphite px-4 py-3 text-body text-white shadow-float"
      >
        <RadixToast.Description>{toast}</RadixToast.Description>
      </RadixToast.Root>
      <RadixToast.Viewport className="fixed bottom-4 left-1/2 z-50 w-[calc(100vw-32px)] max-w-[420px] -translate-x-1/2 outline-none" />
    </RadixToast.Provider>
  );
}
