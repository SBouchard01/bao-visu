
// --- Guided Tour Logic ---

const TOUR_STEPS = [
    {
        title: "1. The Early Universe",
        text: "In the beginning (high redshift z=5), the universe was dense and hot. Matter was distributed almost uniformly, with tiny fluctuations. Here we see the initial seeds of structure.",
        setup: () => {
            resetAllSettings();
            state.z = 5.0;
            state.baoCount = 50; // Show many peaks
            state.renderMode = 'heatmap'; // Heatmap looks more like CMB/early density
            state.showGalaxies = true;
            state.showDensity = true;
            state.isComoving = true; // Easier to see structure without expansion
            updatePhysicsStateFromZ(5.0);
            shuffleCenters();
        }
    },
    {
        title: "2. Acoustic Waves (BAO)",
        text: "Pressure waves traveled through the plasma, carrying baryons (normal matter) outward from overdensities. This created a 'sound horizon' - a preferred scale of separation.",
        setup: () => {
            state.z = 3.0;
            state.baoCount = 1; // Focus on one ring
            state.renderMode = 'points';
            state.showHorizon = true; // Show the ring marker
            state.isComoving = true;
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
            state.renderMode = 'points';
            state.showHorizon = false;
            state.isComoving = false; // Switch to physical to see expansion
            CONFIG.GRAVITY_STRENGTH = 1.0; // Enhance clustering
            updatePhysicsStateFromZ(1.0);
            // Don't shuffle, let them evolve? No, shuffle for clean state
            shuffleCenters();
        }
    },
    {
        title: "4. Cosmic Web & Dark Energy",
        text: "Today (z=0), we see a cosmic web of galaxies. The expansion is accelerating due to Dark Energy (ΩΛ). The BAO scale is now a 'standard ruler' of ~150 Mpc.",
        setup: () => {
            state.z = 0.0;
            state.baoCount = 100;
            state.renderMode = 'heatmap';
            state.showHorizon = false;
            state.isComoving = false;
            state.omega_lambda = 0.7;
            updatePhysicsStateFromZ(0.0);
            shuffleCenters();
        }
    },
    {
        title: "5. Redshift Space Distortions",
        text: "When we observe galaxies, their peculiar velocities distort their apparent positions. Infalling galaxies make the spherical BAO shells look squashed along the line of sight.",
        setup: () => {
            state.z = 0.5;
            state.baoCount = 3;
            state.renderMode = 'points';
            state.showRSD = true; // Turn on RSD
            state.isComoving = true; // Easier to see the shape distortion
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

function startTour() {
    currentTourStep = 0;
    tourOverlay.classList.remove('hidden');
    applyTourStep(0);
}

function endTour() {
    tourOverlay.classList.add('hidden');
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
