# Physics Engine & Cosmology

This document details the physical models, equations, and approximations used in the BAO Visualization engine.

## 1. Cosmological Model (Lambda-CDM)

The simulation is based on the $\Lambda$CDM model, defined by the following density parameters:
- $\Omega_m$: Matter density (Dark Matter + Baryons)
- $\Omega_\Lambda$: Dark Energy density
- $\Omega_r$: Radiation density (approx. $8.4 \times 10^{-5}$)
- $\Omega_k$: Curvature density ($1 - \Omega_m - \Omega_\Lambda - \Omega_r$)

### 1.1 Time Evolution (Friedmann Equation)
The expansion of the universe is governed by the Friedmann equation. We calculate the Hubble parameter $H(a)$ normalized to $H_0$:

$$ E(a) = \frac{H(a)}{H_0} = \sqrt{\Omega_m a^{-3} + \Omega_\Lambda + \Omega_r a^{-4} + \Omega_k a^{-2}} $$

Where $a = \frac{1}{1+z}$ is the scale factor.

**Implementation Note:**
In the simulation loop (`script.js`), we evolve the scale factor $a$. The physical time step $dt$ relates to $da$ via $da = a H(a) dt$.
However, for visualization purposes, evolving linearly in physical time would make the early universe (high $z$) pass instantly.
**Approximation:** We evolve $a$ such that it grows exponentially in linear simulation time (constant log-rate).
$$ da_{sim} \propto a \cdot \text{speed} $$
This decouples the animation speed from the physical expansion rate to make the entire history watchable.
Note: While we calculate $H(a)$ in the code for display purposes, it is not used to drive the animation speed.

## 2. Structure Formation

### 2.1 Linear Growth Factor
We approximate the growth of structure $D(a)$ (how density perturbations $\delta$ grow over time) using the approximation from Carroll, Press, & Turner (1992).

$$ D(a) \approx \frac{5 \Omega_m(a) a}{2} \frac{1}{\Omega_m(a)^{4/7} - \Omega_\Lambda(a) + (1 + \Omega_m(a)/2)(1 + \Omega_\Lambda(a)/70)} $$

### 2.2 Zeldovich-like Sharpening (Gravity)
Instead of a full N-body simulation, we simulate structure formation by linearly interpolating galaxies towards their cluster centers based on the growth factor.
$$ r_{current} = r_{initial} \times (1 - \text{strength} \times D(a)) $$
- **Constraint:** The effective gravity factor $(1 - \text{strength} \times D(a))$ is clamped to a minimum of `0.2` to prevent galaxies from collapsing into a singularity.
- **Strength:** Controlled by `CONFIG.GRAVITY_STRENGTH` (Default 0.2).

### 2.3 Baryon Acoustic Oscillations (BAO)
The BAO signal is modeled as a statistical overdensity of galaxies at the sound horizon scale $r_s$.

**Sound Horizon Scale:**
We approximate the dependence of $r_s$ on matter density:
$$ r_s \propto (\Omega_m h^2)^{-0.25} $$
In the code, this is normalized to a reference $\Omega_m = 0.3$ (Power law index `0.25`).

> [!NOTE]
> In this case, this means only the BAO rings are considered as attractive points, and the painted galaxies only move towards these rings, not towards each other gravitationally. Also, the background galaxies do not participate in structure formation, but still expand with the universe.

## 3. Visual Approximations

To create a compelling visual experience on a 2D screen, several non-physical transformations are applied.

### 3.1 Visual Scale Factor ($a_{vis}$)
In the real universe, the scale factor changes by a factor of ~1100 from recombination to today. Displaying this 1:1 would make objects invisible or the screen empty.
We apply **Expansion Damping**:

$$ a_{vis} = a_{real}^{(1 - \text{damping})} $$

With `damping = 0.6` (`CONFIG.EXPANSION_DAMPING`), a factor of 1000 becomes $\approx 1000^{0.4} \approx 15.8$. This allows us to show expansion without losing context.

### 3.2 Redshift Space Distortions (RSD)
We simulate the "Kaiser Effect" (squashing of clusters along the line of sight) using a simplified model.
Assuming the Line of Sight (LoS) is the Y-axis:

$$ y_{apparent} = y_{real} + \frac{v_{pec}}{H(a)} $$

We model the infall velocity $v_{pec}$ as proportional to the distance from the cluster center ($dy$) and the growth factor:
$$ \Delta y \propto -dy \cdot D(a) \cdot \text{GravityStrength} \cdot \text{RSDFactor} $$

- **RSD Factor:** `0.8` (`CONFIG.RSD_FACTOR`).
- **Safety Clamp:** The scaling factor is clamped to a minimum of `0.2` (`CONFIG.RSD_MIN_SCALE`) to prevent the visualization from inverting or flattening completely.

**Fingers of God:**
Small-scale random virial motion is simulated by adding noise to the Y-position of galaxies in the central cluster.
$$ y' = y + \text{fogFactor} \times 20 \times D(a) $$
The factor `20` is a visual constant for the dispersion effect.

### 3.3 Comoving vs. Physical Frame
- **Physical Frame:** Objects expand away from each other. $r_{phys} = r_{com} \cdot a$.
- **Comoving Frame:** Expansion is factored out. Objects remain static (except for peculiar motions).
    - **Visual Trick:** We fix the render scale to a specific redshift ($z=5$) to keep the volume constant and disable opacity evolution.
