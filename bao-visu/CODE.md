# Code Implementation Guide

This document provides a step-by-step explanation of the codebase structure and logic, enabling a complete reconstruction of the application.

## 1. Architecture Overview

The application is a vanilla JavaScript web app (no build tools required).

- **`index.html`**: DOM structure, canvas containers, and UI panels.
- **`style.css`**: Styling for the "Glassmorphism" UI, sliders, and layout.
- **`physics.js`**: Configuration constants (`CONFIG`) and simulation state (`state`).
- **`utils.js`**: Helper functions (Math, Random).
- **`draw.js`**: The rendering engine (Canvas 2D API).
- **`style.js`**: UI logic, event listeners, and DOM manipulation.
- **`script.js`**: The main entry point and simulation loop.

## 2. State Management (`physics.js`)

### 2.1 Configuration
All "magic numbers" are centralized in `CONFIG`.
- **Physics:** `COMOVING_RADIUS`, `GRAVITY_STRENGTH`.
- **Visuals:** `GALAXY_COLORS`, `SPRITE_SIZE`.
- **Transition:** `TRANSITION_Z_START`, `TRANSITION_Z_END`.

### 2.2 State Object
The `state` object holds the mutable simulation data:
- `z`, `a`: Current redshift and scale factor.
- `centers`: Array of BAO center coordinates $\{x, y\}$.
- `galaxies`: Array of galaxy objects.
- `isComoving`: Boolean flag for the reference frame.

## 3. Initialization & Main Loop (`script.js`)

### 3.1 `init()`
1.  Checks for Dev Mode (URL param or Shift+D).
2.  Calls `resize()` to set canvas dimensions.
3.  Calls `shuffleCenters()` to generate initial data.
4.  Starts the `loop()`.

### 3.2 `loop(timestamp)`
1.  Calculates `dt`.
2.  **Friedmann Evolution:** Updates `state.a` using the simplified exponential growth logic (see PHYSICS.md).
3.  Updates `state.z`.
4.  Calls `updateUI()` and `draw()`.
5.  Requests next animation frame.

## 4. Data Generation (`physics.js`)

### 4.1 `shuffleCenters()`
Generates random positions for BAO centers within `CONFIG.UNIVERSE_SIZE`.

### 4.2 `generateGalaxies()`
Populates `state.galaxies`.
- **Centers:** Galaxies placed exactly at BAO centers (with scatter).
- **Rings:** Galaxies placed at `COMOVING_RADIUS` from centers (Gaussian scatter).
- **Background:** Uniformly distributed random galaxies.
- **Properties:** Each galaxy gets a `color`, `rotation`, `eccentricity`, and `sizeVar`.

## 5. Rendering Engine (`draw.js`)

### 5.1 `draw()` - The Coordinator
1.  Clears canvas.
2.  Calculates physics derived values (`growth`, `soundHorizonScale`, `rsdStrength`).
3.  Determines `renderScale` (Physical vs Comoving).
    - **Comoving Trick:** If `state.isComoving` is true, we fix the scale factor to `CONFIG.DEFAULT_COMOVING_Z` to keep the volume constant.
4.  **Tiling Check:** If the universe box is smaller than the screen, it enables tiling mode.
5.  **Layer Rendering:**
    - Calls `drawGalaxies(..., 'heatmap')` if needed.
    - Calls `drawBAO()` for density rings.
    - Calls `drawGalaxies(..., 'points')` for sprites.
6.  Draws Overlays (Horizon, Info Text).

### 5.2 `drawGalaxies()`
Handles both Point and Heatmap rendering.
- **Point Mode:** Iterates galaxies, calculates screen position (applying expansion and RSD), and draws the cached sprite.
- **Heatmap Mode:** Pushes transformed coordinates to `state.heatmapPositions` for batch processing.

### 5.3 `renderHeatmapGrid()`
1.  Creates a `Float32Array` grid.
2.  **Binning:** Maps galaxy positions to grid indices (CIC).
3.  **Smoothing:** Applies box blur.
4.  **Coloring:** Maps density to pixel colors (Log scale -> Color Ramp).
5.  **Upscaling:** Draws the small heatmap canvas onto the main canvas.

## 6. UI Logic (`style.js`)

- **Event Listeners:** Maps sliders/buttons to `state` or `CONFIG` changes.
- **`updateUI()`:** Refreshes DOM elements (slider positions, text values) based on current `state`.
- **Dev Tools:** Handles the hidden dev panel logic.

## 7. Key Implementation Details

- **Offscreen Canvases:** Used for Sprites and Heatmap to improve performance.
- **Global Alpha Transition:** The transition effect relies on manipulating `ctx.globalAlpha` in `draw.js` based on the `t` interpolation factor.
- **Coordinate Wrapping:** All rendering functions handle periodic boundary conditions (`x % wrapSize`) to support the tiling effect.
