// Physics Engine & State

// --- Configuration ---
var CONFIG = {
    // Physics & Cosmology
    COMOVING_RADIUS: 150,      
    EXPANSION_DAMPING: 0.6,
    GRAVITY_STRENGTH: 0.2, // Strength of structure formation (0 to 1)
    DEFAULT_COMOVING_Z: 5.0, // Reference redshift for comoving scale
    
    // Animation
    TIME_SPEED: 0.005, // Base time step
    ANIMATION_SPEED_FACTOR: 2.0, // Multiplier for visual speed tuning
    
    // Simulation
    MAX_BAO_COUNT: 200,        
    UNIVERSE_SIZE: 8000, // Increased for high-z zoom out
    CENTER_SPAWN_RANGE: 2400, // Increased for high-z zoom out
    
    // Galaxy Generation
    GALAXIES_PER_CENTER: 15,
    GALAXIES_PER_RING: 40,
    GALAXIES_BACKGROUND: 800,
    GALAXY_SCATTER_CENTER: 30,
    GALAXY_SCATTER_RING: 20,
    
    // Visuals - Colors
    BG_COLOR: '#050505',
    CENTER_HOT_COLOR: '255, 220, 200',
    CENTER_HALO_COLOR: '50, 100, 200',
    RING_BASE_COLOR: '0, 150, 255',
    RING_GLOW_COLOR: '0, 200, 255',
    GALAXY_COLORS: [
        '255, 240, 220', // White-Yellow
        '200, 220, 255', // Blue-ish
        '255, 200, 180', // Red-ish
        '255, 255, 255'  // Pure White
    ],
    
    // Visuals - Sizes & Opacities
    CENTER_RADIUS_BASE: 40,
    CENTER_OPACITY_BASE: 0.8,
    RING_WIDTH_BASE: 25,
    RING_OPACITY_BASE: 0.6,
    RING_BLUR_BASE: 40,
    
    // Galaxy Sprites
    GALAXY_SPRITE_SIZE_MULTIPLIER: 4.0, // Scale factor for galaxy sprites
    GALAXY_SPRITE_MIN_RADIUS: 3.0,      // Minimum radius in pixels
    GALAXY_SPRITE_OPACITY_BOOST: 1.2,   // Opacity multiplier for sprites
    GALAXY_SPRITE_CORE_RADIUS: 5,       // Radius of the bright core in the sprite texture

    // Heatmap
    HEATMAP_PIXEL_SIZE: 4,
    HEATMAP_PIXEL_SIZE_MAX: 4.0,
    HEATMAP_PIXEL_SIZE_MIN: 0.5,
    HEATMAP_ALPHA_THRESHOLD: 0.01,

    // Rendering Constants
    OMEGA_M_REF: 0.3,           // Reference Omega_m for sound horizon normalization
    SOUND_HORIZON_EXP: 0.25,    // Power law exponent for sound horizon scaling
    RSD_FACTOR: 0.8,            // Strength of Redshift Space Distortions
    RSD_MIN_SCALE: 0.2,         // Minimum scaling factor for RSD (prevents inversion)
    
    // Transition
    TRANSITION_Z_START: 1100.0, // CMB / Recombination
    TRANSITION_Z_END: 5.0,      // End of transition to galaxy view
    GALAXY_ALPHA_THRESHOLD: 0.001,

    // Mask (CMB View)
    MASK_WIDTH_RATIO: 0.45,     // Target ellipse width relative to screen width
    MASK_MARGIN: 1.2,           // Start ellipse margin factor

    // BAO Visualization Colors/Opacity
    BAO_OPACITY_CENTER: 0.9,
    BAO_OPACITY_HALO: 0.4,
    BAO_OPACITY_GAP: 0.05,
    BAO_OPACITY_RING: 0.3
};

var state = {
    z: 5.0,
    a: 1/(1+5), // a = 1/(1+z)
    playing: false,
    lastTime: 0,
    lastFpsTime: 0,
    frameCount: 0,
    fps: 0,
    baoCount: 1,
    centers: [],
    galaxies: [],
    
    // Layers
    showDensity: true,
    showGalaxies: true, // Points
    showHeatmap: false, // Heatmap
    showHorizon: false,
    showPlot: true,
    galaxyDensity: 1.0,
    isComoving: false, // New state for reference frame
    showRSD: false, // Redshift Space Distortions
    
    // Cosmology
    omega_m: 0.3,
    omega_lambda: 0.7,
    omega_r: 8.4e-5, // Radiation density (approx)
    isFlat: true,
    
    // Dev State
    devMode: false,
    showTransition: true,
    showTileBorder: false,
    showHeatmapLayer: true,
    heatmapMaxDensity: 0,
    devComovingScale: 1.0
};

function updatePhysicsStateFromZ(z) {
    state.z = z;
    state.a = 1 / (1 + z);
}

