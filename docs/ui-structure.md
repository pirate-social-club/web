# UI Structure

`pirate-web` keeps UI code in two layers:

- `src/components/primitives/` for small reusable building blocks with narrow APIs.
- `src/components/compositions/` for assembled product UI, cross-primitive orchestration, or anything that owns layout, navigation, or flow behavior.

## Move A Component To `compositions/` When

- the file starts coordinating multiple primitives
- the API grows into a compound export surface
- the component owns product layout or shell chrome
- the story is demonstrating a product pattern instead of a primitive state

## Keep A Component In `primitives/` When

- it is a focused reusable control
- the public surface is small and stable
- consumers can understand it without product-specific context

## Current Expectations

- large navigation shells belong in `compositions/`
- primitive stories should cover every exported primitive
- compositions should have smoke tests for key render paths
- dead exports should be removed instead of kept for hypothetical reuse
