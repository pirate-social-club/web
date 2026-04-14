# UI Best Practices

This repo optimizes for clear, restrained UI.

## Typography

- do not use `text-xs` or `text-sm`
- default to `text-base`
- use larger type for emphasis instead of shrinking the rest

## Copy

- remove helper text unless it changes a decision
- avoid intro paragraphs on simple flows
- prefer direct labels over explanatory prose

## Component Surface

- do not keep dead exports
- do not keep primitive wrappers that are only used by stories
- if a component needs product-specific data or layout assumptions, treat it as a composition

## Stories

- every exported primitive should have at least one story
- stories should use repo typography rules
- prefer stories that show realistic states over decorative permutations

## Tests

- add smoke tests for key compositions when new flows land
- keep tests lightweight by default
- use broader interaction coverage only when the component actually owns behavior that can regress
