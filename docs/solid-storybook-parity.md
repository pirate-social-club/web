# Solid Storybook Parity Manifest

Source inventory: 177 React CSF story files under `web/src/`. Generated 2026-08-15
from `main@c3b077ce`; update the Status column as batches land. Rules: deterministic
offline stories (typed fixtures, callback-driven adapters; no live APIs, auth, router
state, timers, or random data); reusable UI in `packages/solid-ui`, product UI in
`solid/src/features/`. No original story state may silently disappear; consolidation
or splitting is allowed when noted in the Disposition/Notes column.

Current source disposition: 47 covered primitive files plus 65 done
product/composition files, or 112/177 total. 65 product/composition sources remain
not done (64 pending, one moved to B12). Counts are by React source file, not by
Solid story export or catalog file.

## A. Primitives — covered by the existing Solid catalog (47)

React `src/components/primitives/<name>.stories.tsx` → `packages/solid-ui/src/<target>/<name>.stories.tsx`.

| # | React story | Solid catalog target | Status |
| --- | --- | --- | --- |
| 1 | primitives/accordion | disclosure/accordion/accordion | covered |
| 2 | primitives/action-banner | patterns/feedback/action-banner/action-banner | covered |
| 3 | primitives/action-menu | patterns/overlays/action-menu/action-menu | covered |
| 4 | primitives/auto-resize-textarea | forms/auto-resize-textarea/auto-resize-textarea | covered |
| 5 | primitives/avatar | data-display/avatar/avatar | covered |
| 6 | primitives/badged-circle | data-display/badged-circle/badged-circle | covered |
| 7 | primitives/button | actions/button/button | covered |
| 8 | primitives/card | data-display/card/card | covered |
| 9 | primitives/checkbox-card | patterns/forms/checkbox-card/checkbox-card | covered |
| 10 | primitives/checkbox | forms/checkbox/checkbox | covered |
| 11 | primitives/chip | actions/chip/chip | covered |
| 12 | primitives/combobox | forms/combobox/combobox | covered |
| 13 | primitives/comment-pill | patterns/engagement/comment-pill/comment-pill | covered |
| 14 | primitives/community-avatar | patterns/engagement/community-avatar/community-avatar | covered |
| 15 | primitives/copy-field | patterns/forms/copy-field/copy-field | covered |
| 16 | primitives/dialog | overlays/dialog/dialog | covered |
| 17 | primitives/editable-number-input | forms/editable-number-input/editable-number-input | covered |
| 18 | primitives/formatted-textarea | patterns/forms/formatted-textarea/formatted-textarea | covered |
| 19 | primitives/formatted-text | data-display/formatted-text/formatted-text | covered |
| 20 | primitives/form-layout | patterns/forms/form-layout/form-layout | covered |
| 21 | primitives/icon-button | actions/icon-button/icon-button | covered |
| 22 | primitives/illustrated-state | patterns/feedback/illustrated-state/illustrated-state | covered |
| 23 | primitives/input | forms/input/input | covered |
| 24 | primitives/item | data-display/item/item | covered |
| 25 | primitives/label | forms/label/label | covered |
| 26 | primitives/layout-shell | patterns/layout/layout-shell/layout-shell | covered |
| 27 | primitives/media-control-button | media/media-control-button/media-control-button | covered |
| 28 | primitives/option-card | patterns/forms/option-card/option-card | covered |
| 29 | primitives/pill-button | actions/pill-button/pill-button | covered |
| 30 | primitives/pirate-brand-mark | patterns/identity/pirate-brand-mark/pirate-brand-mark | covered |
| 31 | primitives/prefix-input | forms/prefix-input/prefix-input | covered |
| 32 | primitives/radio-group | forms/radio-group/radio-group | covered |
| 33 | primitives/radio-indicator | forms/radio-indicator/radio-indicator | covered |
| 34 | primitives/scrubber | media/scrubber/scrubber | covered |
| 35 | primitives/select | forms/select/select | covered |
| 36 | primitives/separator | data-display/separator/separator | covered |
| 37 | primitives/sheet | overlays/sheet/sheet | covered |
| 38 | primitives/skeleton | feedback/skeleton/skeleton | covered |
| 39 | primitives/sonner | overlays/toast/toast | covered |
| 40 | primitives/spinner | feedback/spinner/spinner | covered |
| 41 | primitives/switch | forms/switch/switch | covered |
| 42 | primitives/tabs | disclosure/tabs/tabs | covered |
| 43 | primitives/textarea | forms/textarea/textarea | covered |
| 44 | primitives/tooltip | overlays/tooltip/tooltip | covered |
| 45 | primitives/type | data-display/type/type | covered |
| 46 | primitives/vote-pill | patterns/engagement/vote-pill/vote-pill | covered |
| 47 | primitives/waveform | media/waveform/waveform | covered |

