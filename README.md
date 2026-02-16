This is the definitive master document for **Project: Apex Nebula**. It incorporates the point-pool genome, the hex-grid landscape, the metabolic "Downclocking" mechanic, and the critical role of Stability.

---

# 📑 Project: Apex Nebula – Master Design Document

## 🛰️ 1. General Description

**Project: Apex Nebula** is a strategic evolutionary board game. Players act as Machine Learning architectures navigating a hexagonal sector of space to reach "The Singularity." Success requires balancing **Gradient Descent** (improving stats) against **Metabolic Constraints** (the cost of complexity) and **Environmental Noise**.

---

## 🧬 2. Initialization: Weight Setup

Players begin with a base pool of **16 points** to distribute across four attributes on their **Genome Console**.

* **The Attributes:**
* **Navigation (NAV):** Movement range and resistance to displacement.
* **Logic (LOG):** Hacking, trading, and ignoring unwanted mutations.
* **Defense (DEF):** Protection against Stability loss from Events.
* **Scan (SCN):** Success rate when attempting to harvest resources.


* **Constraints:** Minimum **1**, Maximum **6** per slot.
* **Home Setup:** Each player starts at a **Home Nebula** with **1 Matter** and **1 Data** token.

---

## 🎲 3. The Hybrid Mechanics (Stats + Dice)

### A. The Mutation Phase (Internal Noise)

At the start of every turn, the system's internal state shifts.

* **Roll d4:** 1=NAV, 2=LOG, 3=DEF, 4=SCN.
* **Roll d6:** * **1–2:** **-1 Point** (Temporary degradation for this turn).
* **3–4:** **No Change.**
* **5–6:** **+1 Point** (Temporary boost for this turn).



### B. The Fitness Check (External Interference)

When harvesting or facing events, roll a **d6 Interference Die**.

* **1–2:** **-1** (Interference) | **3–4:** **+0** (Stable) | **5–6:** **+1** (High-Gain).
* **Success Logic:** .

---

## 🛡️ 4. Stability: The Hardware Buffer

Stability (5 Points) represents your physical hardware's health.

* **Losing Stability:** Occurs when failing **Event Cards**, failing certain **Hex Hazards**, or losing a **Hustle**.
* **The Hard Reboot:** If Stability hits **0**:
1. Move to **Home Nebula**.
2. Lose **50% of your Data**.
3. **Genome Degradation:** Permanent **-2 points** to your highest attribute.
4. **Learning Pity:** Gain **1 Insight Token** (discard to treat any Interference roll as a 6).

---

## ⚔️ 5. Player Interaction: Selection & Recombination

When two players occupy the same hex, the active player chooses one of two paths:

### A. The Hustle (Competitive Selection)

A battle for resources. Both players roll **Interference d6 + LOG**.

* **Winner:** Takes 1 Resource (Matter/Data) from the loser OR forces the loser to lose **1 Stability**.
* **Tie:** Both players lose 1 Stability.

### B. The Handshake (Horizontal Gene Transfer)

A mutual exchange. Requires both players' consent.

* **Trade:** Players may trade any amount of Matter/Data.
* **Crossover:** Players select **one same attribute** (e.g., NAV) and **swap their permanent values**.
* *Example: Player A (NAV 6) swaps with Player B (NAV 2). Player A is now slow but perhaps cheaper to maintain; Player B is now fast.*


---

## 📉 6. The Downclock & Maintenance (Negative Feedback)

To prevent "Overfitting" (having stats that are too expensive to keep), players must manage their **Metabolism**.

### Phase V: Optimization

1. **Pruning (Optional):** Before paying costs, you may voluntarily **permanently remove**  points from your attributes. Gain  **Matter** immediately.
2. **Upgrade:** Spend **3 Data** for +1 permanent attribute point.
3. **Maintenance Cost:**
* **Total Points 16–20:** Pay 1 Matter.
* **Total Points 21–28:** Pay 2 Matter.
* **Total Points 29+:** Pay 3 Matter.


4. **The Brownout:** If you cannot pay, you must **permanently reduce** your attributes by 2 points for every 1 Matter you are short.

---

## 🗺️ 7. Hex Sector Definitions

| Tier | Tiles | Threshold | Yield |
| --- | --- | --- | --- |
| **1 (Outer)** | 18 | 2 | 1 Matter or 1 Data |
| **2 (Middle)** | 12 | 4 | 2 Matter or 2 Data |
| **3 (Inner)** | 6 | 6 | 4 Matter or 4 Data |
| **The Core** | 1 | 8 | **The Singularity** |


Here is how the stats are distributed across the 37 hexes to ensure a balanced "Search Space."
There are void tailes with no yield and treshold.

### 🟢 Tier 1: The Stable Rim (Threshold 2)

* **Asteroid Scrap (DEF x 3):** Physical debris requires structural integrity.
* **Signal Pings (SCN x 3):** Faint data traces require basic sensor tuning.
* **Gravity Eddies (NAV x 3):** Minor spatial warping requires basic engine control.
* **Legacy Code (LOG x 3):** Ancient encrypted fragments require basic logic processing.
* **Void (x 6):** Empty space with trasold 1 but no yield.

### 🟡 Tier 2: The Turbulent Belt (Threshold 4)

* **Solar Flares (DEF x 2):** High radiation zones that melt unoptimized hulls.
* **Encrypted Relays (LOG x 2):** Complex data nodes that require high-level hacking.
* **Ion Clouds (NAV x 2):** Thick gas that makes movement difficult without advanced navigation.
* **Deep Space Buoys (SCN x 2) :** Precision sensor targets hidden in the dark.
* **Void (x 4):** Empty space with threshold 3 but no yield.

### 🔴 Tier 3: The Event Horizon (Threshold 6)

* **Supernova Remnants (DEF/NAV x 1):** Extreme heat and kinetic shock. Requires both structure and speed to survive.
* **Omega Archives (LOG/SCN x 1):** The ultimate data vaults. Requires massive processing and precision scanning.
* **Black Holes (NAV/DEF x 1) :** The ultimate gravity test. If your NAV isn't high enough to escape the pull, your DEF must be high enough to survive the crush.
* **Void (x 2):** Empty space with threshold 5 but no yield.

Void tiles trashold only counts in the event deck.

---

## 🌪️ 8. The Event Deck (Selection Pressures)

Draw one card at the end of every round. All players are affected.

* **Solar Flare (DEF 4):** Fail = -1 Stability.
* **Logic Plague (LOG 5):** Fail = All stats -1 next turn.
* **Weight Decay (Global):** All players must reduce their highest attribute by 1.
* **Gravity Well (NAV 5):** Fail = Movement costs doubled next turn.
* **Data Leach (SCN 4):** Fail = Lose 2 Data.

---

## 🏆 9. Winning the Game

To win, you must occupy **The Core**, have a total permanent attribute sum of **25+**, spend **10 Data**, and survive one final **Event Card** without losing Stability.

