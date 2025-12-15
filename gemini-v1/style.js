// Layout, Style & UI Controls

// DOM Elements (Global)
var canvas = document.getElementById('sim-canvas');
var ctx = canvas ? canvas.getContext('2d') : null;

var correlationCanvas = document.getElementById('correlation-canvas');
var correlationCtx = correlationCanvas ? correlationCanvas.getContext('2d') : null;

// Controls
var zSlider = document.getElementById('z-slider');
var zVal = document.getElementById('z-val');
var playBtn = document.getElementById('play-btn');
var resetBtn = document.getElementById('reset-btn');
var baoSlider = document.getElementById('bao-slider');
var baoVal = document.getElementById('bao-val');
var galaxyDensitySlider = document.getElementById('galaxy-density-slider');
var galaxyNumberVal = document.getElementById('galaxy-number-val');
var gravitySlider = document.getElementById('gravity-slider');
var gravityVal = document.getElementById('gravity-val');
var shuffleBtn = document.getElementById('shuffle-btn');

// Sidebar & Layout Controls
var sidebar = document.getElementById('sidebar');
var sidebarLogoBtn = document.getElementById('sidebar-logo-btn');
var closeSettingsBtn = document.getElementById('close-settings-btn');
var sidebarPlayBtn = document.getElementById('sidebar-play-btn');
var sidebarResetBtn = document.getElementById('sidebar-reset-btn');
var sidebarDensityBtn = document.getElementById('sidebar-density-btn');
var sidebarGalaxiesBtn = document.getElementById('sidebar-galaxies-btn');
var sidebarHeatmapBtn = document.getElementById('sidebar-heatmap-btn');
var sidebarHorizonBtn = document.getElementById('sidebar-horizon-btn');
var sidebarPlotBtn = document.getElementById('sidebar-plot-btn');
var sidebarScreenshotBtn = document.getElementById('sidebar-screenshot-btn');
var settingsPanel = document.getElementById('settings-panel');

// Layer Controls
var layerDensityToggle = document.getElementById('layer-density-toggle');
var layerGalaxiesToggle = document.getElementById('layer-galaxies-toggle');
var layerHeatmapToggle = document.getElementById('layer-heatmap-toggle');
var layerHorizonToggle = document.getElementById('layer-horizon-toggle');
var layerPlotToggle = document.getElementById('layer-plot-toggle');
var correlationContainer = document.getElementById('correlation-container');
var closePlotBtn = document.getElementById('close-plot-btn');

// Reference Frame Controls
var framePhysicalBtn = document.getElementById('frame-physical-btn');
var frameComovingBtn = document.getElementById('frame-comoving-btn');

// RSD Controls
var viewRealBtn = document.getElementById('view-real-btn');
var viewRsdBtn = document.getElementById('view-rsd-btn');
var sidebarRsdBtn = document.getElementById('sidebar-rsd-btn');

// Cosmology Controls
var omegamSlider = document.getElementById('omegam-slider');
var omegamVal = document.getElementById('omegam-val');
var omegalSlider = document.getElementById('omegal-slider');
var omegalVal = document.getElementById('omegal-val');
var flatToggle = document.getElementById('flat-toggle');

// Dev Controls
var devToolsBox = document.getElementById('dev-tools-box');
var devTransitionToggle = document.getElementById('dev-transition-toggle');
var devBorderToggle = document.getElementById('dev-border-toggle');
var devFps = document.getElementById('dev-fps');
var devObjCount = document.getElementById('dev-obj-count');
var devComovingSlider = document.getElementById('dev-comoving-slider');
var devComovingVal = document.getElementById('dev-comoving-val');
var devHeatmapSlider = document.getElementById('dev-heatmap-slider');
var devHeatmapVal = document.getElementById('dev-heatmap-val');

// --- UI Functions ---

function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Update Universe Size to cover screen at z=5
    // At z=5, a = 1/6. a_vis = (1/6)^(1-0.6) = (1/6)^0.4 approx 0.48
    const z_ref = CONFIG.DEFAULT_COMOVING_Z;
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
        // Display the Density Setting in scientific notation (e.g. 2.0e-3)
        // state.galaxyDensity is in units of 10^-3, so we multiply by 1e-3
        const val = state.galaxyDensity * 1e-3;
        galaxyNumberVal.textContent = val.toExponential(1);
        
        // Update Dev Tool with actual count
        if (devObjCount) {
            devObjCount.textContent = state.galaxies ? state.galaxies.length : "0";
        }
    }
    if (galaxyDensitySlider) {
        galaxyDensitySlider.value = state.galaxyDensity;
        updateSliderFill(galaxyDensitySlider);
    }

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

    if (devComovingSlider) {
        devComovingSlider.value = state.devComovingScale;
        if (devComovingVal) devComovingVal.textContent = state.devComovingScale.toFixed(1);
    }
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

function togglePlot() {
    state.showPlot = !state.showPlot;
    updateLayerUI();
    draw();
}

