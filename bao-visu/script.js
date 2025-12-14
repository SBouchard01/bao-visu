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

// Galaxy Render Mode Controls
const renderPointsBtn = document.getElementById('render-points-btn');
const renderHeatmapBtn = document.getElementById('render-heatmap-btn');

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
    GRAVITY_STRENGTH: 0.2, // Strength of structure formation (0 to 1)
    
    // Animation
    TIME_SPEED: 0.005, // Adjusted for Friedmann evolution
    
    // Simulation
    MAX_BAO_COUNT: 200,        
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

// Icons
const ICON_POINTS = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)"/></svg>`;
const ICON_HEATMAP = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>`;

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
    showHorizon: false,
    showPlot: true,
    galaxyDensity: 1.0,
    isComoving: false, // New state for reference frame
    showRSD: false, // Redshift Space Distortions
    renderMode: 'points', // 'points' or 'heatmap'
    
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
        // Loop: Off -> Points -> Heatmap -> Off
        if (!state.showGalaxies) {
            // Off -> Points
            state.showGalaxies = true;
            state.renderMode = 'points';
        } else if (state.renderMode === 'points') {
            // Points -> Heatmap
            state.showGalaxies = true;
            state.renderMode = 'heatmap';
        } else {
            // Heatmap -> Off
            state.showGalaxies = false;
            state.renderMode = 'points'; // Reset to default when off
        }
        updateLayerUI();
        updateRenderModeUI();
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
        // If turning on via checkbox, default to points if not set
        if (state.showGalaxies && !state.renderMode) state.renderMode = 'points';
        updateLayerUI();
        updateRenderModeUI();
        draw();
    });
    if (sidebarGalaxiesBtn) sidebarGalaxiesBtn.addEventListener('click', toggleGalaxies);

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

    // Galaxy Render Mode Listeners
    if (renderPointsBtn && renderHeatmapBtn) {
        renderPointsBtn.addEventListener('click', () => {
            state.renderMode = 'points';
            state.showGalaxies = true; // Ensure visible
            updateLayerUI();
            updateRenderModeUI();
            draw();
        });
        renderHeatmapBtn.addEventListener('click', () => {
            state.renderMode = 'heatmap';
            state.showGalaxies = true; // Ensure visible
            updateLayerUI();
            updateRenderModeUI();
            draw();
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
    state.renderMode = 'points';
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
    updateRenderModeUI();
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
    if (layerHorizonToggle) layerHorizonToggle.checked = state.showHorizon;
    if (layerPlotToggle) layerPlotToggle.checked = state.showPlot;
    
    if (sidebarDensityBtn) {
        if (state.showDensity) sidebarDensityBtn.classList.add('active');
        else sidebarDensityBtn.classList.remove('active');
    }
    
    if (sidebarGalaxiesBtn) {
        if (state.showGalaxies) {
            sidebarGalaxiesBtn.classList.add('active');
            // Update Icon based on Render Mode
            const targetMode = state.renderMode; // 'points' or 'heatmap'
            if (sidebarGalaxiesBtn.dataset.iconMode !== targetMode) {
                sidebarGalaxiesBtn.innerHTML = targetMode === 'heatmap' ? ICON_HEATMAP : ICON_POINTS;
                sidebarGalaxiesBtn.dataset.iconMode = targetMode;
            }
        } else {
            sidebarGalaxiesBtn.classList.remove('active');
            // Default to points icon when off
            if (sidebarGalaxiesBtn.dataset.iconMode !== 'points') {
                sidebarGalaxiesBtn.innerHTML = ICON_POINTS;
                sidebarGalaxiesBtn.dataset.iconMode = 'points';
            }
        }
    }

    if (sidebarHorizonBtn) {
        if (state.showHorizon) sidebarHorizonBtn.classList.add('active');
        else sidebarHorizonBtn.classList.remove('active');
    }

    if (sidebarPlotBtn) {
        if (state.showPlot) sidebarPlotBtn.classList.add('inactive');
        else sidebarPlotBtn.classList.remove('inactive');
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

function updateRenderModeUI() {
    if (renderPointsBtn && renderHeatmapBtn) {
        if (state.renderMode === 'heatmap') {
            renderPointsBtn.classList.remove('active');
            renderHeatmapBtn.classList.add('active');
        } else {
            renderPointsBtn.classList.add('active');
            renderHeatmapBtn.classList.remove('active');
        }
    }
}

function updateUI() {
    updateLayerUI();
    updateFrameUI();
    updateViewUI();
    updateRenderModeUI();
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
    
    // Comoving Scale Factor (Fixed at z=5 scale)
    // This ensures the view covers the same volume as the start of the simulation
    const a_comoving = Math.pow(1/6, 1 - CONFIG.EXPANSION_DAMPING);
    
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

    if (state.showDensity) {
        for (let i = 0; i < state.baoCount; i++) {
            const center = state.centers[i];
            if (!center) continue;
            
            const sx = cx + center.x * renderScale;
            const sy = cy + center.y * renderScale;
            
            drawBAO(sx, sy, renderScale, growth, soundHorizonScale, rsdScaleY);
        }
    }

    if (state.showGalaxies) {
        drawGalaxies(cx, cy, renderScale, growth, soundHorizonScale);
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

function drawGalaxies(cx, cy, scale, growth, horizonScale) {
    if (!state.galaxies || state.galaxies.length === 0) return;
    
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
        
        // Draw galaxy
        if (state.renderMode === 'heatmap') {
             // Heatmap Mode: Accumulate in grid (handled in batch below)
             // We just store the position for the grid renderer
             // But wait, we are inside a loop.
             // To do a proper grid heatmap, we should do it after calculating all positions.
             // However, to avoid refactoring the whole loop structure, let's push to a temp array
             // or just use the "Colorized Lighter" approach which is visually similar to a heatmap
             // but much faster than JS-based grid binning for 2000+ particles every frame?
             // Actually, 2000 particles binning is instant in JS.
             // Let's use the Grid approach for a "True Heatmap" look.
             
             // We need to store transformed positions to render the heatmap at the end
             if (!state.heatmapPositions) state.heatmapPositions = [];
             state.heatmapPositions.push({x, y});
             
        } else {
            // Standard Point Mode
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
        }
    });
    
    // Render Heatmap if needed
    if (state.renderMode === 'heatmap' && state.heatmapPositions) {
        renderHeatmapGrid(state.heatmapPositions);
        state.heatmapPositions = []; // Clear
    }
    
    ctx.globalAlpha = 1.0;
}

// Offscreen canvas for heatmap generation
const heatmapCanvas = document.createElement('canvas');
const heatmapCtx = heatmapCanvas.getContext('2d');

function renderHeatmapGrid(positions) {
    if (!positions.length) return;
    
    // Resolution Scaling (1/4 screen size for performance + smoothing)
    const scale = 0.25;
    const w = Math.ceil(canvas.width * scale);
    const h = Math.ceil(canvas.height * scale);
    
    if (heatmapCanvas.width !== w || heatmapCanvas.height !== h) {
        heatmapCanvas.width = w;
        heatmapCanvas.height = h;
    }
    
    const cols = w;
    const rows = h;
    const grid = new Float32Array(cols * rows);
    
    // 1. Binning
    for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        // Scale position to grid coordinates
        const gx = p.x * scale;
        const gy = p.y * scale;
        
        if (gx < 0 || gx >= w || gy < 0 || gy >= h) continue;
        
        const c = Math.floor(gx);
        const r = Math.floor(gy);
        grid[r * cols + c] += 1.0;
    }
    
    // 2. Smoothing (Diffusion)
    // Two passes of 3x3 kernel for smoother results
    let bufferA = grid;
    let bufferB = new Float32Array(cols * rows);
    
    // Pass 1
    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            const i = r * cols + c;
            bufferB[i] = (bufferA[i] * 4 + 
                         bufferA[i-1] + bufferA[i+1] + 
                         bufferA[i-cols] + bufferA[i+cols] +
                         bufferA[i-cols-1] + bufferA[i-cols+1] +
                         bufferA[i+cols-1] + bufferA[i+cols+1]) / 12;
        }
    }
    
    // Pass 2 (Swap buffers)
    bufferA = bufferB;
    bufferB = new Float32Array(cols * rows); // Clear or reuse grid if we didn't need original
    let maxDensity = 0;
    
    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            const i = r * cols + c;
            const val = (bufferA[i] * 4 + 
                         bufferA[i-1] + bufferA[i+1] + 
                         bufferA[i-cols] + bufferA[i+cols] +
                         bufferA[i-cols-1] + bufferA[i-cols+1] +
                         bufferA[i+cols-1] + bufferA[i+cols+1]) / 12;
            
            bufferB[i] = val;
            if (val > maxDensity) maxDensity = val;
        }
    }
    
    const smoothed = bufferB;
    
    if (maxDensity === 0) return;
    
    // 3. Rendering to Offscreen Canvas
    const imgData = heatmapCtx.createImageData(w, h);
    const data = imgData.data;
    
    for (let i = 0; i < cols * rows; i++) {
        const val = smoothed[i];
        if (val < 0.01) continue; // Transparent
        
        const norm = Math.min(1, val / (maxDensity * 0.8)); // Boost contrast slightly
        
        // Color Map (Turbo-like)
        let r, g, b, a;
        
        // Alpha ramps up quickly to make low density visible
        a = Math.min(255, Math.floor(norm * 255 * 2.0)); 
        
        if (norm < 0.2) {
            // Blue range
            const t = norm / 0.2;
            r = 0; g = Math.floor(t * 50); b = Math.floor(150 + t * 105);
        } else if (norm < 0.4) {
            // Cyan range
            const t = (norm - 0.2) / 0.2;
            r = 0; g = Math.floor(50 + t * 205); b = 255;
        } else if (norm < 0.6) {
            // Green range
            const t = (norm - 0.4) / 0.2;
            r = Math.floor(t * 255); g = 255; b = Math.floor(255 - t * 255);
        } else if (norm < 0.8) {
            // Yellow range
            const t = (norm - 0.6) / 0.2;
            r = 255; g = Math.floor(255 - t * 100); b = 0;
        } else {
            // Red range
            const t = (norm - 0.8) / 0.2;
            r = 255; g = Math.floor(155 - t * 155); b = 0;
        }
        
        const idx = i * 4;
        data[idx] = r;
        data[idx+1] = g;
        data[idx+2] = b;
        data[idx+3] = a;
    }
    
    heatmapCtx.putImageData(imgData, 0, 0);
    
    // 4. Draw to Main Canvas (Upscale with smoothing)
    ctx.save();
    ctx.globalCompositeOperation = 'screen'; // Blend with background
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(heatmapCanvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function drawBAO(x, y, scale, growth, horizonScale = 1.0, rsdScaleY = 1.0) {
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
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, rsdScaleY);
        
        // Draw at (0,0) because we translated
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
        
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
        
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
    } catch (e) {
        console.error("Error drawing BAO:", e);
    }
}