// Calculate Linear Growth Factor D(a) using Carroll, Press, & Turner (1992) approximation
// D(a) = a * g(a), where g(a) is the growth suppression factor relative to EdS
function calculateGrowthFactor(a, Om, Ol) {
    // Avoid division by zero at a=0
    if (a <= 0.001) return a;

    const Ok = 1 - Om - Ol;
    const E_sq = Om * Math.pow(a, -3) + Ol + Ok * Math.pow(a, -2);
    
    // Omega parameters at scale factor a
    const Om_a = (Om * Math.pow(a, -3)) / E_sq;
    const Ol_a = Ol / E_sq;
    
    // Fitting formula for g(a)
    const numerator = 2.5 * Om_a;
    const denominator = Math.pow(Om_a, 4/7) - Ol_a + (1 + Om_a/2) * (1 + Ol_a/70);
    
    const g = numerator / denominator;
    
    // For EdS (Om=1, Ol=0), g=1, so D(a)=a.
    // For LambdaCDM, g < 1 at late times.
    return a * g;
}

function shuffleCenters() {
    state.centers = [];
    // 1. Central Peak (Always at 0,0)
    state.centers.push({x: 0, y: 0});
    
    // 2. Random Peaks
    // Spawn uniformly within the Universe Size to ensure tiling is seamless
    const rangeX = CONFIG.UNIVERSE_SIZE; 
    const rangeY = CONFIG.UNIVERSE_SIZE;
    
    for (let i = 1; i < CONFIG.MAX_BAO_COUNT; i++) {
        state.centers.push({
            x: (Math.random() - 0.5) * rangeX,
            y: (Math.random() - 0.5) * rangeY
        });
    }
    
    generateGalaxies();
}

function generateGalaxies() {
    state.galaxies = [];
    
    // Target Total Galaxies = Density * Area
    // Density is in 10^-3 gal/(Mpc/h)^2
    // Area = (2000 Mpc/h)^2 = 4 * 10^6 (Mpc/h)^2
    // Total = (Density * 10^-3) * (4 * 10^6) = Density * 4000
    const targetTotal = (state.galaxyDensity || 2.0) * 4000;
    
    // Calculate Base Count (what we would get with multiplier=1)
    // Base = BAO_Count * (PerCenter + PerRing) + Background
    const baseTotal = state.baoCount * (CONFIG.GALAXIES_PER_CENTER + CONFIG.GALAXIES_PER_RING) + CONFIG.GALAXIES_BACKGROUND;
    
    // Multiplier to scale everything to match target
    const density = targetTotal / Math.max(1, baseTotal);
    
    const createGalaxy = (type, centerIndex, r_base, angle, offsetR, offsetAngle, x, y) => {
        const color = CONFIG.GALAXY_COLORS[Math.floor(Math.random() * CONFIG.GALAXY_COLORS.length)];
        const sizeVar = 0.8 + Math.random() * 0.6; // 0.8 to 1.4
        const eccentricity = 0.5 + Math.random() * 0.5; // 0.5 to 1.0 (1 = circle)
        const rotation = Math.random() * Math.PI;
        const fogFactor = (Math.random() - 0.5); // Pre-calculate random factor for RSD
        
        return {
            type, centerIndex, r_base, angle, offsetR, offsetAngle, x, y,
            color, sizeVar, eccentricity, rotation, fogFactor
        };
    };
    
    // 1. Galaxies associated with centers (Clusters)
    state.centers.forEach((center, index) => {
        if (index >= state.baoCount) return;

        // Central Cluster
        const countCenter = Math.floor(CONFIG.GALAXIES_PER_CENTER * density);
        for (let i = 0; i < countCenter; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.abs(randomGaussian() * CONFIG.GALAXY_SCATTER_CENTER);
            state.galaxies.push(createGalaxy('center', index, 0, angle, r, angle));
        }
        
        // Ring Cluster (BAO Shell)
        const countRing = Math.floor(CONFIG.GALAXIES_PER_RING * density);
        for (let i = 0; i < countRing; i++) {
            const angle = Math.random() * Math.PI * 2;
            const scatter = randomGaussian() * CONFIG.GALAXY_SCATTER_RING;
            state.galaxies.push(createGalaxy('ring', index, 1.0, angle, scatter, angle));
        }
    });
    
    // 2. Background Galaxies (Uniform)
    const countBg = Math.floor(CONFIG.GALAXIES_BACKGROUND * density);
    for (let i = 0; i < countBg; i++) {
        const x = (Math.random() - 0.5) * CONFIG.UNIVERSE_SIZE;
        const y = (Math.random() - 0.5) * CONFIG.UNIVERSE_SIZE;
        state.galaxies.push(createGalaxy('background', -1, 0, 0, 0, 0, x, y));
    }
}
