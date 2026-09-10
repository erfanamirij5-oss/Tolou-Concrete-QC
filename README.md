# Tolou Concrete QC

Offline Windows desktop suite for concrete laboratory results, quality control, analytics, and management reporting.

**Product owner:** Engineer Erfan Amiri  
**Target:** Windows Desktop / Offline  
**Active development branch:** `feature/windows-desktop-foundation`

## Release Candidate scope

Tolou Concrete QC provides local SQLite persistence, project/pour/sample workflows, revision-based laboratory results, fresh-concrete measurements, specimen physics, external QC parties/results, managed attachments, shared analytics, periodic reporting, management dashboards, and trusted PDF/Excel exports.

The Windows application is packaged with Electron Forge/Squirrel. The release build uses context isolation, renderer sandboxing, restricted navigation/window creation, trusted IPC sender validation, CSP, managed attachment validation, Electron security fuses, embedded ASAR integrity validation, and CI verification of the packaged executable's fuse state.

## Engineering rules

- Renderer must not directly access SQLite or privileged filesystem operations.
- Main process owns persistence, dialogs, exports, and trusted application-service execution.
- Engineering calculations and QC analytics must remain deterministic, traceable, unit-safe, and testable.
- Standards-based acceptance rules require an explicit reference/version and tests before production use.
- No merge, release branch, tag, or public release without explicit product-owner approval.

See `docs/STATUS.md` for the current release gate and deferred roadmap.
