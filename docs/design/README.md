# Product Design Gate

**Status:** Required before substantial product UI implementation  
**Current design:** Not yet approved

## Why This Exists

The M0 Welcome and About screens prove that routing, builds, and device behavior
work. They are not the final application flow or visual design. The repository
now records the MVP capability flow in .agents/contexts/app-flow.md, while
leaving screen structure and visual choices open for an explicit founder/design
conversation.

## Trigger

Run this gate before the first substantial user-facing product UI milestone.
Under the current build order, it must run before M2 Catalogue + Package Units
UI begins, and earlier if M1 adds any user-facing flow beyond technical
database diagnostics.

A later agent must not interpret the absence of DESIGN.md as permission to
invent a generic design system.

## Required Conversation and Review

The founder and design-capable agent should review:

1. the primary owner/admin and staff/cashier journeys;
2. onboarding, store membership, first useful action, and daily navigation;
3. sale, restock, reconciliation, expense, price, scanner, and sync-recovery
   states;
4. information hierarchy and shortcuts for fast retail work;
5. offline, loading, empty, error, permission, and conflict states;
6. accessibility, text scale, touch targets, low-end Android constraints, and
   the Galaxy A15 5G reference device;
7. visual direction, density, typography, color, components, motion, and the
   evidence or references supporting those choices.

## Required Outputs

After approval, create:

- docs/design/DESIGN.md as the human-readable source for approved experience,
  design principles, navigation, screen/state inventory, accessibility, tokens,
  and component guidance;
- updates to .agents/contexts/app-flow.md for approved journey changes;
- a decision-log entry when the review changes durable product behavior or an
  established architecture boundary.

Create docs/design/DESIGN.json only when a real tool, generator, validation
script, or token pipeline will consume it. It must mirror approved values from
DESIGN.md; it must not become a second independently edited source of truth.

## Completion Evidence

The gate is complete when the founder approves the flow and design direction,
DESIGN.md covers the screens and states needed by the upcoming milestone, and
the relevant milestone plan/tickets link to those artifacts. The specification
may grow as later milestones introduce genuinely new flows.
