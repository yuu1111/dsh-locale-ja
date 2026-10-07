# ADR-0007: Track DSH 0.2 contracts

- Status: Accepted
- Date: 2026-10-07

## Context

The published DSH 0.2 release is `0.2.0-rc.2`; npm does not yet ship a
`0.2.0` stable package. Its client dictionaries differ from the previously
supported `0.1.5-rc.2`, and its packages require Cordis `~4.0.4`.

## Decision

- Update DSH development dependencies and the locale peer dependency to
  `^0.2.0-rc.2`, with the lockfile resolving the audited release.
- Use Cordis `^4.0.4` to satisfy the shipped peer contracts.
- Align Japanese dictionary keys and placeholders with the shipped 0.2
  declarations and English dictionaries, including runtime-only namespaces.
  Audit the web composition rather than the CLI superset: scheduled-task and
  agent-team packages outside the web profile are not translation targets.
- Keep the public `addLanguage`, `register`, `getLocale`, and `subscribe`
  integration from ADR-0006, and preserve the standard package manifest,
  Loader envelope, and side-effect disposers.
- Pin the isolated browser E2E baseline to `0.2.0-rc.2`.

## Consequences

The plugin now targets the 0.2 line rather than advertising compatibility
with 0.1.5. A stable 0.2 release still needs a fresh contract and dictionary
audit; the version range alone is not evidence that it has been verified.
