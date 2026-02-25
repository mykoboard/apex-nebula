This is the definitive master document for **Project: Apex Nebula**. It incorporates the point-pool genome, the hex-grid landscape, the metabolic "Downclocking" mechanic, and the critical role of Stability.

---

#  Project: Apex Nebula – Master Design Document

## 🛰️ 1. General Description

**Project: Apex Nebula** is a strategic evolutionary board game. Players act as Machine Learning architectures navigating a hexagonal sector of space to reach "The Singularity." Success requires balancing **Gradient Descent** (improving stats) against **Metabolic Constraints** (the cost of complexity) and **Environmental Noise**.

---

##  2. Initialization: Weight Setup

Players begin with a base pool of **12 points** to distribute across four attributes on their **Genome Console**.

* **The Attributes:**
* **Navigation (NAV):** Movement range and resistance to displacement.
* **Logic (LOG):** Hacking, trading, and ignoring unwanted mutations.
* **Defense (DEF):** Protection against Stability loss from Events.
* **Scan (SCN):** Success rate when attempting to harvest resources.


* **Constraints:** Minimum **1**, Maximum **6** per slot.
* **Home Setup:** Each player starts at a **Home Nebula** with **1 Matter** and **1 Data** token.

---

##  3. The Hybrid Mechanics (Stats + Dice)

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

##  4. Stability: The Hardware Buffer

Stability (5 Points) represents your physical hardware's health.

* **Losing Stability:** Occurs when failing **Event Cards**, failing certain **Hex Hazards**, or losing a **Hustle**.
* **The Hard Reboot:** If Stability hits **0**:
1. **Return to starting hex** (Home Nebula).
2. **Attributes reset to 1**.
3. **Stability resets to 3**.
4. **Cube Pool resets to 12**.
5. **Raw Matter is cleared** (0).
6. **Data Clusters reset to 1**.

---

## 5. Player Interaction: Selection & Recombination

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

## 6. The Downclock & Maintenance (Negative Feedback)

To prevent "Overfitting" (having stats that are too expensive to keep), players must manage their **Metabolism**.

### Phase V: Optimization

1. **Pruning (Optional):** Before paying costs, you may voluntarily **permanently remove**  points from your attributes. Gain  **Matter** immediately.
2. **Upgrade:** Spend **3 Data** for +1 permanent attribute point.
3. **Maintenance Cost:**
* **Total Points 12–16:** Pay 1 Matter.
* **Total Points 21–28:** Pay 2 Matter.
* **Total Points 29+:** Pay 3 Matter.


4. **The Brownout:** If you cannot pay, you must **permanently reduce** your attributes by 2 points for every 1 Matter you are short.

---

## 7. Hex Sector Definitions

|Tier |Total Tiles|Threshold|Standard Yield|Hybrid Yield (Double Check)|
| --- | --- | --- | --- | --- |
|T1 (Outer)|18 |2|1 Matter or 1 Data|1 Matter and 1 Data|
|T2 (Middle)|12|4|2 Matter or 2 Data|2 Matter and 2 Data|
|T3 (Inner)|6|6|4 Matter or 4 Data|4 Matter and 4 Data|
|The Core|1|8|The Singularity|N/A|

Here is how the stats are distributed across the 37 hexes to ensure a balanced "Search Space."
There are void tailes with no yield and treshold.

Certainly! I've updated the manifest to include a **Quantity** column for each tier. This makes it a one-stop reference for both manufacturing the set and setting up the board.

### 🌌 Apex Nebula: Master Tile Manifest

| Tier | Tile Name | Attribute Check | Threshold | Yield (Resources) | Type | Qty |
| --- | --- | --- | --- | --- | --- | --- |
| **T1** | **Scrap Heap** | **DEF** | 2 | 1 Matter | Standard | **3** |
| **T1** | **Signal Ping** | **SCN** | 2 | 1 Data | Standard | **3** |
| **T1** | **Gravity Eddy** | **NAV** | 2 | 1 Matter | Standard | **3** |
| **T1** | **Logic Fragment** | **LOG** | 2 | 1 Data | Standard | **3** |
| **T1** | **Data Cluster** | **LOG** | 2 | 1 Matter **AND** 1 Data | **Hybrid** | **6** |
| **T2** | **Solar Flare** | **DEF** | 4 | 2 Matter | Standard | **2** |
| **T2** | **Deep Buoy** | **SCN** | 4 | 2 Data | Standard | **2** |
| **T2** | **Ion Cloud** | **NAV** | 4 | 2 Matter | Standard | **2** |
| **T2** | **System Cache** | **LOG** | 4 | 2 Data | Standard | **2** |
| **T2** | **Encrypted Relay** | **LOG / NAV** | 4 | 2 Matter **AND** 2 Data | **Hybrid** | **4** |
| **T3** | **Supernova** | **DEF** | 6 | 4 Matter | Standard | **1** |
| **T3** | **Pulsar Archive** | **SCN** | 6 | 4 Data | Standard | **1** |
| **T3** | **Gravity Well** | **NAV** | 6 | 4 Matter | Standard | **1** |
| **T3** | **Core Database** | **LOG** | 6 | 4 Data | Standard | **1** |
| **T3** | **Singularity Shard** | **ALL** | 6 | 4 Matter **AND** 4 Data | **Hybrid** | **2** |
| **Core** | **The Singularity** | **LOG + SCN** | 8 | **WIN CONDITION** | **Unique** | **1** |
| **Total** |  |  |  |  |  | **37** |

