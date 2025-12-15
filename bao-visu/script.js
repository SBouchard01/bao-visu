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

    // Keyboard shortcut for Dev Mode (Shift+D)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'D') {
            state.devMode = !state.devMode;
            if (devToolsBox) {
                devToolsBox.style.display = state.devMode ? 'flex' : 'none';
            }
            console.log("Dev Mode:", state.devMode);
            draw();
        }
    });
    
    resize();
    
    // Generate initial centers
    shuffleCenters();
    
    // Initial Physics State
    updatePhysicsStateFromZ(state.z);
    
    // Setup Event Listeners (from style.js)
    setupEventListeners();
    
    // Initial UI Update
    updateUI();
    
    // Start Loop
    loop();
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
    const da = a * CONFIG.TIME_SPEED * CONFIG.ANIMATION_SPEED_FACTOR;
    
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