console.log("Script loaded");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing...");
    try {
        init();
    } catch (e) {
        console.error("Initialization error:", e);
        alert("Error initializing simulation: " + e.message);
    }
});

const canvas = document.getElementById('sim-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// Controls
const zSlider = document.getElementById('z-slider');
const zVal = document.getElementById('z-val');
const playBtn = document.getElementById('play-btn');
const resetBtn = document.getElementById('reset-btn');
const baoSlider = document.getElementById('bao-slider');
const baoVal = document.getElementById('bao-val');
const galaxyDensitySlider = document.getElementById('galaxy-density-slider');
const galaxyNumberVal = document.getElementById('galaxy-number-val');
const shuffleBtn = document.getElementById('shuffle-btn');

// Sidebar & Layout Controls
const sidebar = document.getElementById('sidebar');
const sidebarLogoBtn = document.getElementById('sidebar-logo-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const sidebarPlayBtn = document.getElementById('sidebar-play-btn');
const sidebarResetBtn = document.getElementById('sidebar-reset-btn');
const sidebarDensityBtn = document.getElementById('sidebar-density-btn');
const sidebarGalaxiesBtn = document.getElementById('sidebar-galaxies-btn');
const settingsPanel = document.getElementById('settings-panel');

// Layer Controls
const layerDensityToggle = document.getElementById('layer-density-toggle');
const layerGalaxiesToggle = document.getElementById('layer-galaxies-toggle');

// Cosmology Controls
const omegamSlider = document.getElementById('omegam-slider');
const omegamVal = document.getElementById('omegam-val');
const omegalSlider = document.getElementById('omegal-slider');
const omegalVal = document.getElementById('omegal-val');
const flatToggle = document.getElementById('flat-toggle');

// --- Configuration ---
const CONFIG = {
    // Physics & Cosmology
    COMOVING_RADIUS: 180,      
    EXPANSION_DAMPING: 0.6,    
    
    // Animation
    TIME_SPEED: 0.005, // Adjusted for Friedmann evolution
    
    // Simulation
    MAX_BAO_COUNT: 100,        
    UNIVERSE_SIZE: 4000, // Large area for background galaxies
    CENTER_SPAWN_RANGE: 1200, // Restricted area for BAO centers to keep them on screen
    
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
    RING_BLUR_BASE: 40
};

const state = {
    z: 5.0,
    a: 1/6, // a = 1/(1+z)
    playing: false,
    lastTime: 0,
    baoCount: 1,
    centers: [],
    galaxies: [],
    
    // Layers
    showDensity: true,
    showGalaxies: true,
    galaxyDensity: 1.0,
    
    // Cosmology
    omega_m: 0.3,
    omega_lambda: 0.7,
    isFlat: true
};

function init() {
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    
    resize();
    window.addEventListener('resize', resize);
    
    // Generate initial centers
    shuffleCenters();
    
    // Initial Physics State
    updatePhysicsStateFromZ(state.z);
    
    // --- Event Listeners ---
    
    if (playBtn) playBtn.addEventListener('click', togglePlay);
    if (sidebarPlayBtn) sidebarPlayBtn.addEventListener('click', togglePlay);
    
    const resetHandler = () => {
        state.playing = false;
        updatePlayButtons();
        state.z = 5.0;
        updatePhysicsStateFromZ(state.z);
        updateUI();
        draw();
    };

    if (resetBtn) resetBtn.addEventListener('click', resetHandler);
    if (sidebarResetBtn) sidebarResetBtn.addEventListener('click', resetHandler);
    
    // Layer Toggles
    const toggleDensity = () => {
        state.showDensity = !state.showDensity;
        updateLayerUI();
        draw();
    };
    const toggleGalaxies = () => {
        state.showGalaxies = !state.showGalaxies;
        updateLayerUI();
        draw();
    };

    if (layerDensityToggle) layerDensityToggle.addEventListener('change', (e) => {
        state.showDensity = e.target.checked;
        updateLayerUI();
        draw();
    });
    if (sidebarDensityBtn) sidebarDensityBtn.addEventListener('click', toggleDensity);

    if (layerGalaxiesToggle) layerGalaxiesToggle.addEventListener('change', (e) => {
        state.showGalaxies = e.target.checked;
        updateLayerUI();
        draw();
    });
    if (sidebarGalaxiesBtn) sidebarGalaxiesBtn.addEventListener('click', toggleGalaxies);

    // Layout Toggles
    if (sidebarLogoBtn) {
        sidebarLogoBtn.addEventListener('click', () => {
            const isCollapsed = settingsPanel.classList.contains('collapsed');
            toggleSettings(isCollapsed);
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => toggleSettings(false));
    }
    
    if (zSlider) {
        zSlider.addEventListener('input', (e) => {
            // RTL Slider: Min(0)=Right, Max(5)=Left
            // Value maps directly to z
            const val = parseFloat(e.target.value);
            state.z = val;
            
            updatePhysicsStateFromZ(state.z);
            updateUI();
            draw();
        });
    }
    
    if (baoSlider) {
        baoSlider.addEventListener('input', (e) => {
            state.baoCount = parseInt(e.target.value);
            // Regenerate galaxies because active centers changed? 
            // Actually generateGalaxies generates for all centers, draw filters them.
            // But we might want to optimize or just redraw.
            updateUI();
            draw();
        });
    }

    if (galaxyDensitySlider) {
        galaxyDensitySlider.addEventListener('input', (e) => {
            state.galaxyDensity = parseFloat(e.target.value);
            generateGalaxies(); // Regenerate with new density
            updateUI(); // Update count display
            draw();
        });
    }
    
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            shuffleCenters();
            draw();
        });
    }

    // Cosmology Listeners
    if (omegamSlider) {
        omegamSlider.addEventListener('input', (e) => {
            state.omega_m = parseFloat(e.target.value);
            if (state.isFlat) {
                state.omega_lambda = parseFloat((1 - state.omega_m).toFixed(2));
            }
            updateUI();
            draw();
        });
    }

    if (omegalSlider) {
        omegalSlider.addEventListener('input', (e) => {
            state.omega_lambda = parseFloat(e.target.value);
            if (state.isFlat) {
                state.omega_m = parseFloat((1 - state.omega_lambda).toFixed(2));
            }
            updateUI();
            draw();
        });
    }

    if (flatToggle) {
        flatToggle.addEventListener('change', (e) => {
            state.isFlat = e.target.checked;
            if (state.isFlat) {
                // Enforce flatness by adjusting Lambda to match Matter
                state.omega_lambda = parseFloat((1 - state.omega_m).toFixed(2));
                updateUI();
                draw();
            }
        });
    }
    
    updateUI();
    draw();
    console.log("Initialization complete");
}

