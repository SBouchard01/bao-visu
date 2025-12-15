
// --- Guided Tour Logic ---

const TOUR_STEPS = [
    {
        title: "1. The Early Universe",
        text: "In the beginning (high redshift z=1100), the universe was a hot, dense plasma. We are looking at the Cosmic Microwave Background (CMB) era. Matter was distributed almost uniformly, with tiny fluctuations.",
        setup: () => {
            resetAllSettings();
            state.z = 1100.0;
            state.baoCount = 50; // Show many peaks
            state.showHeatmap = true; // Heatmap looks more like CMB/early density
            state.showGalaxies = false;
            state.showDensity = true;
            state.isComoving = false; // Show clumped heatmap
            state.showRSD = false;
            state.showHorizon = false;
            state.showPlot = false;
            CONFIG.GRAVITY_STRENGTH = 0.2;
            updatePhysicsStateFromZ(1100.0);
            shuffleCenters();
        }
    },
    {
        title: "2. Acoustic Waves (BAO)",
        text: "Pressure waves traveled through the plasma, carrying baryons (normal matter) outward from overdensities. This created a 'sound horizon' - a preferred scale of separation.",
        setup: () => {
            state.z = 3.0;
            state.baoCount = 1; // Focus on one ring
            state.showHeatmap = false;
            state.showGalaxies = true;
            state.showDensity = true;
            state.showHorizon = true; // Show the ring marker
            state.isComoving = true;
            state.showRSD = false;
            state.showPlot = false;
            CONFIG.GRAVITY_STRENGTH = 0.2;
            updatePhysicsStateFromZ(3.0);
            shuffleCenters(); // Reset positions
        }
    },
    {
        title: "3. Structure Formation",
        text: "As the universe expanded and cooled, gravity took over. Matter fell back into the central peaks and the shells at the sound horizon, forming galaxies.",
        setup: () => {
            state.z = 1.0;
            state.baoCount = 20;
            state.showHeatmap = false;
            state.showGalaxies = true;
            state.showDensity = true;
            state.showHorizon = false;
            state.isComoving = false; // Switch to physical to see expansion
            state.showRSD = false;
            state.showPlot = false;
            CONFIG.GRAVITY_STRENGTH = 1.0; // Enhance clustering
            updatePhysicsStateFromZ(1.0);
            shuffleCenters();
        }
    },
    {
        title: "4. Cosmic Web & Dark Energy",
        text: "Today (z=0), we see a cosmic web of galaxies. The expansion is accelerating due to Dark Energy (ΩΛ). The BAO scale is now a 'standard ruler' of ~150 Mpc.",
        setup: () => {
            state.z = 0.0;
            state.baoCount = 100;
            state.showHeatmap = true;
            state.showGalaxies = false;
            state.showDensity = false; // Hide background density to focus on galaxy heatmap
            state.showHorizon = false;
            state.isComoving = false;
            state.showRSD = false;
            state.showPlot = true;
            state.omega_lambda = 0.7;
            CONFIG.GRAVITY_STRENGTH = 1.0;
            updatePhysicsStateFromZ(0.0);
            shuffleCenters();
        }
    },
    {
        title: "5. Redshift Space Distortions",
        text: "When we observe galaxies, their peculiar velocities distort their apparent positions. Infalling galaxies make the spherical BAO shells look squashed along the line of sight. Notice how the galaxy shapes themselves also appear squashed or elongated due to these distortions.",
        setup: () => {
            state.z = 0.5;
            state.baoCount = 3;
            state.showHeatmap = false;
            state.showGalaxies = true;
            state.showDensity = true;
            state.showRSD = true; // Turn on RSD
            state.showHorizon = true;
            state.isComoving = true; // Easier to see the shape distortion
            state.showPlot = false;
            CONFIG.GRAVITY_STRENGTH = 1.5; // Exaggerate effect
            updatePhysicsStateFromZ(0.5);
            shuffleCenters();
        }
    }
];

let currentTourStep = 0;
const tourOverlay = document.getElementById('tour-overlay');
const tourTitle = document.getElementById('tour-title');
const tourContent = document.getElementById('tour-content');
const tourProgress = document.getElementById('tour-progress');
const tourPrevBtn = document.getElementById('tour-prev-btn');
const tourNextBtn = document.getElementById('tour-next-btn');
const tourCloseBtn = document.getElementById('tour-close-btn');
const startTourBtn = document.getElementById('start-tour-btn');
const sidebarTourBtn = document.getElementById('sidebar-tour-btn');

function startTour() {
    currentTourStep = 0;
    tourOverlay.classList.remove('hidden');
    if (sidebarTourBtn) sidebarTourBtn.classList.add('active');
    applyTourStep(0);
}

function endTour() {
    tourOverlay.classList.add('hidden');
    if (sidebarTourBtn) sidebarTourBtn.classList.remove('active');
}

function applyTourStep(index) {
    if (index < 0 || index >= TOUR_STEPS.length) return;
    
    const step = TOUR_STEPS[index];
    tourTitle.textContent = step.title;
    tourContent.textContent = step.text;
    tourProgress.textContent = `${index + 1} / ${TOUR_STEPS.length}`;
    
    // Button states
    tourPrevBtn.disabled = (index === 0);
    tourPrevBtn.style.opacity = (index === 0) ? 0.5 : 1;
    
    if (index === TOUR_STEPS.length - 1) {
        tourNextBtn.textContent = "Finish";
    } else {
        tourNextBtn.textContent = "Next";
    }
    
    // Execute Step Logic
    step.setup();
    updateUI();
    draw();
}

// Event Listeners
if (startTourBtn) {
    startTourBtn.addEventListener('click', () => {
        // Close settings panel on mobile/small screens if needed, 
        // but for now just start the tour
        startTour();
    });
}

if (sidebarTourBtn) {
    sidebarTourBtn.addEventListener('click', () => {
        if (!tourOverlay.classList.contains('hidden')) {
            // If tour is running, maybe restart or do nothing?
            // User asked to disable it if running.
            // But clicking it again could also just focus it.
            // Let's assume "disable itself" means visual disable, but if clicked, maybe nothing happens or it restarts.
            // Let's just do nothing if already active.
            return;
        }
        startTour();
    });
}

if (tourCloseBtn) {
    tourCloseBtn.addEventListener('click', endTour);
}

if (tourPrevBtn) {
    tourPrevBtn.addEventListener('click', () => {
        if (currentTourStep > 0) {
            currentTourStep--;
            applyTourStep(currentTourStep);
        }
    });
}

if (tourNextBtn) {
    tourNextBtn.addEventListener('click', () => {
        if (currentTourStep < TOUR_STEPS.length - 1) {
            currentTourStep++;
            applyTourStep(currentTourStep);
        } else {
            endTour();
        }
    });
}
