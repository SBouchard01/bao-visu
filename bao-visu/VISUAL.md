# Visualization & Rendering Techniques

This document explains the visual effects, rendering pipeline, and artistic choices used to visualize the BAO data.

## 1. Rendering Pipeline

The rendering in `draw.js` follows a layered approach (Painter's Algorithm):

1.  **Background:** Clear to deep black (`#050505`).
2.  **Heatmap Layer:** Renders the density field as a continuous fluid. (Always available via toggle, automatically emphasized at high-z).
3.  **Density/BAO Layer:** (Low-z) Renders the theoretical density peaks and rings.
    - **Composition:** Rendered as a radial gradient with 3 components:
        1.  **Central Peak:** Hot/Halo colors (High density).
        2.  **Gap:** Low density region.
        3.  **Ring:** Glow color at $r_s$ (Overdensity).
4.  **Galaxy Layer:** (Low-z) Renders individual galaxy sprites.
5.  **Horizon Overlay:** Dashed line showing the theoretical sound horizon.
6.  **Masking:** Applies an elliptic mask for the High-Redshift Sky View transition.
7.  **UI Overlay:** Text info and plots.

## 2. Galaxy Rendering (Sprites)

To achieve realistic, high-performance galaxy rendering (thousands of objects), we use a **Sprite System**.

### 2.1 Sprite Generation (`generateGalaxySprites`)
Instead of drawing complex shapes every frame, we pre-render galaxy textures into offscreen canvases.
- **Composition:**
    1.  **Soft Glow:** Radial gradient (Color -> Transparent).
    2.  **Core:** Bright, solid circle in the center.
    3.  **Dust/Stars:** Random small particles scattered within the sprite.
- **Variations:** We generate sprites for different color temperatures (Blue, White, Red/Yellow).

### 2.2 Instance Rendering
In `drawGalaxies`, we draw these sprites with per-instance variations:
- **Rotation:** Random angle.
- **Eccentricity:** Squashed height to simulate disk inclination.
- **Size:** Scaled by `a_vis` and a random size factor.
- **Brightness:** Modulated by a "fog" factor to simulate depth.
- **Evolution:** Galaxy opacity increases with the growth factor to simulate star formation and mass assembly.
    - Formula: `opacity = Math.max(0.4, Math.min(1, growth + 0.2))` (Physical frame only).

## 3. Heatmap Visualization

We visualize the density field directly using a heatmap. This is generated from the *same* particle distribution as the galaxies, but rendered using a density estimation technique. This represents the matter density perturbations.

### 3.1 Cloud-in-Cell (CIC) Binning
We map discrete galaxy positions to a grid.
- Each galaxy contributes density to the 4 nearest grid cells, weighted by distance.
- This creates a smoother distribution than simple "nearest neighbor" binning.
- **Resolution:** The grid resolution is dynamic. At high-z (zoomed out), we use a pixel size of `4.0` (effectively 1/4th resolution) to provide natural smoothing and performance. At low-z, it interpolates to finer detail.

### 3.2 Diffusion (Smoothing)
We apply a 3x3 box blur kernel (two passes) to the grid. This simulates the diffusion of photons in the baryon-photon plasma before recombination.

### 3.3 Logarithmic Color Mapping
The density range is high dynamic range (HDR). To visualize faint filaments and bright clusters simultaneously:
1.  **Log Scale:** $V_{log} = \log(1 + \text{density} \times 10)$.
2.  **Normalization:** $V_{norm} = V_{log} / V_{max}$.
3.  **Color Ramp:**
    - 0.0 - 0.25: Deep Blue (Voids)
    - 0.25 - 0.50: Cyan/Green (Filaments)
    - 0.50 - 0.75: Orange/Red (Clusters)
    - 0.75 - 1.00: White (Peaks)

## 4. The "Transition" Effect

A key visual feature is the smooth transition from the early universe (Heatmap) to the late universe (Galaxies).

- **Range:** $z=1100$ (Recombination) to $z=5$ (Dark Ages end).
- **Interpolation:** We calculate a parameter $t$ (0 to 1) based on $\log(z)$.
- **Blending:**
    - `Heatmap Alpha`: $1.0 \to 0.0$ (If toggle is OFF. If ON, stays at 1.0).
    - `Galaxy Alpha`: $0.0 \to 1.0$
- **Masking:** An elliptic mask (representing the projected sky view at high redshift) expands to fill the rectangular screen as $z$ decreases.

## 5. Tiling System
At high redshifts ($z=1100$), the simulation box is very small on screen.
- We detect if `boxSize < screenSize`.
- If true, we render the simulation to a `tileCanvas`.
- We then repeat this tile to fill the screen, creating the illusion of an infinite universe.