function updatePhysicsStateFromZ(z) {
    state.z = z;
    state.a = 1 / (1 + z);
}

function shuffleCenters() {
    state.centers = [];
    // 1. Central Peak (Always at 0,0)
    state.centers.push({x: 0, y: 0});
    
    // 2. Random Peaks
    // Spawn within the area corresponding to the MAXIMAL redshift (z=5, a=1/6).
    // This ensures that even if we are zoomed in (z=0), we spawn enough galaxies to fill
    // the screen when we zoom out (z=5).
    // a_min = 1 / (1 + 5) = 1/6.
    // We use a_min for the calculation to cover the largest possible comoving volume we might see.
    const a_min = Math.pow(1/6, 1 - CONFIG.EXPANSION_DAMPING);
    
    // We use a slightly larger range (1.1x) to ensure edges are covered
    const rangeX = (canvas.width / a_min) * 1.1; 
    const rangeY = (canvas.height / a_min) * 1.1;
    
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
    
    // Apply density multiplier
    const density = state.galaxyDensity || 1.0;
    
    const createGalaxy = (type, centerIndex, r_base, angle, offsetR, offsetAngle, x, y) => {
        const color = CONFIG.GALAXY_COLORS[Math.floor(Math.random() * CONFIG.GALAXY_COLORS.length)];
        const sizeVar = 0.8 + Math.random() * 0.6; // 0.8 to 1.4
        const eccentricity = 0.5 + Math.random() * 0.5; // 0.5 to 1.0 (1 = circle)
        const rotation = Math.random() * Math.PI;
        
        return {
            type, centerIndex, r_base, angle, offsetR, offsetAngle, x, y,
            color, sizeVar, eccentricity, rotation
        };
    };
    
    // 1. Galaxies associated with centers (Clusters)
    state.centers.forEach((center, index) => {
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

// Box-Muller transform for Gaussian distribution
function randomGaussian() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    shuffleCenters(); // Re-distribute centers to fill the new screen size
    draw();
}

function toggleSettings(show) {
    if (show) {
        settingsPanel.classList.remove('collapsed');
        sidebar.classList.add('hidden');
    } else {
        settingsPanel.classList.add('collapsed');
        sidebar.classList.remove('hidden');
    }
}

function togglePlay() {
    // If we are at the end of the simulation (z ~ 0), restart from z=5
    if (!state.playing && state.z <= 0.05) {
        state.z = 5.0;
        updatePhysicsStateFromZ(state.z);
        updateUI();
    }

    state.playing = !state.playing;
    updatePlayButtons();
    
    if (state.playing) {
        state.lastTime = performance.now();
        requestAnimationFrame(loop);
    }
}

function updatePlayButtons() {
    const playIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    const pauseIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    
    const playIconLarge = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    const pauseIconLarge = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

    if (state.playing) {
        if (playBtn) playBtn.innerHTML = pauseIcon + ' Pause';
        if (sidebarPlayBtn) sidebarPlayBtn.innerHTML = pauseIconLarge;
    } else {
        if (playBtn) playBtn.innerHTML = playIcon + ' Play';
        if (sidebarPlayBtn) sidebarPlayBtn.innerHTML = playIconLarge;
    }
}

function updateLayerUI() {
    if (layerDensityToggle) layerDensityToggle.checked = state.showDensity;
    if (layerGalaxiesToggle) layerGalaxiesToggle.checked = state.showGalaxies;
    
    if (sidebarDensityBtn) {
        if (state.showDensity) sidebarDensityBtn.classList.add('active');
        else sidebarDensityBtn.classList.remove('active');
    }
    
    if (sidebarGalaxiesBtn) {
        if (state.showGalaxies) sidebarGalaxiesBtn.classList.add('active');
        else sidebarGalaxiesBtn.classList.remove('active');
    }
}

function updateUI() {
    updateLayerUI();
    if (zVal) zVal.textContent = state.z.toFixed(2);
    if (zSlider) {
        // Direct mapping for RTL slider
        zSlider.value = state.z;
        updateSliderFill(zSlider);
    }
    if (baoVal) baoVal.textContent = state.baoCount;
    if (baoSlider) updateSliderFill(baoSlider);

    if (galaxyNumberVal) {
        // Calculate total galaxies
        // This is an approximation based on current state
        // We can also just use state.galaxies.length if it's up to date
        if (state.galaxies) {
            galaxyNumberVal.textContent = state.galaxies.length;
        } else {
            galaxyNumberVal.textContent = "0";
        }
    }
    if (galaxyDensitySlider) updateSliderFill(galaxyDensitySlider);
    
    if (omegamVal) omegamVal.textContent = state.omega_m.toFixed(2);
    if (omegamSlider) {
        omegamSlider.value = state.omega_m;
        updateSliderFill(omegamSlider);
    }
    
    if (omegalVal) omegalVal.textContent = state.omega_lambda.toFixed(2);
    if (omegalSlider) {
        omegalSlider.value = state.omega_lambda;
        updateSliderFill(omegalSlider);
    }
    
    if (flatToggle) flatToggle.checked = state.isFlat;
}

function updateSliderFill(slider) {
    if (!slider) return;
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percentage = ((val - min) / (max - min)) * 100;
    
    if (slider.classList.contains('slider-rtl')) {
        // For RTL slider (Redshift), we want to fill from Right (0) to Left (Value)
        // Since min=0 is on the right, and value increases to the left...
        // Wait, standard RTL slider: min is right, max is left.
        // If value is 0 (right), percentage is 0.
        // If value is 5 (left), percentage is 100.
        // We want the fill to start from the right.
        slider.style.backgroundSize = percentage + '% 100%';
        // The background-position will be handled in CSS (right center)
    } else {
        slider.style.backgroundSize = percentage + '% 100%';
    }
}

function loop(timestamp) {
    if (!state.playing) return;
    
    const dt = timestamp - state.lastTime;
    state.lastTime = timestamp;
    
    // --- Friedmann Equation Evolution ---
    // H(a) = H0 * sqrt( Om/a^3 + Ol + (1-Om-Ol)/a^2 )
    // da/dt = a * H(a)
    // We use normalized units where H0 = 1 (or absorbed into TIME_SPEED)
    
    const a = state.a;
    const Om = state.omega_m;
    const Ol = state.omega_lambda;
    const Ok = 1 - Om - Ol;
    
    // Avoid division by zero or negative roots
    const E_squared = Om * Math.pow(a, -3) + Ol + Ok * Math.pow(a, -2);
    const E = Math.sqrt(Math.max(0, E_squared));
    
    // da = a * E * dt
    const da = a * E * CONFIG.TIME_SPEED;
    
    state.a += da;
    
    if (state.a >= 1.0) {
        state.a = 1.0;
        state.playing = false;
        updatePlayButtons();
    }
    
    // Update Redshift
    state.z = (1 / state.a) - 1;
    if (state.z < 0) state.z = 0;
    
    updateUI();
    draw();
    
    if (state.playing) {
        requestAnimationFrame(loop);
    }
}

function draw() {
    if (!ctx) return;
    
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    
    // Clear background
    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, w, h);
    
    // --- Physics Calculations ---
    const a_real = state.a;
    
    // Visual Scale Factor (Damped Expansion)
    // We still use damping for the visual effect to keep things on screen
    const a_vis = Math.pow(a_real, 1 - CONFIG.EXPANSION_DAMPING);
    
    // Growth Factor D(z) - Approximation: proportional to scale factor in matter domination
    // For more accuracy we could solve the growth ODE, but a ~ D is fine for visuals
    const growth = a_real; 
    
    // --- Rendering ---
    ctx.globalCompositeOperation = 'screen';
    
    // Calculate Sound Horizon Scale Factor based on Omega_m
    // r_s is roughly proportional to (Omega_m * h^2)^-0.25
    // We normalize to Omega_m = 0.3
    const soundHorizonScale = Math.pow(0.3 / Math.max(0.01, state.omega_m), 0.25);
    
    if (state.showDensity) {
        for (let i = 0; i < state.baoCount; i++) {
            const center = state.centers[i];
            if (!center) continue;
            
            const sx = cx + center.x * a_vis;
            const sy = cy + center.y * a_vis;
            
            drawBAO(sx, sy, a_vis, growth, soundHorizonScale);
        }
    }

    if (state.showGalaxies) {
        drawGalaxies(cx, cy, a_vis, growth, soundHorizonScale);
    }
    
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
    
    // --- Info Overlay ---
    ctx.fillStyle = '#555';
    ctx.font = '12px monospace';
    
    // Calculate Hubble Parameter H(z) / H0
    // E(z) = sqrt(Om(1+z)^3 + Ol + Ok(1+z)^2)
    const Om = state.omega_m;
    const Ol = state.omega_lambda;
    const Ok = 1 - Om - Ol;
    const zp1 = 1 + state.z;
    const E = Math.sqrt(Math.max(0, Om * Math.pow(zp1, 3) + Ol + Ok * Math.pow(zp1, 2)));
    
    // Approximate Age (very rough, just for display)
    // t ~ 1/H0 * integral... let's just show normalized time t
    // Or better: "Expansion Rate H(z): X H0"
    
    ctx.fillText(`z = ${state.z.toFixed(2)}`, 20, h - 60);
    ctx.fillText(`Expansion Rate H(z) = ${E.toFixed(2)} H₀`, 20, h - 40);
    ctx.fillText(`Scale Factor a = ${a_real.toFixed(3)}`, 20, h - 20);
}

function drawGalaxies(cx, cy, scale, growth, horizonScale) {
    if (!state.galaxies || state.galaxies.length === 0) return;
    
    // Galaxy brightness increases with growth (structure formation)
    const opacity = Math.max(0.4, Math.min(1, growth + 0.2));
    
    state.galaxies.forEach(g => {
        let x, y;
        
        if (g.type === 'background') {
            // Background galaxies just expand with the universe
            x = cx + g.x * scale;
            y = cy + g.y * scale;
        } else {
            // Cluster galaxies
            // Check if their center is active
            if (g.centerIndex >= state.baoCount) return;
            
            const center = state.centers[g.centerIndex];
            if (!center) return;
            
            // Calculate position relative to center
            const r_s = CONFIG.COMOVING_RADIUS * horizonScale;
            const r_comoving = (g.r_base * r_s) + g.offsetR;
            
            // Convert to screen coordinates
            const r_screen = r_comoving * scale;
            
            // Center position on screen
            const sx = cx + center.x * scale;
            const sy = cy + center.y * scale;
            
            // Galaxy position
            x = sx + r_screen * Math.cos(g.angle);
            y = sy + r_screen * Math.sin(g.angle);
        }
        
        // Draw galaxy
        const size = 1.5 * scale * g.sizeVar; 
        const drawSize = Math.max(1.2, size);
        
        ctx.fillStyle = `rgba(${g.color}, ${opacity * (0.6 + Math.random() * 0.4)})`;
        
        ctx.beginPath();
        if (g.eccentricity < 0.8 && drawSize > 2) {
            // Draw ellipse for larger, inclined galaxies
            ctx.ellipse(x, y, drawSize, drawSize * g.eccentricity, g.rotation, 0, Math.PI * 2);
        } else {
            // Draw circle for small or face-on galaxies
            ctx.arc(x, y, drawSize, 0, Math.PI * 2);
        }
        ctx.fill();
    });
    
    ctx.globalAlpha = 1.0;
}

function drawBAO(x, y, scale, growth, horizonScale = 1.0) {
    // Safety check for coordinates
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    // Parameters
    const centerRadius = Math.max(0.1, CONFIG.CENTER_RADIUS_BASE * scale);
    const r_vis = Math.max(0.1, CONFIG.COMOVING_RADIUS * scale * horizonScale);
    const shellWidth = Math.max(0.1, CONFIG.RING_WIDTH_BASE * scale); 
    const opacity = Math.max(0, Math.min(1, growth)); 

    // We draw the entire density profile (Center + Ring) as a single radial gradient
    // to simulate a heatmap / diffusion effect.
    
    // The gradient extends far enough to cover the ring + some diffusion
    const maxRadius = r_vis + shellWidth * 2;
    
    try {
        const g = ctx.createRadialGradient(x, y, 0, x, y, maxRadius);
        
        // 1. Central Peak (High Density)
        g.addColorStop(0, `rgba(${CONFIG.CENTER_HOT_COLOR}, ${opacity * 0.9})`);
        g.addColorStop(centerRadius / maxRadius, `rgba(${CONFIG.CENTER_HALO_COLOR}, ${opacity * 0.4})`);
        
        // 2. Gap (Low Density)
        g.addColorStop((r_vis - shellWidth) / maxRadius, `rgba(${CONFIG.RING_BASE_COLOR}, 0.05)`);
        
        // 3. BAO Ring (Overdensity at Sound Horizon)
        // We use a soft peak for the ring
        g.addColorStop(r_vis / maxRadius, `rgba(${CONFIG.RING_GLOW_COLOR}, ${opacity * 0.3})`);
        
        // 4. Falloff
        g.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, maxRadius, 0, Math.PI * 2);
        ctx.fill();
        
    } catch (e) {
        console.error("Error drawing BAO:", e);
    }
}