function toggleDensity() {
    state.showDensity = !state.showDensity;
    updateLayerUI();
    draw();
}

function toggleGalaxies() {
    state.showGalaxies = !state.showGalaxies;
    updateLayerUI();
    draw();
}

function toggleHeatmap() {
    state.showHeatmap = !state.showHeatmap;
    updateLayerUI();
    draw();
}

function toggleHorizon() {
    state.showHorizon = !state.showHorizon;
    updateLayerUI();
    draw();
}

function setupEventListeners() {
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
    if (devComovingSlider) {
        devComovingSlider.addEventListener('input', (e) => {
            state.devComovingScale = parseFloat(e.target.value);
            if (devComovingVal) devComovingVal.textContent = state.devComovingScale.toFixed(1);
            draw();
        });
    }

    if (devHeatmapSlider) {
        devHeatmapSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            CONFIG.HEATMAP_PIXEL_SIZE_MAX = val;
            if (devHeatmapVal) devHeatmapVal.textContent = val.toFixed(1);
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

    // General Key Bindings
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const key = e.key.toLowerCase();

        if (e.code === 'Space') {
            e.preventDefault(); // Prevent scrolling
            togglePlay();
        } else if (key === 'r') {
            state.showRSD = !state.showRSD;
            updateViewUI();
            draw();
        } else if (key === 'd' && !e.ctrlKey && !e.shiftKey) {
             state.showDensity = !state.showDensity;
             updateLayerUI();
             draw();
        } else if (key === 'g') {
            state.showGalaxies = !state.showGalaxies;
            updateLayerUI();
            draw();
        } else if (key === 'h') {
            toggleHeatmap();
        } else if (key === 'p') {
            togglePlot();
        } else if (e.shiftKey && key === 'escape') {
            e.preventDefault();
            resetAllSettings();
        } else if (e.ctrlKey && key === 's') {
            e.preventDefault();
            takeScreenshot();
        } else if (key === 'escape') {
            if (settingsPanel && !settingsPanel.classList.contains('collapsed')) {
                toggleSettings(false);
            } else {
                // Reset Redshift Evolution
                state.playing = false;
                updatePlayButtons();
                state.z = 5.0;
                updatePhysicsStateFromZ(state.z);
                updateUI();
                draw();
            }
        }
    });
    
    window.addEventListener('resize', resize);
    
    // Mouse Wheel for Redshift Zoom
    window.addEventListener('wheel', (e) => {
        // Only zoom if not hovering over a scrollable panel (like settings)
        if (settingsPanel && settingsPanel.contains(e.target) && !settingsPanel.classList.contains('collapsed')) {
            return;
        }
        
        // Logarithmic Zoom Logic
        // z = 10^val - 1
        // val = log10(z + 1)
        let currentLog = Math.log10(state.z + 1);
        const step = 0.05;
        
        if (e.deltaY > 0) {
            // Scroll Down -> Increase z (towards 1100)
            currentLog += step;
        } else {
            // Scroll Up -> Decrease z (towards 0)
            currentLog -= step;
        }
        
        // Clamp (Max z=1100 => log=3.04)
        if (currentLog < 0) currentLog = 0;
        if (currentLog > 3.0414) currentLog = 3.0414;
        
        state.z = Math.pow(10, currentLog) - 1;
        
        // Update
        updatePhysicsStateFromZ(state.z);
        updateUI();
        draw();
    }, { passive: true });
    
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
    if (sidebarHorizonBtn) sidebarHorizonBtn.addEventListener('click', toggleHorizon);

    // Global Tooltip Logic
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
                const offset = 15;
                let x = e.clientX + offset;
                let y = e.clientY + offset;
                
                const tooltipRect = globalTooltip.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                if (x + tooltipRect.width > viewportWidth) {
                    x = e.clientX - tooltipRect.width - offset;
                }

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
        togglePlot();
    });
    if (closePlotBtn) closePlotBtn.addEventListener('click', () => {
        togglePlot();
    });
    if (sidebarPlotBtn) sidebarPlotBtn.addEventListener('click', () => {
        togglePlot();
    });

    if (sidebarScreenshotBtn) {
        sidebarScreenshotBtn.addEventListener('click', takeScreenshot);
    }

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
            generateGalaxies();
            updateUI();
            draw();
        });
    }

    if (galaxyDensitySlider) {
        galaxyDensitySlider.addEventListener('input', (e) => {
            state.galaxyDensity = parseFloat(e.target.value);
            generateGalaxies();
            updateUI();
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

    // Plot Resize Logic
    const plotResizeHandle = document.getElementById('plot-resize-handle');
    let isResizingPlot = false;
    let lastDownX = 0;
    let initialWidth = 0;

    if (plotResizeHandle && correlationContainer) {
        plotResizeHandle.addEventListener('mousedown', (e) => {
            isResizingPlot = true;
            lastDownX = e.clientX;
            initialWidth = correlationContainer.getBoundingClientRect().width;
            e.preventDefault();
            e.stopPropagation();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isResizingPlot) return;
            
            const dx = e.clientX - lastDownX;
            let newWidth = initialWidth + dx;
            
            // Min width constraint
            if (newWidth < 300) newWidth = 300;
            if (newWidth > 1000) newWidth = 1000; // Max width
            
            correlationContainer.style.width = newWidth + 'px';
            
            // Update Canvas Size (Maintain Aspect Ratio 2.4:1)
            // Container padding is 20px total (10px each side)
            const canvasWidth = newWidth - 20;
            const canvasHeight = canvasWidth / 2.4;
            
            if (correlationCanvas) {
                correlationCanvas.width = canvasWidth;
                correlationCanvas.height = canvasHeight;
            }
            
            draw();
        });

        window.addEventListener('mouseup', () => {
            isResizingPlot = false;
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
                state.omega_lambda = parseFloat((1 - state.omega_m).toFixed(2));
                updateUI();
                draw();
            }
        });
    }

    const resetAllBtn = document.getElementById('reset-all-btn');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', resetAllSettings);
    }

    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const m = parseFloat(btn.dataset.m);
            const l = parseFloat(btn.dataset.l);
            
            state.omega_m = m;
            state.omega_lambda = l;
            
            const isFlat = Math.abs((m + l) - 1.0) < 0.01;
            state.isFlat = isFlat;
            if (flatToggle) flatToggle.checked = isFlat;
            
            updateUI();
            draw();
        });
    });
    
    const setRSD = (enabled) => {
        state.showRSD = enabled;
        updateUI();
        draw();
    };
    
    if (viewRealBtn) viewRealBtn.addEventListener('click', () => setRSD(false));
    if (viewRsdBtn) viewRsdBtn.addEventListener('click', () => setRSD(true));
    if (sidebarRsdBtn) sidebarRsdBtn.addEventListener('click', () => setRSD(!state.showRSD));
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
    state.galaxyDensity = 2.0; // Default density (10^-3 gal/(Mpc/h)^2)
    state.isComoving = false;
    state.showRSD = false;
    state.showHeatmap = false;
    state.heatmapMaxDensity = 0; // Reset smoothed density
    state.omega_m = 0.3;
    state.omega_lambda = 0.7;
    state.isFlat = true;
    
    // Reset Config
    CONFIG.GRAVITY_STRENGTH = 0.2;
    
    // Reset Plot Size
    if (correlationContainer && correlationCanvas) {
        correlationContainer.style.width = '260px'; // 240px canvas + 20px padding
        correlationCanvas.width = 240;
        correlationCanvas.height = 100;
    }
    
    // Update Physics
    updatePhysicsStateFromZ(state.z);
    
    // Regenerate
    shuffleCenters();
    
    // Update UI
    updatePlayButtons();
    updateUI();
    draw();
}

