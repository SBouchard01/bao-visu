# Physical Approximations & Visual Tricks

This document tracks the physical approximations, visual hacks, and "magic numbers" used in the BAO Visualization to balance scientific accuracy with educational clarity and performance.

## 1. Cosmology & Time Evolution

### Friedmann Equation
- **Approximation:** The simulation solves the Friedmann equation for $H(a)$ using normalized units where $H_0$ is absorbed into the time step.
- **Magic Number:** `CONFIG.TIME_SPEED = 0.005` (Controls the speed of evolution $da/dt$).

### Linear Growth Factor ($D(a)$)
- **Approximation:** Uses the Carroll, Press, & Turner (1992) fitting formula for the growth suppression factor $g(a)$ in a $\Lambda$CDM universe.
- **Simplification:** We assume $D(a) \approx a \times g(a)$.

### Visual Expansion Damping
- **Trick:** To keep galaxies visible on screen as the universe expands by a factor of 6 (from $z=5$ to $z=0$), we damp the visual scale factor.
- **Formula:** $a_{vis} = a_{real}^{(1 - \text{damping})}$
- **Magic Number:** `CONFIG.EXPANSION_DAMPING = 0.6` (0 = real expansion, 1 = no visual expansion).

## 2. Structure Formation (Gravity)

### Zeldovich-like Sharpening
- **Approximation:** Instead of N-body gravity, we simulate structure formation by linearly interpolating galaxies towards their cluster centers based on the growth factor.
- **Formula:** $r_{current} = r_{initial} \times (1 - \text{strength} \times D(a))$
- **Magic Number:** `CONFIG.GRAVITY_STRENGTH` (Default 0.2, User adjustable).
- **Constraint:** `effectiveGravity` is clamped to `0.2` to prevent galaxies from collapsing into a singularity.

### Galaxy Evolution
- **Visual Trick:** Galaxy opacity/brightness increases with the growth factor to simulate star formation and mass assembly.
- **Formula:** `opacity = Math.max(0.4, Math.min(1, growth + 0.2))` (Physical frame only).

## 3. Redshift Space Distortions (RSD)

### Kaiser Effect (Large Scale Squashing)
- **Approximation:** We simulate the coherent infall of galaxies by squashing the Y-axis (Line of Sight).
- **Formula:** $y' = y_{center} + (y - y_{center}) \times (1 - \text{strength})$
- **Magic Number:** `0.8` (Scaling factor in `rsdStrength = GRAVITY_STRENGTH * growth * 0.8`).
- **Safety Clamp:** The scaling factor `(1 - strength)` is clamped to a minimum of `0.2` to prevent the visualization from inverting or flattening completely at high gravity settings.

### Fingers of God (Small Scale Dispersion)
- **Approximation:** Random virial motion is simulated by adding noise to the Y-position of galaxies in the central cluster.
- **Optimization:** The random factor (`fogFactor`) is pre-calculated per galaxy to prevent "wiggling" artifacts during animation.
- **Formula:** $y' = y + \text{fogFactor} \times \text{scale} \times D(a)$
- **Magic Number:** `20` (Pixel scale for the dispersion effect).

## 4. Sound Horizon (BAO)

### Sound Horizon Scale ($r_s$)
- **Approximation:** The dependence of $r_s$ on cosmology is approximated as a power law of $\Omega_m$.
- **Formula:** $scale = (0.3 / \Omega_m)^{0.25}$
- **Magic Number:** `0.25` (Power law index).

### Visual Representation
- **Trick:** The BAO density field is rendered as a radial gradient rather than a true density map.
- **Composition:**
    1. Central Peak (Hot/Halo colors)
    2. Gap (Low density)
    3. Ring (Glow color at $r_s$)

### Galaxy Heatmap Mode
- **Implementation:** Offscreen canvas processing with 3x3 diffusion smoothing.
- **Resolution:** 1/4th of the screen size (improves performance and provides natural smoothing when upscaled).
- **Smoothing:** 3x3 weighted kernel diffusion pass on the density grid.
- **Upscaling:** Bilinear interpolation (`imageSmoothingEnabled = true`) when drawing the offscreen heatmap to the main canvas.
- **Color Map:** Turbo-like gradient (Blue-Cyan-Green-Yellow-Red).

## 5. Reference Frames

### Comoving Frame
- **Visual Trick:** In "Comoving" mode, we fix the scale factor to the $z=5$ value ($a=1/6$) and disable the opacity evolution, effectively showing the "initial conditions" scaled up.
