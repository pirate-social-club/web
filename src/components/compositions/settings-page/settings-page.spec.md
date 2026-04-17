# Settings Page Spec

## Product decisions

- retire the current edit-profile modal and move identity editing into a full settings page
- use the user's primary public handle as the author label in posts and threads
- keep `display_name` as profile presentation, not the default post byline
- keep settings copy minimal and row-based, closer to Reddit than to a form-heavy account console

## v0 information architecture

- `/settings/profile`
  - display name
  - bio
  - primary handle
  - linked handles
- `/settings/wallet`
  - primary wallet address
  - connected wallets
- `/settings/preferences`
  - language
  - age verification status

## Data model gap

The current profile contract exposes one active `global_handle` plus optional `display_name`.

If Pirate wants ENS, `.pirate`, and other handles to coexist, the app will need a read model for:

- `linked_handles[]`
- `primary_public_handle`
- optional per-handle visibility or ordering rules

Until that exists, the safest near-term rule is:

- use `profile.global_handle.label` as the canonical author label
- continue showing `display_name` only in the profile hero and editable profile fields