function takeScreenshot() {
    // 1. Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // 2. Draw the main simulation canvas
    tempCtx.drawImage(canvas, 0, 0);

    // 3. Draw the correlation plot if visible
    if (state.showPlot && correlationCanvas) {
        const plotMargin = 20;
        const plotWidth = correlationCanvas.width;
        const plotHeight = correlationCanvas.height;
        const headerHeight = 30;
        const padding = 10;
        
        const boxWidth = plotWidth + padding * 2;
        const boxHeight = plotHeight + headerHeight + padding;
        
        const x = plotMargin;
        const y = plotMargin;
        
        tempCtx.save();
        
        // Draw Background (Glass effect approximation)
        tempCtx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        tempCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        tempCtx.lineWidth = 1;
        
        // Round Rect
        tempCtx.beginPath();
        if (tempCtx.roundRect) {
            tempCtx.roundRect(x, y, boxWidth, boxHeight, 8);
        } else {
            tempCtx.rect(x, y, boxWidth, boxHeight);
        }
        tempCtx.fill();
        tempCtx.stroke();
        
        // Draw Header Text
        tempCtx.fillStyle = '#e2e8f0';
        tempCtx.font = '600 13px "Segoe UI", sans-serif';
        tempCtx.textAlign = 'left';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillText('Correlation Function ξ(r)', x + padding, y + headerHeight / 2);
        
        // Draw Plot Canvas
        tempCtx.drawImage(correlationCanvas, x + padding, y + headerHeight);
        
        tempCtx.restore();
    }
    
    // 4. Add Watermark / Info
    tempCtx.save();
    tempCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    tempCtx.font = '12px monospace';
    tempCtx.textAlign = 'right';
    tempCtx.fillText(`z = ${state.z.toFixed(2)}`, tempCanvas.width - 20, tempCanvas.height - 20);
    tempCtx.restore();

    // 5. Save
    const link = document.createElement('a');
    link.download = `bao-visu-z${state.z.toFixed(2)}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}