Notes: React `sonner.stories.tsx` maps to the Solid `overlays/toast` implementation (library rename, same states).

## B. Solid-only catalog additions (no React source file)

| Solid story | Origin |
| --- | --- |
| overlays/alert-dialog | Solid-only primitive |
| overlays/dropdown-menu | Solid-only primitive |
| forms/text-field | Solid-only primitive |
| patterns/overlays/confirm-dialog | Solid-only pattern |
| patterns/engagement/vertical-feed | engagement lane (owned, do not edit) |

## C. Product/composition source disposition (130; 65 done, 65 not done)

| # | React story file | Planned Solid target | Batch | Status |
| --- | --- | --- | --- | --- |
| 1 | `app/authenticated-routes/stories/live-index-route.stories.tsx` | solid/src/features/authenticated-routes | B12 | pending |
| 2 | `app/authenticated-routes/stories/post-page.stories.tsx` | solid/src/features/authenticated-routes | B12 | pending |
| 3 | `app/shell/stories/app-search-dialog.stories.tsx` | solid/src/features/shell | B6 | done — solid/src/features/shell/app-search-dialog.stories.tsx |
| 4 | `app/shell/stories/app-shell.stories.tsx` | solid/src/features/shell | B6 | done — solid/src/features/shell/app-shell.stories.tsx |
| 5 | `app/shell/stories/desktop-chat-widget.stories.tsx` | solid/src/features/shell | B12 | moved to B12 — story composes the real chat views; lands with components/compositions/chat |
| 6 | `app/telegram-mini-app/stories/telegram-mini-app-self-return.stories.tsx` | solid/src/features/telegram-mini-app | B12 | pending |
| 7 | `app/telegram-mini-app/stories/telegram-mini-app-verify.stories.tsx` | solid/src/features/telegram-mini-app | B12 | pending |
| 8 | `components/compositions/ads/ad-creator/stories/ad-creator.stories.tsx` | solid/src/features/ads | B12 | pending |
| 9 | `components/compositions/app/app-shell-chrome/stories/app-shell-chrome.stories.tsx` | solid/src/features/shell | B6 | done — coverage split: DS Patterns/Navigation AppHeader + MobileFooterNav stories (B5e) hold the chrome states; App/Shell/AppShell stories (B6c) hold the route-wired adapters |
| 10 | `components/compositions/app/app-sidebar/stories/app-sidebar.stories.tsx` | solid/src/features/shell | B6 | done — solid/src/features/shell/app-sidebar.stories.tsx |
| 11 | `components/compositions/app/content-rail-shell/stories/content-rail-shell.stories.tsx` | solid/src/features/shell | B6 | done — solid/src/features/shell/content-rail-shell.stories.tsx |
| 12 | `components/compositions/app/mobile-route-shell/stories/mobile-route-shell.stories.tsx` | solid/src/features/shell | B6 | done — solid/src/features/shell/mobile-route-shell.stories.tsx |
| 13 | `components/compositions/app/page-shell/stories/page-shell.stories.tsx` | solid/src/features/shell | B6 | done — solid/src/features/shell/page-shell.stories.tsx |
| 14 | `components/compositions/bookings/add-to-calendar/add-to-calendar.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/add-to-calendar/add-to-calendar.stories.tsx |
| 15 | `components/compositions/bookings/availability-calendar/availability-calendar.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/availability-calendar/availability-calendar.stories.tsx |
| 16 | `components/compositions/bookings/booking-cancellation-dialog/booking-cancellation-dialog.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/booking-cancellation-dialog/booking-cancellation-dialog.stories.tsx |
| 17 | `components/compositions/bookings/booking-checkout/booking-checkout.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/booking-checkout/booking-checkout.stories.tsx |
| 18 | `components/compositions/bookings/booking-management-view/booking-management-view.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/booking-management-view/booking-management-view.stories.tsx |
| 19 | `components/compositions/bookings/booking-session-controls/booking-session-controls.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/booking-session-controls/booking-session-controls.stories.tsx |
| 20 | `components/compositions/bookings/bookings-list/bookings-list.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/bookings-list/bookings-list.stories.tsx |
| 21 | `components/compositions/bookings/booking-status-card/booking-status-card.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/booking-status-card/booking-status-card.stories.tsx |
| 22 | `components/compositions/bookings/booking-summary/booking-summary.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/booking-summary/booking-summary.stories.tsx |
| 23 | `components/compositions/bookings/feed-booking-sheet/stories/feed-booking-sheet.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/feed-booking-sheet/feed-booking-sheet.stories.tsx |
| 24 | `components/compositions/bookings/host-availability-editor/host-availability-editor.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/host-availability-editor/host-availability-editor.stories.tsx |
| 25 | `components/compositions/bookings/host-booking-page/host-booking-page.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/host-booking-page/host-booking-page.stories.tsx |
| 26 | `components/compositions/bookings/profile-bookings-section/stories/profile-bookings-section.stories.tsx` | solid/src/features/bookings | B9 | pending |
| 27 | `components/compositions/bookings/profile-book-panel/stories/profile-book-panel.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/profile-book-panel/profile-book-panel.stories.tsx |
| 28 | `components/compositions/bookings/slot-picker/slot-picker.stories.tsx` | solid/src/features/bookings | B9 | done — solid/src/features/bookings/slot-picker/slot-picker.stories.tsx |
| 29 | `components/compositions/chat/stories/chat-route-views.stories.tsx` | solid/src/features/chat | B12 | pending |
| 30 | `components/compositions/community/action-callout-panel/stories/action-callout-panel.stories.tsx` | solid/src/features/community | B10 | done — solid/src/features/community/action-callout-panel/action-callout-panel.stories.tsx |
| 31 | `components/compositions/community/agent-policy/stories/agent-policy.stories.tsx` | solid/src/features/community | B10 | pending |
| 32 | `components/compositions/community/archive-page/stories/archive-page.stories.tsx` | solid/src/features/community | B10 | pending |
| 33 | `components/compositions/community/assistant-policy/stories/assistant-policy.stories.tsx` | solid/src/features/community | B10 | pending |
| 34 | `components/compositions/community/create-composer/stories/create-composer.stories.tsx` | solid/src/features/community | B10 | pending |
| 35 | `components/compositions/community/donations-editor/stories/donations-editor.stories.tsx` | solid/src/features/community | B10 | pending |
| 36 | `components/compositions/community/gates-editor/stories/gates-editor.stories.tsx` | solid/src/features/community | B10 | pending |
| 37 | `components/compositions/community/gates-editor/tree-builder/gate-tree-builder.stories.tsx` | solid/src/features/community | B10 | pending |
| 38 | `components/compositions/community/handle-claim-modal/stories/handle-claim-modal.stories.tsx` | solid/src/features/community | B10 | pending |
| 39 | `components/compositions/community/handle-policy-editor/stories/handle-policy-editor.stories.tsx` | solid/src/features/community | B10 | pending |
| 40 | `components/compositions/community/integrations/stories/community-integrations.stories.tsx` | solid/src/features/community | B10 | pending |
| 41 | `components/compositions/community/interaction-gate-modal/stories/interaction-gate-modal.stories.tsx` | solid/src/features/community | B10 | pending |
| 42 | `components/compositions/community/join-request-modal/stories/join-request-modal.stories.tsx` | solid/src/features/community | B10 | pending |
| 43 | `components/compositions/community/labels-editor/stories/labels-editor.stories.tsx` | solid/src/features/community | B10 | pending |
| 44 | `components/compositions/community/links-editor/stories/links-editor.stories.tsx` | solid/src/features/community | B10 | pending |
| 45 | `components/compositions/community/machine-access/stories/machine-access.stories.tsx` | solid/src/features/community | B10 | pending |
| 46 | `components/compositions/community/membership-gate-panel/stories/membership-gate-panel.stories.tsx` | solid/src/features/community | B10 | pending |
| 47 | `components/compositions/community/membership-requests-page/stories/membership-requests-page.stories.tsx` | solid/src/features/community | B10 | pending |
| 48 | `components/compositions/community/moderation-index-page/stories/moderation-index-page.stories.tsx` | solid/src/features/community | B10 | pending |
| 49 | `components/compositions/community/moderation-queue-page/stories/moderation-queue-page.stories.tsx` | solid/src/features/community | B10 | pending |
| 50 | `components/compositions/community/moderation-shell/stories/moderation-shell.stories.tsx` | solid/src/features/community | B10 | pending |
| 51 | `components/compositions/community/namespace-verification-page/stories/namespace-verification-page.stories.tsx` | solid/src/features/community | B10 | pending |
| 52 | `components/compositions/community/page-shell/stories/music-commerce-pitch.stories.tsx` | solid/src/features/community | B10 | pending |
| 53 | `components/compositions/community/page-shell/stories/page-shell.stories.tsx` | solid/src/features/community | B10 | done — solid/src/features/community/page-shell/page-shell.stories.tsx |
| 54 | `components/compositions/community/popular-communities-rail/stories/popular-communities-rail.stories.tsx` | solid/src/features/community | B10 | done — solid/src/features/community/popular-communities-rail/popular-communities-rail.stories.tsx |
| 55 | `components/compositions/community/pricing-editor/stories/pricing-editor.stories.tsx` | solid/src/features/community | B10 | pending |
| 56 | `components/compositions/community/profile-editor/stories/profile-editor.stories.tsx` | solid/src/features/community | B10 | pending |
| 57 | `components/compositions/community/proof-of-work-modal/stories/proof-of-work-modal.stories.tsx` | solid/src/features/community | B10 | pending |
| 58 | `components/compositions/community/rules-editor/stories/rules-editor.stories.tsx` | solid/src/features/community | B10 | pending |
| 59 | `components/compositions/community/safety-page/stories/safety-page.stories.tsx` | solid/src/features/community | B10 | pending |
| 60 | `components/compositions/community/sidebar/stories/sidebar.stories.tsx` | solid/src/features/community | B10 | done — solid/src/features/community/sidebar/sidebar.stories.tsx |
| 61 | `components/compositions/community/telegram-integration/stories/telegram-integration.stories.tsx` | solid/src/features/community | B10 | pending |
| 62 | `components/compositions/community/visual-policy/stories/visual-policy.stories.tsx` | solid/src/features/community | B10 | pending |
| 63 | `components/compositions/community/your-communities-page/stories/your-communities-page.stories.tsx` | solid/src/features/community | B10 | pending |
| 64 | `components/compositions/digital-goods/stories/file-access-flow.stories.tsx` | solid/src/features/digital-goods | B12 | pending |
| 65 | `components/compositions/karaoke/scoring/stories/karaoke-score-summary.stories.tsx` | solid/src/features/karaoke | B12 | pending |
| 66 | `components/compositions/karaoke/stories/karaoke-leaderboard.stories.tsx` | solid/src/features/karaoke | B12 | pending |
| 67 | `components/compositions/livestream/replay-draft-publishing/stories/replay-draft-publishing.stories.tsx` | solid/src/features/livestream | B12 | pending |
| 68 | `components/compositions/notifications/inbox-page/stories/inbox-page.stories.tsx` | solid/src/features/notifications | B12 | pending |
| 69 | `components/compositions/posts/crosspost-composer/stories/crosspost-composer.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/crosspost-composer/crosspost-composer.stories.tsx |
| 70 | `components/compositions/posts/feed-side-panel/stories/feed-side-panel.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/feed-side-panel/feed-side-panel.stories.tsx |
| 71 | `components/compositions/posts/feed/stories/feed.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/feed/feed.stories.tsx |
| 72 | `components/compositions/posts/post-card/stories/live/index.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-card/live.stories.tsx |
| 73 | `components/compositions/posts/post-card/stories/post-card.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-card/post-card.stories.tsx |
| 74 | `components/compositions/posts/post-card/stories/song/index.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-card/song.stories.tsx |
| 75 | `components/compositions/posts/post-card/stories/song-player/post-card-song-player.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-card/song-player.stories.tsx |
| 76 | `components/compositions/posts/post-card/stories/video/index.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-card/video.stories.tsx |
| 77 | `components/compositions/posts/post-composer/stories/file/flow.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-composer/file.stories.tsx |
| 78 | `components/compositions/posts/post-composer/stories/post-composer.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-composer/post-composer.stories.tsx |
| 79 | `components/compositions/posts/post-composer/stories/song/index.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-composer/song.stories.tsx |
| 80 | `components/compositions/posts/post-composer/stories/submit-progress/flow.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-composer/submit-progress-flow.stories.tsx |
| 81 | `components/compositions/posts/post-composer/stories/submit-progress/index.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-composer/submit-progress.stories.tsx |
| 82 | `components/compositions/posts/post-composer/stories/text/index.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-composer/text.stories.tsx |
| 83 | `components/compositions/posts/post-composer/stories/video/index.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-composer/video.stories.tsx |
| 84 | `components/compositions/posts/post-thread/stories/mobile-flows.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-thread/mobile-flows.stories.tsx |
| 85 | `components/compositions/posts/post-thread/stories/post-thread.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/post-thread/post-thread.stories.tsx |
| 86 | `components/compositions/posts/video-feed/stories/video-feed.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/video-feed/video-feed.stories.tsx |
| 87 | `components/compositions/posts/video-player/stories/video-player.stories.tsx` | solid/src/features/posts | B7 | done — solid/src/features/posts/video-player/video-player.stories.tsx |
| 88 | `components/compositions/profiles/edit-profile-form/stories/edit-profile-form.stories.tsx` | solid/src/features/profiles | B8 | done — solid/src/features/profiles/edit-profile-form/edit-profile-form.stories.tsx |
| 89 | `components/compositions/profiles/identity-hero/stories/identity-hero.stories.tsx` | solid/src/features/profiles | B8 | done — solid/src/features/profiles/identity-hero/identity-hero.stories.tsx |
| 90 | `components/compositions/profiles/profile-page/stories/profile-page.stories.tsx` | solid/src/features/profiles | B8 | done — solid/src/features/profiles/profile-page/profile-page.stories.tsx |
| 91 | `components/compositions/profiles/public-agent-page/stories/public-agent-page.stories.tsx` | solid/src/features/profiles | B8 | done — solid/src/features/profiles/public-agent-page/public-agent-page.stories.tsx |
| 92 | `components/compositions/profiles/public-profile-page/stories/public-profile-page.stories.tsx` | solid/src/features/profiles | B8 | done — solid/src/features/profiles/public-profile-page/public-profile-page.stories.tsx |
| 93 | `components/compositions/profiles/song-item/stories/song-item.stories.tsx` | solid/src/features/profiles | B8 | done — solid/src/features/profiles/song-item/song-item.stories.tsx |
| 94 | `components/compositions/rewards/stories/reward-booster-surfaces.stories.tsx` | solid/src/features/rewards | B11 | pending |
| 95 | `components/compositions/rewards/stories/reward-context.stories.tsx` | solid/src/features/rewards | B11 | pending |
| 96 | `components/compositions/rewards/stories/reward-surfaces.stories.tsx` | solid/src/features/rewards | B11 | pending |
| 97 | `components/compositions/rewards/stories/reward-ticket-fulfillment.stories.tsx` | solid/src/features/rewards | B11 | pending |
| 98 | `components/compositions/rewards/stories/reward-wallet-assets.stories.tsx` | solid/src/features/rewards | B11 | pending |
| 99 | `components/compositions/rewards/stories/song-bounties-sheet.stories.tsx` | solid/src/features/rewards | B11 | pending |
| 100 | `components/compositions/settings/owned-agents-panel/stories/owned-agents-panel.stories.tsx` | solid/src/features/settings | B11 | pending |
| 101 | `components/compositions/settings/settings-page/stories/domains-tab.stories.tsx` | solid/src/features/settings | B11 | pending |
| 102 | `components/compositions/settings/settings-page/stories/panels.stories.tsx` | solid/src/features/settings | B11 | pending |
| 103 | `components/compositions/settings/settings-page/stories/settings-page.stories.tsx` | solid/src/features/settings | B11 | pending |
| 104 | `components/compositions/song-study/stories/complete-song-post.stories.tsx` | solid/src/features/song-study | B12 | pending |
| 105 | `components/compositions/song-study/stories/song-streak-chip.stories.tsx` | solid/src/features/song-study | B12 | pending |
| 106 | `components/compositions/song-study/stories/song-streak-leaderboard.stories.tsx` | solid/src/features/song-study | B12 | pending |
| 107 | `components/compositions/song-study/stories/song-streak-preview.stories.tsx` | solid/src/features/song-study | B12 | pending |
| 108 | `components/compositions/song-study/stories/song-study-surface.stories.tsx` | solid/src/features/song-study | B12 | pending |
| 109 | `components/compositions/system/avatar-badge/stories/avatar-badge.stories.tsx` | packages/solid-ui src/patterns/identity/avatar-badge | B5 | done — packages/solid-ui src/patterns/identity/avatar-badge |
| 110 | `components/compositions/system/flat-tabs/stories/flat-tabs.stories.tsx` | packages/solid-ui src/patterns/navigation/flat-tabs | B5 | done — packages/solid-ui src/patterns/navigation/flat-tabs |
| 111 | `components/compositions/system/modal/stories/modal.stories.tsx` | packages/solid-ui src/patterns/overlays/modal | B5 | done — packages/solid-ui src/patterns/overlays/modal |
| 112 | `components/compositions/system/responsive-option-select/stories/responsive-option-select.stories.tsx` | packages/solid-ui src/patterns/forms/responsive-option-select | B5 | done — packages/solid-ui src/patterns/forms/responsive-option-select |
| 113 | `components/compositions/system/sidebar/stories/sidebar.stories.tsx` | packages/solid-ui src/patterns/navigation/sidebar | B5 | done — packages/solid-ui src/patterns/navigation/sidebar |
| 114 | `components/compositions/system/stacked-section-nav/stories/stacked-section-nav.stories.tsx` | packages/solid-ui src/patterns/navigation/stacked-section-nav | B5 | done — packages/solid-ui src/patterns/navigation/stacked-section-nav |
| 115 | `components/compositions/system/stories/stack-page-shell.stories.tsx` | packages/solid-ui src/patterns/layout/stack-page-shell | B5 | done — packages/solid-ui src/patterns/layout/stack-page-shell |
| 116 | `components/compositions/system/stories/status-card.stories.tsx` | packages/solid-ui src/patterns/feedback/status-card | B5 | done — packages/solid-ui src/patterns/feedback/status-card |
| 117 | `components/compositions/verification/altcha-pow-widget/stories/altcha-pow-widget.stories.tsx` | solid/src/features/verification | B11 | pending |
| 118 | `components/compositions/verification/namespace-verification/stories/hns-import-guidance.stories.tsx` | solid/src/features/verification | B11 | pending |
| 119 | `components/compositions/verification/namespace-verification/stories/namespace-verification.stories.tsx` | solid/src/features/verification | B11 | pending |
| 120 | `components/compositions/verification/onboarding-verification-gate/stories/onboarding-verification-gate.stories.tsx` | solid/src/features/verification | B11 | pending |
| 121 | `components/compositions/verification/self-verification-modal/stories/self-verification-modal.stories.tsx` | solid/src/features/verification | B11 | pending |
| 122 | `components/compositions/verification/verification-app-download-links/stories/verification-app-download-links.stories.tsx` | solid/src/features/verification | B11 | pending |
| 123 | `components/compositions/verification/verification-modal-header/stories/verification-modal-header.stories.tsx` | solid/src/features/verification | B11 | pending |
| 124 | `components/compositions/wallet/royalty-claim-modal/stories/royalty-claim-modal.stories.tsx` | solid/src/features/wallet | B8 | done — solid/src/features/wallet/royalty-claim-modal/royalty-claim-modal.stories.tsx |
| 125 | `components/compositions/wallet/song-purchase-modal/stories/song-purchase-modal.stories.tsx` | solid/src/features/wallet | B8 | done — solid/src/features/wallet/song-purchase-modal/song-purchase-modal.stories.tsx |
| 126 | `components/compositions/wallet/wallet-hub/stories/wallet-hub.stories.tsx` | solid/src/features/wallet | B8 | done — solid/src/features/wallet/wallet-hub.stories.tsx |
| 127 | `components/compositions/wallet/wallet-receive-sheet/stories/wallet-receive-sheet.stories.tsx` | solid/src/features/wallet | B8 | done — solid/src/features/wallet/wallet-receive-sheet.stories.tsx |
| 128 | `components/compositions/wallet/wallet-send-sheet/stories/wallet-send-sheet.stories.tsx` | solid/src/features/wallet | B8 | done — solid/src/features/wallet/wallet-send-sheet.stories.tsx |
| 129 | `components/states/stories/empty-inbox-state.stories.tsx` | packages/solid-ui src/patterns/feedback (route-states / empty-inbox-state) | B5 | done — consolidated into the `Patterns/Feedback/RouteStates` story (`Empty Inbox*`) |
| 130 | `components/states/stories/route-states.stories.tsx` | packages/solid-ui src/patterns/feedback (route-states / empty-inbox-state) | B5 | done — consolidated into the `Patterns/Feedback/RouteStates` story |
