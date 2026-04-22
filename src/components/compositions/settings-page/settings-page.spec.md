# Settings Page Spec

## Product decisions

- retire the current edit-profile modal and move identity editing into a full settings page
- use the user's primary public handle as the author label in posts and threads
- keep `display_name` as profile presentation, not the default post byline
- keep settings copy minimal and row-based, closer to Reddit than to a form-heavy account console

## Information architecture

- `/settings/profile`
  - Appearance
    - avatar
    - cover
  - Profile
    - display name
    - bio
    - posts and comments (primary public byline preview)
    - save profile
  - Pirate handle
    - current .pirate handle
    - change handle (expandable rename flow with availability check)
  - Public handles
    - selectable linked handles (Pirate, ENS, etc.)
    - primary byline selector
    - stale handle refresh actions
- `/settings/wallet`
  - primary wallet address
  - connected wallets
- `/settings/preferences`
  - language
  - age verification status

## Data model

The profile read model now supports:

- `global_handle`: canonical `.pirate` identity (rename via dedicated flow)
- `display_name` + `bio`: profile presentation fields
- `linked_handles[]`: external/alternate handles (ENS, etc.)
- `primary_public_handle`: the handle shown as the public byline on posts/comments

The settings page treats these as separate save paths:

- **Save profile** persists display name, bio, avatar, cover, and primary public handle.
- **Rename handle** is a dedicated action inside the Pirate handle card.
- **Sync linked handles** refreshes ENS-linked handles automatically.
