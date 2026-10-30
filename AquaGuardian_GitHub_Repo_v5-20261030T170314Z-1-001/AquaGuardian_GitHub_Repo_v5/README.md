# AquaGuardian: Deep Clean

A 2D web game built for **C://hacks 2026** (CHIREC International School) around **UN Sustainable Development Goal 6: Clean Water and Sanitation**.

In **AquaGuardian**, you pilot a solar-powered cleanup drone across polluted rivers, canals, coral bays, and industrial harbors. Your goal is to scoop up floating plastic waste, neutralize leaking chemical barrels, and clamp bio-filters onto untreated storm drainage pipes before time runs out.

---

## How to Run the Game

No installation or external libraries are needed. Everything runs in standard HTML5 Canvas and JavaScript.

1. Clone or download this repository.
2. Open `index.html` in any modern web browser (Chrome, Edge, Firefox, or Safari).
   - *Tip:* You can also use the VS Code **Live Server** extension or run `python -m http.server 8000` in the project folder.

---

## Controls

- **Move Mouse / Cursor:** Steer and fly the Aqua-Drone directly toward your cursor (you can also switch to classic `WASD` / `Arrow Keys` in Settings)
- **Left-Click (Hold) or `Space`:** Fire Hydro-Boost thrusters
- **Hover near Yellow Barrels (or Hold `E`):** Activate the chemical neutralizer beam
- **`E` or Middle-Click near Sewer Pipes:** Start the Bio-Filter alignment mini-game
- **`Q` or Scroll Wheel Up:** Send out a Sonar Ping to highlight hidden trash
- **`R` or Scroll Wheel Down:** Trigger a Recycler Burst shockwave to clear oil slicks
- **`G` or Key `3`:** Deploy helper mini-drones that automatically collect nearby plastic
- **`P` or `Esc`:** Pause the game

---

## Game Mechanics & SDG 6 Science

### 1. Water Quality Index (NSF-WQI) & Live Telemetry
At the top of the screen, the game tracks water health using the real-world **National Sanitation Foundation Water Quality Index (0–100)**:
- **DO (Dissolved Oxygen in mg/L):** How much oxygen is in the water for fish to breathe. Polluted water drops below `4 mg/L`; healthy water is above `6.5 mg/L`.
- **Turbidity (NTU):** How cloudy or murky the water is from sewage and suspended trash. Lower NTU means clearer water that lets sunlight reach underwater plants.
- **pH (6.0–7.4):** Measures acidity. Leaking chemical barrels make the water acidic (closer to `6.0`), while clean water stays near neutral (`7.0–7.4`).

### 2. Mission Countdown & Penalties
- **Level 1** gives you **3:00 (180 seconds)** to reach the target WQI score, and each new level reduces the time limit by **10 seconds** (`180s` -> `170s` -> `160s` -> `150s`).
- If the timer hits `00:00` or the WQI bar drops to `0%`, the ecosystem collapses: your level drops by 1 and you lose Eco-Credits (with larger coin deductions if you fail repeatedly).
- Completing missions and leveling up rewards you with bonus Eco-Credits to spend in the Tech Shop and Drone Locker.

### 3. Eco-Karma
- **Eco-Karma (0%–100%)** tracks how carefully you pilot around marine wildlife and coral reefs.
- Boosting into fish schools or crashing into coral reefs lowers your Eco-Karma and hurts your star rating at the end of the mission. Upgrading your **Biodegradable Smart Nets** or **Coral & Wildlife Bumpers** in the shop helps protect marine life.

---

## Project Folder Structure

```text
├── index.html          # Main game page, HUD layout, and menus
├── css/
│   └── style.css       # HUD, modal, and responsive styling
└── js/
    ├── engine.js       # 2D vector math, camera follow, particles, and 60 FPS game loop
    ├── input.js        # Mouse cursor flight, keyboard, gamepad, and touch controls
    ├── audio.js        # WebAudio synth music and sound effects with volume ducking
    ├── save.js         # LocalStorage save system for coins, XP, skins, and upgrades
    ├── upgrades.js     # Tech Shop upgrade tiers and stats
    ├── entities.js     # Drone, trash, toxic barrels, sewer pipes, fish boids, and boss logic
    ├── levels.js       # Cadet tutorial and 4 main campaign missions + 30s SDG 6 tips
    ├── ui.js           # HUD updates, radar minimap, bio-filter mini-game, and SDG 6 quiz
    └── main.js         # Game state controller and menu button wiring
```