---

##  The Event Deck (Selection Pressures)

Draw one card at the end of every round. All players are affected.

This table organizes the final Event Deck, balancing environmental hazards with mechanics that prevent any one player from becoming an untouchable "Super-AI."

### The Natural Selection Deck

| Card Type | Event Name | Attribute Check | Threshold | Success / Failure Effect |
| --- | --- | --- | --- | --- |
| **Hazard** | **Solar Flare** | **DEFENSE** | 4 | **Fail:** Lose 1 Stability. |
| **Hazard** | **Logic Plague** | **LOGIC** | 5 | **Fail:** All attributes are -1 during your next turn. |
| **Hazard** | **Ion Storm** | **NAVIGATION** | 3 | **Fail:** Move 2 hexes in a random direction (Displaced). |
| **Hazard** | **Data Leak** | **SENSORS** | 4 | **Fail:** Lose 2 Data Clusters. |
| **Hazard** | **Gravity Well** | **NAVIGATION** | 5 | **Fail:** Movement cost for all hexes is doubled next turn. |
| **Pressure** | **The Great Filter** | **TOTAL SUM** | **AVG + 2** | **Fail:** Immediate Hard Reboot. (AVG = sum of all player scores / count). |
| **Pressure** | **Weight Decay** | **NONE** | N/A | **Global:** All players must reduce their highest attribute by 1 permanently. |
| **Pressure** | **System Heat** | **DEFENSE** | 5 | **Fail:** Pay 1 Matter or lose 1 Stability. |
| **Shift** | **Grid Re-Sync** | **NONE** | N/A | **Map Shift:** Priority Player swaps any two adjacent Tier 2 or Tier 3 tiles. |
| **Shift** | **Space Fold** | **NAVIGATION** | 6 | **Success:** You may move to any adjacent hex for free immediately. |
| **Shift** | **Core Drift** | **NONE** | N/A | **Map Shift:** The Singularity tile moves one hex toward the player with the lowest sum. |
| **Apex Lead** | **Thermal Throttle** | **DEFENSE** | 6 | **Target:** Players with Sum 26+. **Fail:** Lose 2 Stability. |
| **Apex Lead** | **Data Corruption** | **LOGIC** | 5 | **Target:** Player with Most Data. **Fail:** Lose **half** of your Data tokens. |
| **Apex Lead** | **Resource Leach** | **SENSORS** | 5 | **Target:** Player with Most Matter. **Fail:** Lose 3 Matter tokens. |
| **Apex Lead** | **System Bloat** | **LOGIC** | 6 | **Target:** Player with Highest Stat. **Fail:** That stat is permanently -1. |
| **Apex Lead** | **Parasitic Drift** | **NONE** | N/A | **Transfer:** Player with highest sum gives 1 Data to player with lowest sum. |
| **Apex Lead** | **Overfit Fragile** | **NAVIGATION** | 4 | **Target:** Players with any Stat of 8+. **Fail:** Lose 1 Stability. |
| **Bonus** | **Deep Scan** | **SENSORS** | 6 | **Success:** Gain 1 Data. **Fail:** No penalty. |
| **Bonus** | **Matter Vacuum** | **NONE** | N/A | **Global:** All players lose 1 Matter. If at 0 Matter, lose 1 Stability. |
| **Bonus** | **Model Sync** | **LOGIC** | 4 | **Success:** Gain 1 **Insight Token** (Natural 6). |

---

### Visualizing Selection Pressure

The chart below illustrates how these events impact the population. While "Hazards" affect everyone, "Apex Lead" events act as a ceiling to prevent runaway leaders, and "The Great Filter" sets a floor that moves upward with the group.

### Using this Deck

* **Event Timing:** Draw one card at the end of the round, after all players have completed their Execution and Interaction phases.
* **The "Priority" Choice:** For cards like **Grid Re-Sync**, the player currently holding the Priority Token (most energy-efficient/lowest sum) makes the decision.

---

## 9. Winning the Game

To win, you must occupy **The Core**, have a total permanent attribute sum of **25+**, spend **10 Data**, and survive one final **Event Card** without losing Stability.

