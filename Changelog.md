# Changelog

All notable changes to **V-FACTOR: Hyper-Strike** will be documented in this file.

## [1.0.0] - 2026-09-17
### Added
- Finalized tactical grid UI overlay for the Shooting Hub and Match Room.
- Implemented `sessionStorage` logic to allow Guest and Logged-in users to persist through soft resets.
- Added a "Soft Reset" `resetToHub()` function to cleanly wipe Canvas memory and gracefully close WebRTC data channels without browser locking.
- Introduced the Guide Modal to explain game mechanics, weapon stats, and EMP mechanics.
- Locked "Transfer Host" logic specifically to 1v1 Match Room state.

## [0.9.0] - 2026-09-10
### Added
- Integrated PeerJS for decentralized 1v1 DUEL mode.
- Built Match Room lobby with "Ready" states, Match Timer controls, and Host/Peer role assignment.
- Added visual Skeleton Loaders during network handshake sequences.
- Added Web Audio API synthesizer for zero-asset sound generation (Pulse, Rail, Aegis, Flux audio profiles).

## [0.5.0] - 2026-08-25
### Added
- Established HTML5 Canvas `renderLoop` with DeltaTime scaling for consistent physics.
- Built dynamic spawn system for standard, gold, and EMP targets.
- Implemented mathematical collision detection for weapon spread patterns.
- Added screen-shake matrices and particle effect arrays for hits/muzzle flashes.

## [0.1.0] - 2026-08-10
### Added
- Initial project scaffolding.
- Basic index.html UI and V-FACTOR CSS styling.
- Core weapon data structures and basic pointer event listeners for touch/mouse tracking.