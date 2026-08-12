import { afterEach, expect, mock, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

mock.module("@/lib/api/session-store", () => ({ useSession: () => null }));
mock.module("@/lib/api", () => ({ useApi: () => ({ bookings: {} }) }));
mock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyRuntime: () => ({ connect: () => {} }),
}));
mock.module("@/hooks/use-route-messages", () => ({
  useRouteMessages: () => ({
    localeTag: "en-US",
    copy: {
      bookingManagement: {
        dialog: {},
        route: {
          cancelError: "Cancel failed",
          cancelledToast: "Cancelled",
          loadError: "Load failed",
          previewError: "Preview failed",
        },
        status: {},
        view: {
          paymentInProgress: "Payment in progress",
          paymentResumeDetail: "Resume payment",
          refundPendingDetail: "Refund pending",
          refundPendingTitle: "Refund pending",
          resumePayment: "Resume",
        },
      },
    },
  }),
}));
mock.module("@/components/compositions/bookings/booking-management-view/booking-management-view", () => ({
  BookingManagementView: () => <div>Booking management</div>,
}));

const { BookingManagementPage } = await import("./booking-management-route");

afterEach(cleanup);

test("booking management renders its declared spacing owner while signed out", () => {
  const view = render(<BookingManagementPage role="booker" />);

  expect(view.getByText("Booking management")).toBeTruthy();
  expect(view.container.querySelector('[data-route-spacing-owner="standard"]')).toBeTruthy();
});
