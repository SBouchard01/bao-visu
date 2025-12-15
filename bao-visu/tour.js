
// --- Guided Tour Logic ---

const TOUR_STEPS = [
    {
        title: "1. The Early Universe",
        text: "At high redshift (z=1100), we see the early density field. The view is restricted by an elliptic mask representing the observable universe at that time. Matter is distributed almost uniformly with tiny fluctuations.",
        setup: () => {
            resetAllSettings();
            state.z = 1100.0;
            state.baoCount = 50; 
            state.showHeatmap = true; 
            state.showGalaxies = false;
            state.showDensity = true;
            state.isComoving = false; // Physical frame required for mask
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
        text: "Pressure waves traveled outward from overdensities, creating a preferred scale called the 'Sound Horizon'. In comoving coordinates (static view), this scale is fixed, appearing as a ring around density peaks.",
        setup: () => {
            state.z = 100.0; // Post-recombination
            state.baoCount = 1; // Focus on one ring
            state.showHeatmap = false;
            state.showGalaxies = true;
            state.showDensity = true;
            state.showHorizon = true; 
            state.isComoving = true; // Comoving to show fixed ring
            state.showRSD = false;
            state.showPlot = false;
            CONFIG.GRAVITY_STRENGTH = 0.2;
            updatePhysicsStateFromZ(100.0);
            shuffleCenters(); 
        }
    },
    {
        title: "3. Structure Formation",
        text: "As the universe expands (Physical Frame), gravity pulls matter into the peaks. The elliptic mask fades away as we approach lower redshifts, revealing the full cosmic web structure.",
        setup: () => {
            state.z = 2.0;
            state.baoCount = 20;
            state.showHeatmap = true;
            state.showGalaxies = true;
            state.showDensity = true;
            state.showHorizon = false;
            state.isComoving = false; // Physical to see expansion & mask fade
            state.showRSD = false;
            state.showPlot = false;
            CONFIG.GRAVITY_STRENGTH = 1.0; 
            updatePhysicsStateFromZ(2.0);
            shuffleCenters();
        }
    },
    {
        title: "4. The Cosmic Web",
        text: "Today (z=0), galaxies trace the underlying dark matter web. The heatmap resolution adapts to show fine details. The BAO scale (~150 Mpc) remains imprinted in the galaxy distribution.",
        setup: () => {
            state.z = 0.0;
            state.baoCount = 100;
            state.showHeatmap = true;
            state.showGalaxies = false; // Focus on heatmap
            state.showDensity = false; 
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
        text: "Peculiar velocities distort the apparent positions of galaxies. Infalling galaxies make the spherical BAO shells look squashed along the line of sight (Y-axis). Use the 'Camera' button to capture this view!",
        setup: () => {
            state.z = 0.5;
            state.baoCount = 3;
            state.showHeatmap = false;
            state.showGalaxies = true;
            state.showDensity = true;
            state.showRSD = true; 
            state.showHorizon = true;
            state.isComoving = true; 
            state.showPlot = false;
            CONFIG.GRAVITY_STRENGTH = 1.5; 
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
