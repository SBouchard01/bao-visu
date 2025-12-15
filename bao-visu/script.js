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

const correlationCanvas = document.getElementById('correlation-canvas');
const correlationCtx = correlationCanvas ? correlationCanvas.getContext('2d') : null;

// Controls
const zSlider = document.getElementById('z-slider');
const zVal = document.getElementById('z-val');
const playBtn = document.getElementById('play-btn');
const resetBtn = document.getElementById('reset-btn');
const baoSlider = document.getElementById('bao-slider');
const baoVal = document.getElementById('bao-val');
const galaxyDensitySlider = document.getElementById('galaxy-density-slider');
const galaxyNumberVal = document.getElementById('galaxy-number-val');
const gravitySlider = document.getElementById('gravity-slider');
const gravityVal = document.getElementById('gravity-val');
const shuffleBtn = document.getElementById('shuffle-btn');

// Sidebar & Layout Controls
const sidebar = document.getElementById('sidebar');
const sidebarLogoBtn = document.getElementById('sidebar-logo-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const sidebarPlayBtn = document.getElementById('sidebar-play-btn');
const sidebarResetBtn = document.getElementById('sidebar-reset-btn');
const sidebarDensityBtn = document.getElementById('sidebar-density-btn');
const sidebarGalaxiesBtn = document.getElementById('sidebar-galaxies-btn');
// const sidebarHeatmapBtn = document.getElementById('sidebar-heatmap-btn'); // Already defined below
const sidebarHorizonBtn = document.getElementById('sidebar-horizon-btn');
const sidebarPlotBtn = document.getElementById('sidebar-plot-btn');
const settingsPanel = document.getElementById('settings-panel');

// Layer Controls
const layerDensityToggle = document.getElementById('layer-density-toggle');
const layerGalaxiesToggle = document.getElementById('layer-galaxies-toggle');
const layerHeatmapToggle = document.getElementById('layer-heatmap-toggle');
const layerHorizonToggle = document.getElementById('layer-horizon-toggle');
const layerPlotToggle = document.getElementById('layer-plot-toggle');
const correlationContainer = document.getElementById('correlation-container');
const closePlotBtn = document.getElementById('close-plot-btn');

// Reference Frame Controls
const framePhysicalBtn = document.getElementById('frame-physical-btn');
const frameComovingBtn = document.getElementById('frame-comoving-btn');

// RSD Controls
const viewRealBtn = document.getElementById('view-real-btn');
const viewRsdBtn = document.getElementById('view-rsd-btn');
const sidebarRsdBtn = document.getElementById('sidebar-rsd-btn');

// Galaxy Render Mode Controls (Removed)
// const renderPointsBtn = document.getElementById('render-points-btn');
// const renderHeatmapBtn = document.getElementById('render-heatmap-btn');
const sidebarHeatmapBtn = document.getElementById('sidebar-heatmap-btn');

// Cosmology Controls
const omegamSlider = document.getElementById('omegam-slider');
const omegamVal = document.getElementById('omegam-val');
const omegalSlider = document.getElementById('omegal-slider');
const omegalVal = document.getElementById('omegal-val');
const flatToggle = document.getElementById('flat-toggle');

// Dev Controls
const devToolsBox = document.getElementById('dev-tools-box');
const devTransitionToggle = document.getElementById('dev-transition-toggle');
const devBorderToggle = document.getElementById('dev-border-toggle');
// const devHeatmapToggle = document.getElementById('dev-heatmap-toggle'); // Removed
const devFps = document.getElementById('dev-fps');
const devObjCount = document.getElementById('dev-obj-count');
const devPixelSizeSlider = document.getElementById('dev-pixel-size-slider');
const devPixelSizeVal = document.getElementById('dev-pixel-size-val');

// --- Configuration ---
const CONFIG = {
    // Physics & Cosmology
    COMOVING_RADIUS: 150,      
    EXPANSION_DAMPING: 0.6,
    GRAVITY_STRENGTH: 0.2, // Strength of structure formation (0 to 1)
    DEFAULT_COMOVING_Z: 5.0, // Reference redshift for comoving scale
    
    // Animation
    TIME_SPEED: 0.005, // Adjusted for Friedmann evolution
    
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
    
    // Heatmap
    HEATMAP_PIXEL_SIZE: 4
};

// Icons
const ICON_POINTS = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)"/></svg>`;
const ICON_HEATMAP = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path></svg>`;

const state = {
    z: 5.0,
    a: 1/6, // a = 1/(1+z)
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
    // renderMode: 'points', // Removed in favor of separate toggles
    
    // Cosmology
    omega_m: 0.3,
    omega_lambda: 0.7,
    omega_r: 8.4e-5, // Radiation density (approx)
    isFlat: true,
    
    // Dev State
    devMode: false,
    showTransition: true,
    showTileBorder: false,
    showHeatmapLayer: true
};

function init() {
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    
    // Check Dev Mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') === 'true') {
        state.devMode = true;
        if (devToolsBox) devToolsBox.style.display = 'flex';
    }
    
    // Dev Listeners
    if (devTransitionToggle) {
        devTransitionToggle.addEventListener('change', (e) => {
            state.showTransition = e.target.checked;
            draw();
        });
    }
    if (devBorderToggle) {
        devBorderToggle.addEventListener('change', (e) => {
            state.showTileBorder = e.target.checked;
            draw();
        });
    }

    // Ctrl+D Shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            state.devMode = !state.devMode;
            if (devToolsBox) {
                devToolsBox.style.display = state.devMode ? 'flex' : 'none';
            }
            draw();
        }
    });
    
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
    const toggleHeatmap = () => {
        state.showHeatmap = !state.showHeatmap;
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

    if (layerHeatmapToggle) layerHeatmapToggle.addEventListener('change', (e) => {
        state.showHeatmap = e.target.checked;
        updateLayerUI();
        draw();
    });
    if (sidebarHeatmapBtn) sidebarHeatmapBtn.addEventListener('click', toggleHeatmap);

    if (layerHorizonToggle) layerHorizonToggle.addEventListener('change', (e) => {
        state.showHorizon = e.target.checked;
        updateLayerUI();
        draw();
    });
    
    const toggleHorizon = () => {
        state.showHorizon = !state.showHorizon;
        updateLayerUI();
        draw();
    };
    if (sidebarHorizonBtn) sidebarHorizonBtn.addEventListener('click', toggleHorizon);

    // Plot Toggle
    const togglePlot = (show) => {
        state.showPlot = show;
        
        if (show) {
            // Opening with animation (Reverse of closing)
            if (sidebarPlotBtn && correlationContainer) {
                // 1. Ensure it's visible but in the "closed" state (at button position)
                correlationContainer.classList.remove('hidden');
                
                // We need to calculate where it SHOULD be naturally to know the delta
                // But since it's fixed position top:20, left:20, we know its target.
                // However, to be safe, we can let the browser layout it, then apply the transform.
                
                const plotRect = correlationContainer.getBoundingClientRect();
                const btnRect = sidebarPlotBtn.getBoundingClientRect();
                
                const plotCenterX = plotRect.left + plotRect.width / 2;
                const plotCenterY = plotRect.top + plotRect.height / 2;
                const btnCenterX = btnRect.left + btnRect.width / 2;
                const btnCenterY = btnRect.top + btnRect.height / 2;
                
                const dx = btnCenterX - plotCenterX;
                const dy = btnCenterY - plotCenterY;
                
                // Set start state (at button)
                correlationContainer.style.transition = 'none'; // Disable transition for instant setup
                correlationContainer.style.transform = `translate(${dx}px, ${dy}px) scale(0.1)`;
                correlationContainer.style.opacity = '0';
                
                // Force reflow
                correlationContainer.offsetHeight;
                
                // Animate to end state (natural position)
                correlationContainer.classList.add('collapsing'); // Re-use transition class
                correlationContainer.style.transition = ''; // Re-enable CSS transition
                correlationContainer.style.transform = '';
                correlationContainer.style.opacity = '1';
                
                // Cleanup class after animation
                setTimeout(() => {
                    correlationContainer.classList.remove('collapsing');
                }, 500);
            } else {
                correlationContainer.classList.remove('hidden');
            }
            
            if (layerPlotToggle) layerPlotToggle.checked = true;
            if (sidebarPlotBtn) sidebarPlotBtn.classList.add('inactive');
        } else {
            // Closing with animation
            if (sidebarPlotBtn && correlationContainer && !correlationContainer.classList.contains('hidden')) {
                const plotRect = correlationContainer.getBoundingClientRect();
                const btnRect = sidebarPlotBtn.getBoundingClientRect();
                
                // Calculate center points
                const plotCenterX = plotRect.left + plotRect.width / 2;
                const plotCenterY = plotRect.top + plotRect.height / 2;
                const btnCenterX = btnRect.left + btnRect.width / 2;
                const btnCenterY = btnRect.top + btnRect.height / 2;
                
                const dx = btnCenterX - plotCenterX;
                const dy = btnCenterY - plotCenterY;
                
                correlationContainer.classList.add('collapsing');
                correlationContainer.style.transform = `translate(${dx}px, ${dy}px) scale(0.1)`;
                correlationContainer.style.opacity = '0';
                
                // After animation, hide it properly
                setTimeout(() => {
                    if (!state.showPlot) { // Check if still closed
                        correlationContainer.classList.add('hidden');
                        correlationContainer.classList.remove('collapsing');
                        correlationContainer.style.transform = '';
                        correlationContainer.style.opacity = '';
                    }
                }, 500); // Match CSS transition time
            } else {
                correlationContainer.classList.add('hidden');
            }
            
            if (layerPlotToggle) layerPlotToggle.checked = false;
            if (sidebarPlotBtn) sidebarPlotBtn.classList.remove('inactive');
        }
        draw();
    };

    // Initialize button state
    if (state.showPlot && sidebarPlotBtn) {
        sidebarPlotBtn.classList.add('inactive');
    }

    // --- Global Tooltip Logic ---
    const globalTooltip = document.getElementById('global-tooltip');
    const infoIcons = document.querySelectorAll('.info-icon');

    if (globalTooltip) {
        infoIcons.forEach(icon => {
            const tooltipText = icon.querySelector('.tooltip')?.textContent;
            if (!tooltipText) return;

            icon.addEventListener('mouseenter', () => {
                globalTooltip.textContent = tooltipText;
                globalTooltip.classList.add('visible');
            });

            icon.addEventListener('mousemove', (e) => {
                // Position tooltip near mouse, but ensure it doesn't go off screen
                const offset = 15;
                let x = e.clientX + offset;
                let y = e.clientY + offset;
                
                // Check boundaries
                const tooltipRect = globalTooltip.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // Right edge check
                if (x + tooltipRect.width > viewportWidth) {
                    x = e.clientX - tooltipRect.width - offset;
                }

                // Bottom edge check
                if (y + tooltipRect.height > viewportHeight) {
                    y = e.clientY - tooltipRect.height - offset;
                }
                
                globalTooltip.style.left = x + 'px';
                globalTooltip.style.top = y + 'px';
            });

            icon.addEventListener('mouseleave', () => {
                globalTooltip.classList.remove('visible');
            });
        });
    }

    if (layerPlotToggle) layerPlotToggle.addEventListener('change', (e) => {
        togglePlot(e.target.checked);
    });
    if (closePlotBtn) closePlotBtn.addEventListener('click', () => {
        togglePlot(false);
    });
    if (sidebarPlotBtn) sidebarPlotBtn.addEventListener('click', () => {
        togglePlot(true);
    });

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
            // RTL Slider: Min(0)=Right, Max(3.04)=Left
            // Logarithmic mapping: z = 10^val - 1
            const val = parseFloat(e.target.value);
            state.z = Math.pow(10, val) - 1;
            if (state.z < 0) state.z = 0;
            
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

    if (gravitySlider) {
        gravitySlider.addEventListener('input', (e) => {
            CONFIG.GRAVITY_STRENGTH = parseFloat(e.target.value);
            updateUI();
            draw();
        });
    }
    
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            shuffleCenters();
            draw();
        });
    }

    // Reference Frame Listeners
    if (framePhysicalBtn && frameComovingBtn) {
        framePhysicalBtn.addEventListener('click', () => {
            state.isComoving = false;
            updateFrameUI();
            draw();
        });
        frameComovingBtn.addEventListener('click', () => {
            state.isComoving = true;
            updateFrameUI();
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


    
    // Reset All Button
    const resetAllBtn = document.getElementById('reset-all-btn');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', resetAllSettings);
    }

    // Cosmology Presets

    // Cosmology Presets
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const m = parseFloat(btn.dataset.m);
            const l = parseFloat(btn.dataset.l);
            
            state.omega_m = m;
            state.omega_lambda = l;
            
            // Check if flat (tolerance for floating point)
            const isFlat = Math.abs((m + l) - 1.0) < 0.01;
            state.isFlat = isFlat;
            if (flatToggle) flatToggle.checked = isFlat;
            
            updateUI();
            draw();
        });
    });
    
    // RSD Listeners
    const setRSD = (enabled) => {
        state.showRSD = enabled;
        updateUI();
        draw();
    };
    
    if (viewRealBtn) viewRealBtn.addEventListener('click', () => setRSD(false));
    if (viewRsdBtn) viewRsdBtn.addEventListener('click', () => setRSD(true));
    if (sidebarRsdBtn) sidebarRsdBtn.addEventListener('click', () => setRSD(!state.showRSD));

    updateUI();
    draw();
    console.log("Initialization complete");
}

function resetAllSettings() {
    // Reset State
    state.z = 5.0;
    state.playing = false;
    state.baoCount = 1;
    state.showDensity = true;
    state.showGalaxies = true;
    state.showHorizon = false;
    state.showPlot = true;
    state.galaxyDensity = 1.0;
    state.isComoving = false;
    state.showRSD = false;
    state.showHeatmap = false;
    state.heatmapMaxDensity = 0; // Reset smoothed density
    state.omega_m = 0.3;
    state.omega_lambda = 0.7;
    state.isFlat = true;
    
    // Reset Config
    CONFIG.GRAVITY_STRENGTH = 0.2;
    
    // Update Physics
    updatePhysicsStateFromZ(state.z);
    
    // Regenerate
    shuffleCenters();
    
    // Update UI
    updatePlayButtons();
    updateUI();
    draw();
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
    
    // Apply density multiplier
    const density = state.galaxyDensity || 1.0;
    
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
    
    // Update Universe Size to cover screen at z=5
    // At z=5, a = 1/6. a_vis = (1/6)^(1-0.6) = (1/6)^0.4 approx 0.48
    const z_ref = 5.0;
    const a_ref = 1 / (1 + z_ref);
    const a_vis_ref = Math.pow(a_ref, 1 - CONFIG.EXPANSION_DAMPING);
    
    // We want UNIVERSE_SIZE * a_vis_ref >= max(w, h)
    const minSize = Math.max(canvas.width, canvas.height) / a_vis_ref;
    CONFIG.UNIVERSE_SIZE = minSize;
    
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
    // If we are at the end of the simulation (z ~ 0), restart from z=5 (Default start)
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
    if (layerHeatmapToggle) layerHeatmapToggle.checked = state.showHeatmap;
    if (layerHorizonToggle) layerHorizonToggle.checked = state.showHorizon;
    if (layerPlotToggle) layerPlotToggle.checked = state.showPlot;
    
    if (sidebarDensityBtn) {
        if (state.showDensity) sidebarDensityBtn.classList.add('active');
        else sidebarDensityBtn.classList.remove('active');
    }
    
    if (sidebarGalaxiesBtn) {
        if (state.showGalaxies) sidebarGalaxiesBtn.classList.add('active');
        else sidebarGalaxiesBtn.classList.remove('active');
    }

    if (sidebarHeatmapBtn) {
        if (state.showHeatmap) sidebarHeatmapBtn.classList.add('active');
        else sidebarHeatmapBtn.classList.remove('active');
    }

    if (sidebarHorizonBtn) {
        if (state.showHorizon) sidebarHorizonBtn.classList.add('active');
        else sidebarHorizonBtn.classList.remove('active');
    }

    if (sidebarPlotBtn) {
        if (state.showPlot) sidebarPlotBtn.classList.add('active');
        else sidebarPlotBtn.classList.remove('active');
    }

    // Update Plot Container Visibility
    if (correlationContainer) {
        if (state.showPlot) {
            correlationContainer.classList.remove('hidden');
        } else {
            correlationContainer.classList.add('hidden');
        }
    }
}

function updateFrameUI() {
    if (framePhysicalBtn && frameComovingBtn) {
        if (state.isComoving) {
            framePhysicalBtn.classList.remove('active');
            frameComovingBtn.classList.add('active');
        } else {
            framePhysicalBtn.classList.add('active');
            frameComovingBtn.classList.remove('active');
        }
    }
}

function updateViewUI() {
    if (viewRealBtn && viewRsdBtn) {
        if (state.showRSD) {
            viewRealBtn.classList.remove('active');
            viewRsdBtn.classList.add('active');
        } else {
            viewRealBtn.classList.add('active');
            viewRsdBtn.classList.remove('active');
        }
    }
    
    if (sidebarRsdBtn) {
        if (state.showRSD) sidebarRsdBtn.classList.add('active');
        else sidebarRsdBtn.classList.remove('active');
    }
}



function updateUI() {
    updateLayerUI();
    updateFrameUI();
    updateViewUI();
    if (zVal) {
        // Avoid overflow for large z
        if (state.z > 10) {
            zVal.textContent = Math.round(state.z);
        } else {
            zVal.textContent = state.z.toFixed(2);
        }
    }
    if (zSlider) {
        // Logarithmic mapping for RTL slider
        // z = 10^val - 1  =>  val = log10(z + 1)
        zSlider.value = Math.log10(state.z + 1);
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
            if (devObjCount) devObjCount.textContent = state.galaxies.length;
        } else {
            galaxyNumberVal.textContent = "0";
            if (devObjCount) devObjCount.textContent = "0";
        }
    }
    if (galaxyDensitySlider) updateSliderFill(galaxyDensitySlider);

    if (gravityVal) gravityVal.textContent = CONFIG.GRAVITY_STRENGTH.toFixed(1);
    if (gravitySlider) {
        gravitySlider.value = CONFIG.GRAVITY_STRENGTH;
        updateSliderFill(gravitySlider);
    }
    
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
    
    // For RTL slider, we want fill from Right (0%) to Left (100%)
    // But standard slider fills Left to Right.
    // We use background-size to simulate fill.
    
    // Standard calculation:
    let percentage = ((val - min) / (max - min)) * 100;
    
    if (slider.classList.contains('slider-rtl')) {
        // RTL Logic:
        // If min=0 (Right), max=3 (Left).
        // Value 0 -> 0% fill (from right).
        // Value 3 -> 100% fill.
        // CSS background-position: right center.
        // So width should be percentage.
        if (slider.id === 'z-slider') {
            // Special case for z-slider which has 3 background layers
            // Layer 1: Fill (percentage width)
            // Layer 2: Std Track (25.6% width)
            // Layer 3: Opt Track (74.4% width)
            slider.style.backgroundSize = `${percentage}% 100%, 25.6% 100%, 74.4% 100%`;
        } else {
            slider.style.backgroundSize = percentage + '% 100%';
        }
    } else {
        slider.style.backgroundSize = percentage + '% 100%';
    }
}

function loop(timestamp) {
    if (!state.playing) return;
    
    const dt = timestamp - state.lastTime;
    state.lastTime = timestamp;
    
    // --- Friedmann Equation Evolution ---
    // H(a) = H0 * sqrt( Om/a^3 + Ol + Or/a^4 + (1-Om-Ol-Or)/a^2 )
    // da/dt = a * H(a)
    // We use normalized units where H0 = 1 (or absorbed into TIME_SPEED)
    
    const a = state.a;
    const Om = state.omega_m;
    const Ol = state.omega_lambda;
    const Or = state.omega_r;
    const Ok = 1 - Om - Ol - Or;
    
    // Avoid division by zero or negative roots
    const E_squared = Om * Math.pow(a, -3) + Ol + Or * Math.pow(a, -4) + Ok * Math.pow(a, -2);
    const E = Math.sqrt(Math.max(0, E_squared));
    
    // da = a * E * dt
    // For visualization purposes, we want the evolution to appear smooth on a logarithmic scale (like the slider).
    // Using the real physical rate (da ~ a*E) makes high-z evolution instantaneous because E is huge.
    // Instead, we use da proportional to 'a' to get exponential growth in linear time (constant log-rate).
    // This decouples animation speed from physical expansion rate, but makes the visualization watchable.
    const da = a * CONFIG.TIME_SPEED * 2.0; // Factor 2.0 to tune speed
    
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

function draw() {
    // FPS Calculation
    const now = performance.now();
    if (state.lastFpsTime === 0) state.lastFpsTime = now;
    const delta = now - state.lastFpsTime;
    state.frameCount++;
    
    if (delta >= 1000) {
        state.fps = Math.round((state.frameCount * 1000) / delta);
        state.frameCount = 0;
        state.lastFpsTime = now;
        if (devFps) devFps.textContent = state.fps;
    }

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
    
    // Comoving Scale Factor (Fixed at DEFAULT_COMOVING_Z scale)
    // This ensures the view covers a reasonable volume without making things too small at high z
    const a_comoving = Math.pow(1/(1 + CONFIG.DEFAULT_COMOVING_Z), 1 - CONFIG.EXPANSION_DAMPING);
    
    // Determine Render Scale based on Reference Frame
    const renderScale = state.isComoving ? a_comoving : a_vis;
    
    // Growth Factor D(z) - Approximation: proportional to scale factor in matter domination
    // For more accuracy we could solve the growth ODE, but a ~ D is fine for visuals
    const growth = calculateGrowthFactor(a_real, state.omega_m, state.omega_lambda);
    
    // --- Rendering ---
    ctx.globalCompositeOperation = 'screen';
    
    // Calculate Sound Horizon Scale Factor based on Omega_m
    // r_s is roughly proportional to (Omega_m * h^2)^-0.25
    // We normalize to Omega_m = 0.3
    const soundHorizonScale = Math.pow(0.3 / Math.max(0.01, state.omega_m), 0.25);
    
    // Calculate RSD Strength (Squashing Factor)
    // Same logic as in drawGalaxies
    const rsdStrength = state.showRSD ? (CONFIG.GRAVITY_STRENGTH * growth * 0.8) : 0;
    // Clamp scale to avoid inversion (min 0.2)
    const rsdScaleY = Math.max(0.2, 1 - rsdStrength);

    // --- Tiling Logic for High-Z ---
    // We render the central tile (simulation box) and copy it to fill the screen.
    // The simulation box size on screen is:
    const boxSize = CONFIG.UNIVERSE_SIZE * renderScale;
    
    // Determine if we need tiling
    const needsTiling = boxSize < Math.max(w, h);
    
    // Transition Logic
    // z=1100 -> Heatmap Layer (Tiled) Visible, Galaxy Layer Hidden
    // z=5 -> Heatmap Layer Hidden, Galaxy Layer Visible
    // Transition range: z=1100 to z=5
    
    let heatmapAlpha = state.showHeatmap ? 1.0 : 0.0;
    let galaxyAlpha = 1.0;

    // Disable transition effects in Comoving Space (fix to z=5 behavior)
    if (state.z > 5.0 && state.showTransition && !state.isComoving) {
        const logZ = Math.log10(state.z);
        const log5 = Math.log10(5.0);
        const log1100 = Math.log10(1100.0);
        
        let t = (logZ - log5) / (log1100 - log5);
        t = Math.max(0, Math.min(1, t));
        
        // Heatmap: Enforced at high z (t=1), respects toggle at low z (t=0)
        // If toggle is ON: 1.0 -> 1.0 (Always 1)
        // If toggle is OFF: 0.0 -> 1.0 (Fades in)
        heatmapAlpha = state.showHeatmap ? 1.0 : t;
        
        // Galaxies/Density: Hidden at high z (t=1), Visible at low z (t=0)
        galaxyAlpha = 1.0 - t;
    }

    // Render the Central Tile Content
    let tileCanvas = null;
    let tileCtx = null;
    
    if (needsTiling) {
        // Create/Resize tile canvas
        if (!state.tileCanvas) {
            state.tileCanvas = document.createElement('canvas');
        }
        tileCanvas = state.tileCanvas;
        
        const size = Math.ceil(boxSize);
        if (tileCanvas.width !== size || tileCanvas.height !== size) {
            tileCanvas.width = size;
            tileCanvas.height = size;
        }
        tileCtx = tileCanvas.getContext('2d');
        
        // Clear Tile
        tileCtx.clearRect(0, 0, size, size);
        
        // 1. Render Heatmap Layer
        if (heatmapAlpha > 0.01) {
            tileCtx.save();
            tileCtx.globalAlpha = heatmapAlpha;
            // Use actual growth for heatmap so it aligns with galaxies and evolves
            drawGalaxies(size/2, size/2, renderScale, growth, soundHorizonScale, tileCtx, boxSize, 'heatmap');
            tileCtx.restore();
        }
        
        // 2. Render Galaxy/Density Layer
        if (galaxyAlpha > 0.01 && (state.showDensity || state.showGalaxies)) {
            tileCtx.save();
            tileCtx.globalAlpha = galaxyAlpha;
            
            if (state.showDensity) {
                for (let i = 0; i < state.baoCount; i++) {
                    const center = state.centers[i];
                    if (!center) continue;
                    const sx = size/2 + center.x * renderScale;
                    const sy = size/2 + center.y * renderScale;
                    drawBAO(sx, sy, renderScale, growth, soundHorizonScale, rsdScaleY, tileCtx, boxSize);
                }
            }
            if (state.showGalaxies) {
                drawGalaxies(size/2, size/2, renderScale, growth, soundHorizonScale, tileCtx, boxSize, 'points');
            }
            
            tileCtx.restore();
        }
        
        // Now tileCanvas contains the composed tile.
        // Copy it to main canvas.
        
        const cols = Math.ceil(w / boxSize) + 2;
        const rows = Math.ceil(h / boxSize) + 2;
        
        // Align center tile with screen center
        const startX = cx - (boxSize / 2) - (Math.floor(cols/2) * boxSize);
        const startY = cy - (boxSize / 2) - (Math.floor(rows/2) * boxSize);
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * boxSize;
                const y = startY + r * boxSize;
                ctx.drawImage(tileCanvas, 0, 0, boxSize, boxSize, x, y, boxSize, boxSize);
            }
        }
        
        // Dev: Show Border
        if (state.devMode && state.showTileBorder) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(cx - boxSize/2, cy - boxSize/2, boxSize, boxSize);
            ctx.setLineDash([]);
        }

    } else {
        // No Tiling needed (Standard View)
        const wrapSize = boxSize;

        if (heatmapAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = heatmapAlpha;
            drawGalaxies(cx, cy, renderScale, growth, soundHorizonScale, ctx, wrapSize, 'heatmap');
            ctx.restore();
        }

        if (galaxyAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = galaxyAlpha;
            
            if (state.showDensity) {
                for (let i = 0; i < state.baoCount; i++) {
                    const center = state.centers[i];
                    if (!center) continue;
                    const sx = cx + center.x * renderScale;
                    const sy = cy + center.y * renderScale;
                    drawBAO(sx, sy, renderScale, growth, soundHorizonScale, rsdScaleY, ctx, wrapSize);
                }
            }

            if (state.showGalaxies) {
                drawGalaxies(cx, cy, renderScale, growth, soundHorizonScale, ctx, wrapSize, 'points');
            }
            ctx.restore();
        }
    }
    
    // Draw Theoretical Sound Horizon (Overlay)
    if (state.showHorizon) {
        // We draw it around the central peak (index 0) which is always at (cx, cy)
        // Radius = r_s * scale
        // r_s = CONFIG.COMOVING_RADIUS * soundHorizonScale
        const r_horizon = CONFIG.COMOVING_RADIUS * soundHorizonScale * renderScale;
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]); // Dashed line
        
        if (state.showRSD) {
            // Draw Ellipse if RSD is on
            ctx.ellipse(cx, cy, r_horizon, r_horizon * rsdScaleY, 0, 0, Math.PI * 2);
        } else {
            ctx.arc(cx, cy, r_horizon, 0, Math.PI * 2);
        }
        
        ctx.stroke();
        ctx.setLineDash([]); // Reset
        
        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '12px sans-serif';
        ctx.fillText("Sound Horizon (rs)", cx + r_horizon + 5, cy);
    }

    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';

    // --- Elliptic Mask for CMB View ---
    // Disable mask in Comoving Space
    if (state.z > 5.0 && state.showTransition && !state.isComoving) {
        const logZ = Math.log10(state.z);
        const log5 = Math.log10(5.0);
        const log1100 = Math.log10(1100.0);
        
        let t = (logZ - log5) / (log1100 - log5);
        t = Math.max(0, Math.min(1, t));
        
        // Interpolate Mask Size
        // At t=0 (z=5): Full screen (effectively infinite mask)
        // At t=1 (z=1100): Ellipse fitting the screen
        
        // Target Ellipse (Mollweide-ish aspect ratio 2:1)
        const targetRx = w * 0.45; // 90% of width
        const targetRy = targetRx * 0.5;
        
        // Start Ellipse (Large enough to cover screen with 2:1 ratio)
        // Ellipse equation: x^2/(2Ry)^2 + y^2/Ry^2 = 1
        // We need to cover the corner (w/2, h/2)
        // (w/2)^2 / 4Ry^2 + (h/2)^2 / Ry^2 <= 1
        // Ry >= sqrt(w^2/16 + h^2/4)
        const startRy = Math.hypot(w/4, h/2) * 1.2; // Add 20% margin
        const startRx = startRy * 2;
        
        const currentRy = startRy + (targetRy - startRy) * t;
        const currentRx = currentRy * 2;
        
        // Apply Mask
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.ellipse(cx, cy, currentRx, currentRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    // --- Info Overlay ---
    ctx.fillStyle = '#555';
    ctx.font = '12px monospace';
    
    // Calculate Hubble Parameter H(z) / H0
    // E(z) = sqrt(Om(1+z)^3 + Ol + Or(1+z)^4 + Ok(1+z)^2)
    const Om = state.omega_m;
    const Ol = state.omega_lambda;
    const Or = state.omega_r;
    const Ok = 1 - Om - Ol - Or;
    const zp1 = 1 + state.z;
    const E = Math.sqrt(Math.max(0, Om * Math.pow(zp1, 3) + Ol + Or * Math.pow(zp1, 4) + Ok * Math.pow(zp1, 2)));
    
    // Approximate Age (very rough, just for display)
    // t ~ 1/H0 * integral... let's just show normalized time t
    // Or better: "Expansion Rate H(z): X H0"
    
    const zDisplay = state.z > 10 ? Math.round(state.z) : state.z.toFixed(2);
    ctx.fillText(`z = ${zDisplay}`, 20, h - 60);
    ctx.fillText(`Expansion Rate H(z) = ${E.toFixed(2)} H₀`, 20, h - 40);
    ctx.fillText(`Scale Factor a = ${a_real.toFixed(5)}`, 20, h - 20);

    // Update Correlation Plot
    if (state.showPlot) {
        updateCorrelationPlot(growth, soundHorizonScale);
    }
}

function updateCorrelationPlot(growth, horizonScale) {
    if (!correlationCtx || !state.galaxies) return;
    
    const w = correlationCanvas.width;
    const h = correlationCanvas.height;
    
    // Clear
    correlationCtx.clearRect(0, 0, w, h);
    
    // Parameters
    const maxDist = CONFIG.COMOVING_RADIUS * 2.0; // Plot up to 2x sound horizon
    const binCount = 50;
    const binSize = maxDist / binCount;
    const bins = new Array(binCount).fill(0);
    
    // Expansion Factor for Physical Frame
    // If in Comoving frame, we ignore expansion (factor = 1.0)
    // If in Physical frame, distances scale with a(t)
    const expansionFactor = state.isComoving ? 1.0 : state.a;

    // Calculate distances from galaxies to their centers
    // We use the same logic as drawGalaxies to get the current "physical" (but scaled back to comoving) position
    const r_s = CONFIG.COMOVING_RADIUS * horizonScale;
    const gravityFactor = 1 - (CONFIG.GRAVITY_STRENGTH * growth);
    const effectiveGravity = Math.max(0.2, gravityFactor);
    
    let totalCount = 0;
    
    state.galaxies.forEach(g => {
        if (g.type === 'background') return; // Skip background for this specific "Stacked" plot to see the signal clearly
        if (g.centerIndex >= state.baoCount) return;
        
        // Calculate current radial distance from center (Comoving)
        const currentOffsetR = g.offsetR * effectiveGravity;
        const r_comoving = (g.r_base * r_s) + currentOffsetR;
        
        // Apply Expansion if needed
        const r_plot = r_comoving * expansionFactor;
        
        // Binning
        if (r_plot < maxDist) {
            const binIndex = Math.floor(r_plot / binSize);
            if (binIndex >= 0 && binIndex < binCount) {
                bins[binIndex]++;
                totalCount++;
            }
        }
    });
    
    // Normalize by shell area (2 * pi * r * dr) to get density
    // If we don't normalize, we just see N(r) which increases with r linearly for uniform distribution
    const density = bins.map((count, i) => {
        const r = (i + 0.5) * binSize;
        const area = 2 * Math.PI * r * binSize;
        return count / area;
    });
    
    // Find max density for scaling (ignore first bin which is the central peak)
    let maxDensity = 0;
    for (let i = 2; i < binCount; i++) {
        if (density[i] > maxDensity) maxDensity = density[i];
    }
    if (maxDensity === 0) maxDensity = 1;
    
    // Margins for axes
    const marginLeft = 20;
    const marginBottom = 20;
    const axisPadding = 2; // Padding between curve and axis
    const plotW = w - marginLeft;
    const plotH = h - marginBottom - axisPadding;

    // Draw Axes
    correlationCtx.beginPath();
    correlationCtx.strokeStyle = '#666';
    correlationCtx.lineWidth = 1.5;
    
    // Y-Axis
    correlationCtx.moveTo(marginLeft, h - marginBottom); // Start at bottom
    correlationCtx.lineTo(marginLeft, 0); // Draw to top
    // Y-Axis Arrow
    correlationCtx.moveTo(marginLeft, 0);
    correlationCtx.lineTo(marginLeft - 3, 5);
    correlationCtx.moveTo(marginLeft, 0);
    correlationCtx.lineTo(marginLeft + 3, 5);

    // X-Axis
    correlationCtx.moveTo(marginLeft, h - marginBottom);
    correlationCtx.lineTo(w, h - marginBottom);
    // X-Axis Arrow
    correlationCtx.moveTo(w, h - marginBottom);
    correlationCtx.lineTo(w - 5, h - marginBottom - 3);
    correlationCtx.moveTo(w, h - marginBottom);
    correlationCtx.lineTo(w - 5, h - marginBottom + 3);
    
    correlationCtx.stroke();

    // Draw X-Axis Graduations
    correlationCtx.fillStyle = '#888';
    correlationCtx.font = '9px monospace';
    correlationCtx.textAlign = 'center';
    correlationCtx.textBaseline = 'top';

    const tickInterval = 50;
    for (let r = 50; r < maxDist; r += tickInterval) {
        const x = marginLeft + (r / maxDist) * plotW;
        
        // Tick mark
        correlationCtx.beginPath();
        correlationCtx.moveTo(x, h - marginBottom);
        correlationCtx.lineTo(x, h - marginBottom + 4);
        correlationCtx.stroke();
        
        // Label
        // Highlight 150
        if (r === 150) {
            correlationCtx.fillStyle = '#4cc9f0';
            correlationCtx.font = 'bold 10px monospace';
        } else {
            correlationCtx.fillStyle = '#888';
            correlationCtx.font = '9px monospace';
        }
        correlationCtx.fillText(r, x, h - marginBottom + 6);
    }
    // Reset style
    correlationCtx.strokeStyle = '#4cc9f0';

    // Draw Plot Curve
    correlationCtx.beginPath();
    correlationCtx.strokeStyle = '#4cc9f0';
    correlationCtx.lineWidth = 1;
    
    for (let i = 0; i < binCount; i++) {
        const x = marginLeft + (i / binCount) * plotW;
        // Scale y: 0 at bottom, maxDensity at top (with some padding)
        // We clamp the central peak so it doesn't squash the rest
        const val = Math.min(density[i], maxDensity * 1.5); 
        const y = (h - marginBottom - axisPadding) - (val / (maxDensity * 1.2)) * plotH;
        
        if (i === 0) correlationCtx.moveTo(x, y);
        else correlationCtx.lineTo(x, y);
    }
    correlationCtx.stroke();
    
    // Draw Sound Horizon Marker
    // The marker should also move in Physical frame
    const r_s_plot = r_s * expansionFactor;
    const x_s = marginLeft + (r_s_plot / maxDist) * plotW;

    if (x_s < w) {
        correlationCtx.beginPath();
        correlationCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        correlationCtx.setLineDash([4, 4]);
        correlationCtx.moveTo(x_s, 0);
        correlationCtx.lineTo(x_s, h - marginBottom - axisPadding);
        correlationCtx.stroke();
        correlationCtx.setLineDash([]);
        
        // Labels
        correlationCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        correlationCtx.font = '10px sans-serif';
        correlationCtx.fillText('r_s', x_s + 4, 12);
    }
    
    // Axis Names
    correlationCtx.fillStyle = '#aaa';
    correlationCtx.font = 'italic 12px serif';
    correlationCtx.fillText('ξ(r)', 0, 12); // Y-axis label
    correlationCtx.fillText('r', w - 10, h - 5); // X-axis label
}

function getHeatmapSprite(colorStr) {
    if (heatmapSprites[colorStr]) return heatmapSprites[colorStr];

    // Create new sprite
    const size = 64; // Power of 2
    const half = size / 2;
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = size;
    spriteCanvas.height = size;
    const sCtx = spriteCanvas.getContext('2d');

    // Draw gradient
    const grad = sCtx.createRadialGradient(half, half, 0, half, half, half);
    // Core: More opaque to define structure
    grad.addColorStop(0, `rgba(${colorStr}, 0.4)`);
    // Mid: Soft falloff
    grad.addColorStop(0.4, `rgba(${colorStr}, 0.1)`);
    // Edge: Fade out
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    sCtx.fillStyle = grad;
    sCtx.beginPath();
    sCtx.arc(half, half, half, 0, Math.PI * 2);
    sCtx.fill();

    heatmapSprites[colorStr] = spriteCanvas;
    return spriteCanvas;
}

function drawGalaxies(cx, cy, scale, growth, horizonScale, targetCtx = ctx, wrapSize = 0, renderType = 'points') {
    if (!state.galaxies || state.galaxies.length === 0) return;
    
    targetCtx.save();

    // Galaxy brightness increases with growth (structure formation)
    // In Comoving frame, we want max luminosity by default to avoid the "glowing increase" effect.
    const opacity = state.isComoving ? 1.0 : Math.max(0.4, Math.min(1, growth + 0.2));
    
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
            
            // Gravity Effect (Zeldovich-like sharpening)
            // As structure grows (growth increases), galaxies fall towards the density peaks.
            // This reduces the scatter (offsetR) over time.
            const gravityFactor = 1 - (CONFIG.GRAVITY_STRENGTH * growth);
            const effectiveGravity = Math.max(0.2, gravityFactor); // Clamp to avoid collapse
            
            const currentOffsetR = g.offsetR * effectiveGravity;
            const r_comoving = (g.r_base * r_s) + currentOffsetR;
            
            // Convert to screen coordinates
            const r_screen = r_comoving * scale;
            
            // Center position on screen
            const sx = cx + center.x * scale;
            const sy = cy + center.y * scale;
            
            // Galaxy position (Real Space)
            let gx = sx + r_screen * Math.cos(g.angle);
            let gy = sy + r_screen * Math.sin(g.angle);

            // --- Redshift Space Distortions (RSD) ---
            if (state.showRSD) {
                // Simple model: Infall velocity towards cluster center
                // We assume Line of Sight (LoS) is the Y-axis (observer at bottom)
                
                // 1. Calculate velocity vector (infall)
                // Direction is towards center: -radial vector
                // Magnitude proportional to growth rate (f) and gravity strength
                // v ~ f * gravity * r (linear theory) or just infall
                
                // For visual simplicity:
                // Shift is proportional to the Y-component of the distance to center
                // dy = y_galaxy - y_center
                // v_y_infall = -dy * strength
                
                const dy = gy - sy;
                
                // Strength factor:
                // - Increases with gravity strength
                // - Increases with growth factor (structure formation)
                // - Kaiser effect (squashing) on large scales
                // - Fingers of God (elongation) on small scales (random virial motion)
                
                // Let's implement a "Kaiser-like" squashing for the ring
                // Infall means galaxies move closer to center in Y-direction
                // Apparent position Y' = Y + v_y / H
                // If v_y is negative (falling down towards center), Y decreases.
                
                // We use a simplified shift:
                // shift = -dy * factor
                // If factor > 0, this pulls galaxies towards the center Y-line (Squashing)
                
                const rsdStrength = CONFIG.GRAVITY_STRENGTH * growth * 0.8;
                // Clamp scale to avoid inversion (min 0.2)
                gy = sy + dy * Math.max(0.2, 1 - rsdStrength); 
                
                // Add some random "Fingers of God" noise for the central cluster
                if (g.r_base === 0) { // Central cluster
                     const fog = g.fogFactor * 20 * growth;
                     gy += fog;
                }
            }
            
            x = gx;
            y = gy;
        }
        
        // Normalize position if wrapping
        if (wrapSize > 0) {
            x = ((x % wrapSize) + wrapSize) % wrapSize;
            y = ((y % wrapSize) + wrapSize) % wrapSize;
        }

        // Draw galaxy
        if (renderType === 'heatmap') {
             // Heatmap Mode: Accumulate in grid (handled in batch below)
             // We just store the position for the grid renderer
             
             // We need to store transformed positions to render the heatmap at the end
             if (!state.heatmapPositions) state.heatmapPositions = [];
             
             const pushPos = (px, py) => {
                 state.heatmapPositions.push({x: px, y: py});
             };
             
             pushPos(x, y);
             
        } else {
            // Standard Point Mode
            const size = 1.5 * scale * g.sizeVar; 
            const drawSize = Math.max(1.2, size);
            const radius = drawSize / 2;
            
            targetCtx.fillStyle = `rgba(${g.color}, ${opacity * (0.6 + Math.random() * 0.4)})`;
            
            const drawSingle = (tx, ty) => {
                targetCtx.beginPath();
                if (g.eccentricity < 0.8 && drawSize > 2) {
                    // Draw ellipse for larger, inclined galaxies
                    targetCtx.ellipse(tx, ty, drawSize, drawSize * g.eccentricity, g.rotation, 0, Math.PI * 2);
                } else {
                    // Draw circle for small or face-on galaxies
                    targetCtx.arc(tx, ty, drawSize, 0, Math.PI * 2);
                }
                targetCtx.fill();
            };
            
            drawSingle(x, y);
            
            // Wrap for points
            if (wrapSize > 0) {
                const xOffsets = [0];
                if (x < radius) xOffsets.push(wrapSize);
                if (x > wrapSize - radius) xOffsets.push(-wrapSize);
                
                const yOffsets = [0];
                if (y < radius) yOffsets.push(wrapSize);
                if (y > wrapSize - radius) yOffsets.push(-wrapSize);
                
                xOffsets.forEach(ox => {
                    yOffsets.forEach(oy => {
                        if (ox === 0 && oy === 0) return;
                        drawSingle(x + ox, y + oy);
                    });
                });
            }
        }
    });
    
    // Render Heatmap if needed
    if (renderType === 'heatmap' && state.heatmapPositions) {
        renderHeatmapGrid(state.heatmapPositions, targetCtx, wrapSize);
        state.heatmapPositions = []; // Clear
    }
    
    targetCtx.restore();
}

// Offscreen canvas for heatmap generation
const heatmapCanvas = document.createElement('canvas');
const heatmapCtx = heatmapCanvas.getContext('2d');

function renderHeatmapGrid(positions, targetCtx = ctx, wrapSize = 0) {
    if (!positions.length) return;
    
    // Resolution Scaling
    // Dynamic Resolution:
    // - Low Z (Zoomed In): Larger pixels (more smoothing) to avoid "dots"
    // - High Z (Zoomed Out): Smaller pixels (more detail) to avoid "uniformity"
    
    let pSize;
    // In Comoving Space, fix resolution to z=5 behavior (pSize = 4.0)
    const z = Math.max(0.1, state.z);
    
    if (state.isComoving) {
        pSize = 4.0;
    } else {
        // Interpolate 4 -> 0.5 (from z=5 to z=1000)
        const logZ = Math.log10(z);
        const log5 = Math.log10(5.0);
        const log1000 = 3.0; // log10(1000)
        
        const t = Math.max(0, Math.min(1, (logZ - log5) / (log1000 - log5)));
        pSize = 4.0 - t * 3.5;
    }
    
    const targetPixelSize = Math.max(1, pSize);
    
    const w = (wrapSize > 0) ? wrapSize : targetCtx.canvas.width;
    const h = (wrapSize > 0) ? wrapSize : targetCtx.canvas.height;
    
    // Ensure at least 1 column/row
    const cols = Math.max(1, Math.round(w / targetPixelSize));
    const rows = Math.max(1, Math.round(h / targetPixelSize));
    
    const actualPixelSizeX = w / cols;
    const actualPixelSizeY = h / rows;
    
    // 3. Rendering to Padded Offscreen Canvas
    // We add a 1-pixel border of wrapped content to ensure correct interpolation at edges
    const pad = 1;
    const paddedW = cols + 2 * pad;
    const paddedH = rows + 2 * pad;
    
    if (heatmapCanvas.width !== paddedW || heatmapCanvas.height !== paddedH) {
        heatmapCanvas.width = paddedW;
        heatmapCanvas.height = paddedH;
    }
    
    const grid = new Float32Array(cols * rows);
    
    // Helper for periodic index
    const idx = (c, r) => {
        // Wrap c and r
        const wc = ((c % cols) + cols) % cols;
        const wr = ((r % rows) + rows) % rows;
        return wr * cols + wc;
    };

    // 1. Binning with Cloud-in-Cell (CIC) Splatting
    // This distributes point weight to 4 nearest grid centers for smoothness
    for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        
        // Map to grid coordinates
        // We shift by -0.5 so that integer coordinates correspond to cell centers
        let gx = (p.x / actualPixelSizeX) - 0.5;
        let gy = (p.y / actualPixelSizeY) - 0.5;
        
        const c0 = Math.floor(gx);
        const r0 = Math.floor(gy);
        
        const fx = gx - c0;
        const fy = gy - r0;
        
        // Weights
        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;
        
        grid[idx(c0, r0)] += w00;
        grid[idx(c0 + 1, r0)] += w10;
        grid[idx(c0, r0 + 1)] += w01;
        grid[idx(c0 + 1, r0 + 1)] += w11;
    }
    
    // 2. Smoothing (Diffusion)
    // Two passes of 3x3 kernel for smoother results
    let bufferA = grid;
    let bufferB = new Float32Array(cols * rows);
    
    // Pass 1
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            bufferB[i] = (bufferA[i] * 4 + 
                         bufferA[idx(c-1, r)] + bufferA[idx(c+1, r)] + 
                         bufferA[idx(c, r-1)] + bufferA[idx(c, r+1)] +
                         bufferA[idx(c-1, r-1)] + bufferA[idx(c+1, r-1)] +
                         bufferA[idx(c-1, r+1)] + bufferA[idx(c+1, r+1)]) / 12;
        }
    }
    
    // Pass 2 (Swap buffers)
    bufferA = bufferB;
    bufferB = new Float32Array(cols * rows); 
    let maxDensity = 0;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const val = (bufferA[i] * 4 + 
                         bufferA[idx(c-1, r)] + bufferA[idx(c+1, r)] + 
                         bufferA[idx(c, r-1)] + bufferA[idx(c, r+1)] +
                         bufferA[idx(c-1, r-1)] + bufferA[idx(c+1, r-1)] +
                         bufferA[idx(c-1, r+1)] + bufferA[idx(c+1, r+1)]) / 12;
            
            bufferB[i] = val;
            if (val > maxDensity) maxDensity = val;
        }
    }
    
    const smoothed = bufferB;
    
    if (maxDensity === 0) return;

    // Smooth the maxDensity to prevent flickering when galaxy count is low
    // We use a running average to stabilize the normalization factor
    if (!state.heatmapMaxDensity || Math.abs(state.heatmapMaxDensity - maxDensity) > maxDensity * 0.5) {
        // If it's the first run or the change is huge (e.g. density setting changed), adapt quickly
        state.heatmapMaxDensity = maxDensity;
    } else {
        // Otherwise smooth it out
        state.heatmapMaxDensity = state.heatmapMaxDensity * 0.9 + maxDensity * 0.1;
    }
    
    const normMax = state.heatmapMaxDensity;

    const imgData = heatmapCtx.createImageData(paddedW, paddedH);
    const data = imgData.data;
    
    for (let r = 0; r < paddedH; r++) {
        for (let c = 0; c < paddedW; c++) {
            // Map to source grid coords (wrapping)
            const srcC = (c - pad + cols) % cols;
            const srcR = (r - pad + rows) % rows;
            
            const val = smoothed[srcR * cols + srcC];
            
            // Color Map Logic
            // We use a Logarithmic normalization to handle the high dynamic range of the density field.
            // This reveals faint filaments without saturating the clusters too early.
            let red = 0, green = 0, blue = 0, alpha = 0;
            
            if (val >= 0.001) {
                // Logarithmic scaling: log(1 + val) / log(1 + max)
                // We add a small bias to avoid log(0) issues if val is tiny
                const logVal = Math.log(1 + val * 10); 
                const logMax = Math.log(1 + normMax * 10);
                
                const norm = Math.min(1, logVal / logMax);
                
                // Alpha: Smooth fade in
                alpha = Math.min(255, Math.floor(Math.pow(norm, 0.5) * 255 * 1.5));
                
                // Color Ramp (Viridis-like but with Blue->Cyan->Yellow->Red->White)
                // Adjusted to keep clusters distinct (Red/White) and filaments visible (Blue/Cyan)
                if (norm < 0.25) {
                    const t = norm / 0.25;
                    // Deep Blue -> Blue
                    red = 0; green = Math.floor(t * 50); blue = Math.floor(80 + t * 175);
                } else if (norm < 0.5) {
                    const t = (norm - 0.25) / 0.25;
                    // Blue -> Cyan/Green
                    red = 0; green = Math.floor(50 + t * 205); blue = Math.floor(255 - t * 50);
                } else if (norm < 0.75) {
                    const t = (norm - 0.5) / 0.25;
                    // Cyan/Green -> Orange/Red
                    red = Math.floor(t * 255); green = Math.floor(255 - t * 100); blue = Math.floor(205 - t * 205);
                } else {
                    const t = (norm - 0.75) / 0.25;
                    // Orange/Red -> White (Saturation)
                    red = 255; green = Math.floor(155 + t * 100); blue = Math.floor(t * 255);
                }
            }
            
            const idx = (r * paddedW + c) * 4;
            data[idx] = red;
            data[idx+1] = green;
            data[idx+2] = blue;
            data[idx+3] = alpha;
        }
    }
    
    heatmapCtx.putImageData(imgData, 0, 0);
    
    // 4. Draw to Main Canvas (Upscale with smoothing)
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'screen'; // Blend with background
    targetCtx.imageSmoothingEnabled = true;
    targetCtx.imageSmoothingQuality = 'high';
    
    // Draw with negative offset to hide the padding, but allow interpolation to use it
    // We scale the padded canvas (cols+2*pad) to (w + 2*pad*actualPixelSize)
    targetCtx.drawImage(
        heatmapCanvas, 
        -pad * actualPixelSizeX, 
        -pad * actualPixelSizeY, 
        w + 2 * pad * actualPixelSizeX, 
        h + 2 * pad * actualPixelSizeY
    );
    targetCtx.restore();
}

function drawBAO(x, y, scale, growth, horizonScale = 1.0, rsdScaleY = 1.0, targetCtx = ctx, wrapSize = 0) {
    // Safety check for coordinates
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    // Parameters
    const centerRadius = Math.max(0.1, CONFIG.CENTER_RADIUS_BASE * scale);
    const r_vis = Math.max(0.1, CONFIG.COMOVING_RADIUS * scale * horizonScale);
    const shellWidth = Math.max(0.1, CONFIG.RING_WIDTH_BASE * scale); 
    
    // In Comoving frame, we want fixed opacity (no growth fading), but reduced intensity (50%)
    // In Physical frame, opacity grows with time (growth factor)
    let opacity = Math.max(0, Math.min(1, growth)); 
    if (state.isComoving) {
        opacity = 1.0;
    }

    // We draw the entire density profile (Center + Ring) as a single radial gradient
    // to simulate a heatmap / diffusion effect.
    
    // The gradient extends far enough to cover the ring + some diffusion
    const maxRadius = r_vis + shellWidth * 2;
    
    try {
        const drawSingle = (tx, ty) => {
            targetCtx.save();
            targetCtx.translate(tx, ty);
            targetCtx.scale(1, rsdScaleY);
            
            // Draw at (0,0) because we translated
            const g = targetCtx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
            
            // In Comoving frame, we reduce the "glow" effect to make it look more like a density map
            // and less like a glowing neon effect, as requested.
            const glowFactor = state.isComoving ? 0.5 : 1.0;

            // 1. Central Peak (High Density)
            g.addColorStop(0, `rgba(${CONFIG.CENTER_HOT_COLOR}, ${opacity * 0.9 * glowFactor})`);
            g.addColorStop(centerRadius / maxRadius, `rgba(${CONFIG.CENTER_HALO_COLOR}, ${opacity * 0.4 * glowFactor})`);
            
            // 2. Gap (Low Density)
            g.addColorStop((r_vis - shellWidth) / maxRadius, `rgba(${CONFIG.RING_BASE_COLOR}, 0.05)`);
            
            // 3. BAO Ring (Overdensity at Sound Horizon)
            // We use a soft peak for the ring
            g.addColorStop(r_vis / maxRadius, `rgba(${CONFIG.RING_GLOW_COLOR}, ${opacity * 0.3 * glowFactor})`);
            
            // 4. Falloff
            g.addColorStop(1, 'rgba(0,0,0,0)');
            
            targetCtx.fillStyle = g;
            targetCtx.beginPath();
            targetCtx.arc(0, 0, maxRadius, 0, Math.PI * 2);
            targetCtx.fill();
            
            targetCtx.restore();
        };

        // Normalize position if wrapping
        if (wrapSize > 0) {
            x = ((x % wrapSize) + wrapSize) % wrapSize;
            y = ((y % wrapSize) + wrapSize) % wrapSize;
        }

        // Draw Main
        drawSingle(x, y);

        // Draw Wrapped Copies if overlapping edges
        if (wrapSize > 0) {
            const xOffsets = [0];
            if (x < maxRadius) xOffsets.push(wrapSize);
            if (x > wrapSize - maxRadius) xOffsets.push(-wrapSize);
            
            const yOffsets = [0];
            if (y < maxRadius) yOffsets.push(wrapSize);
            if (y > wrapSize - maxRadius) yOffsets.push(-wrapSize);
            
            xOffsets.forEach(ox => {
                yOffsets.forEach(oy => {
                    if (ox === 0 && oy === 0) return; // Already drawn
                    drawSingle(x + ox, y + oy);
                });
            });
        }
        
    } catch (e) {
        console.error("Error drawing BAO:", e);
    }
}
