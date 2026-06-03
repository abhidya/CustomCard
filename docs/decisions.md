# Decisions

This document records the implementation defaults chosen while turning the
ambiguous CustomCard brief into a reviewable repo.

## D001: Keep The Current Repo As A Contract-First Service Skeleton

Decision: represent the product as a Vite/React service console plus typed
domain/service contracts, tests, database schema, and deployment scaffolding.

Reason: the brief asks for a production-shaped service, but no external
credentials, vendor access, legal approval, or physical certification evidence
were available. A contract-first skeleton lets reviewers inspect the hard parts
without pretending live integration exists.

Rejected: claim a finished SaaS or live ordering flow. That would hide the
highest-risk gaps.

## D002: Keep Real Ordering Disabled

Decision: `WalgreensFiveBySevenDoubleSidedCardAdapter` is a hard-gated contract
with `realOrdersEnabled: false` and runtime kill-switch requirements.

Reason: physical print errors and accidental external orders are the most
dangerous failure modes in this stage.

Rejected: browser automation or direct retail ordering in v1. Both require
terms review, sandbox/live evidence, and physical print certification.

## D003: Use Metadata-Only Provider Import Contracts

Decision: Gmail, Google Calendar, and Outlook are represented as scoped provider
adapters; raw email/calendar content is rejected.

Reason: email/calendar content is untrusted and sensitive. The current repo can
prove least-privilege import posture before OAuth plumbing exists.

Rejected: broad email ingestion or storage of full message bodies. That would
increase prompt-injection and privacy risk before the product needs it.

## D004: Structured Memory Before Vector Memory

Decision: approved relationship memory is modeled as structured records with
forget controls.

Reason: the product needs user-visible provenance and deletion before fuzzy
semantic recall. Structured memory is easier to audit and test.

Rejected: hidden vector-only relationship memory. It would be harder to explain,
delete, or constrain.

## D005: Deterministic Print Contracts Before AI Rendering

Decision: the repo validates and renders deterministic 1500x2100 SVG panels with
safe-margin and text-overflow checks.

Reason: print correctness needs exact dimensions and deterministic failure modes.
AI image generation can plug into the renderer later, but it should not own the
layout contract.

Rejected: generated mockups or decorative previews as production assets. They
can hide cropping, shadow, fold, DPI, and safe-zone defects.

## D006: Cheap Droplet And Cloud-Native Paths Share Contracts

Decision: the domain contracts stay the same across local prototype,
five-dollar-droplet, and SaaS-scale profiles.

Reason: the brief explicitly asks for both a cost-efficient deployment and a
future scale path. Separating contracts from runtime mode keeps the cheap path
from becoming throwaway work.

Rejected: separate throwaway MVP architecture. It would make later scaling a
rewrite instead of a staged operational move.

## D007: Thin Mobile Shell For This Stage

Decision: iOS/Android are represented by an Expo app-shell boundary that resolves
the API URL from environment configuration.

Reason: cross-platform architecture is required, but signed native apps are not
needed to prove the current service contracts.

Rejected: claiming store-ready mobile releases. Signing, native build pipelines,
push notifications, and mobile QA are outside this pass.
