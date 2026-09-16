# V-FACTOR: Hyper-Strike 🎯

**An interactive, zero-cost WebRTC multiplayer shooting engine built entirely in the browser.**

Created by **Vinay** | **V-FACTOR STUDIOS**

---

## 📖 Overview
**Hyper-Strike** is a fast-paced, browser-based shooting game that operates without a dedicated backend server. By leveraging PeerJS and WebRTC, it creates seamless peer-to-peer connections for competitive 1v1 dueling. The game also features a fully synthesized Web Audio engine, meaning there are zero external sound assets to download—everything is generated dynamically via code.

## ✨ Features
*   **Zero-Cost Multiplayer:** Uses WebRTC DataChannels for sub-millisecond, serverless peer-to-peer data transfer.
*   **Twin-Engine Logic:** Isolated logic routing ensures the offline SOLO training mode and the 1v1 DUEL mode run perfectly independently without crashing.
*   **Procedural Audio Engine:** All sound effects (shooting, hits, system jams, game over) are mathematically synthesized using the Web Audio API.
*   **Dynamic Anomalies:** 
    *   *Standard (Green):* Basic targets.
    *   *Gold:* High-speed targets that grant a 3x multiplier.
    *   *EMP (Cyan):* Triggers a visual screen-shake and temporarily jams the opponent's weapon system.
*   **Mobile-Optimized:** `touch-action: none` and normalized coordinate math ensure 1:1 aiming accuracy on both desktop and touchscreen mobile devices.

## 🚀 How to Run (Local or Hosted)
Because this game has no backend requirements, running it is incredibly simple.

1. Clone the repository to your local machine.
2. Open `index.html` in any modern web browser.
3. *Alternatively*, play directly via GitHub Pages if hosted.

### How to Play Multiplayer (1v1 DUEL)
1. **Player 1 (Host):** Select **1v1 DUEL**, copy the generated `Host ID`, and send it to your friend.
2. **Player 2 (Peer):** Paste the Host ID into the **Join Game** box and click Connect.
3. Both players click **READY** in the Match Room.
4. The Host sets the Match Duration (60 - 300 seconds) and clicks **START MATCH**.

## 🎮 Controls & Arsenal
*   **Aiming:** Mouse cursor (Desktop) or Touch/Drag (Mobile).
*   **Firing:** Click/Tap or Hold depending on the weapon type.
*   **Toggle Weapon:** Click the weapon name at the bottom of the screen to cycle through the arsenal.

### The Arsenal
| Weapon | Type | Firing Mode | Damage | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **PULSE** | SMG | Auto (Hold) | Low | High rate of fire, zero screen shake. Best for building combos. |
| **RAIL** | Sniper | Semi (Tap) | Massive | Heavy screen shake. Slowest rate of fire. |
| **AEGIS** | Shotgun | Semi (Tap) | Medium | Fires a 6-pellet spread. Devastating at close range. |
| **FLUX** | Burst | Auto (Hold) | High | Fires a 3-round energy burst. Highly balanced. |

---
**© 2026 V-FACTOR STUDIOS**