import { screen, within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations, render } from "@/test/test-utils";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "./modal";

function renderModal(forceMobile?: boolean) {
  return render(() => (
    <Modal forceMobile={forceMobile} open>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Unlock this content</ModalTitle>
          <ModalDescription>Add funds to continue.</ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <button type="button">Add funds</button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  ));
}

describe("Modal", () => {
  it("renders a named dialog on the desktop branch", async () => {
    renderModal(false);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Unlock this content" }),
    ).toBeVisible();
    expect(within(dialog).getByText("Add funds to continue.")).toBeVisible();
  });

  it("renders the mobile sheet branch when forced", async () => {
    renderModal(true);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-side", "bottom");
  });

  it("closes on Escape and reports through onOpenChange", async () => {
    const user = userEvent.setup();
    let openState = true;
    render(() => (
      <Modal forceMobile={false} onOpenChange={(open) => (openState = open)} open>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Closable</ModalTitle>
          </ModalHeader>
        </ModalContent>
      </Modal>
    ));

    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(openState).toBe(false);
  });

  it("has no automated a11y violations", async () => {
    renderModal(false);
    await screen.findByRole("dialog");

    await expectNoA11yViolations();
  });
});
