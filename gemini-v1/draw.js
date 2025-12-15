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
    // We multiply by devComovingScale to allow zooming in/out in comoving frame
    const a_comoving = Math.pow(1/(1 + CONFIG.DEFAULT_COMOVING_Z), 1 - CONFIG.EXPANSION_DAMPING) * (state.devComovingScale || 1.0);
    
    // Determine Render Scale based on Reference Frame
    const renderScale = state.isComoving ? a_comoving : a_vis;
    
    // Growth Factor D(z)
    const growth = calculateGrowthFactor(a_real, state.omega_m, state.omega_lambda);
    
    // --- Rendering ---
    ctx.globalCompositeOperation = 'screen';
    
    // Calculate Sound Horizon Scale Factor based on Omega_m
    const soundHorizonScale = Math.pow(CONFIG.OMEGA_M_REF / Math.max(0.01, state.omega_m), CONFIG.SOUND_HORIZON_EXP);
    
    // Calculate RSD Strength (Squashing Factor)
    const rsdStrength = state.showRSD ? (CONFIG.GRAVITY_STRENGTH * growth * CONFIG.RSD_FACTOR) : 0;
    const rsdScaleY = Math.max(CONFIG.RSD_MIN_SCALE, 1 - rsdStrength);

    // --- Tiling Logic for High-Z ---
    const boxSize = CONFIG.UNIVERSE_SIZE * renderScale;
    const needsTiling = boxSize < Math.max(w, h);
    
    // Transition Logic
    let heatmapAlpha = state.showHeatmap ? 1.0 : 0.0;
    let galaxyAlpha = 1.0;

    if (state.z > CONFIG.TRANSITION_Z_END && state.showTransition && !state.isComoving) {
        const logZ = Math.log10(state.z);
        const logEnd = Math.log10(CONFIG.TRANSITION_Z_END);
        const logStart = Math.log10(CONFIG.TRANSITION_Z_START);
        
        let t = (logZ - logEnd) / (logStart - logEnd);
        t = Math.max(0, Math.min(1, t));
        
        heatmapAlpha = state.showHeatmap ? 1.0 : t;
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
        if (heatmapAlpha > CONFIG.HEATMAP_ALPHA_THRESHOLD) {
            tileCtx.save();
            tileCtx.globalAlpha = heatmapAlpha;
            drawGalaxies(size/2, size/2, renderScale, growth, soundHorizonScale, tileCtx, boxSize, 'heatmap');
            tileCtx.restore();
        }
        
        // 2. Render Galaxy/Density Layer
        if (galaxyAlpha > CONFIG.GALAXY_ALPHA_THRESHOLD && (state.showDensity || state.showGalaxies)) {
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
        
        // Copy tile to main canvas
        const cols = Math.ceil(w / boxSize) + 2;
        const rows = Math.ceil(h / boxSize) + 2;
        
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

        if (heatmapAlpha > CONFIG.HEATMAP_ALPHA_THRESHOLD) {
            ctx.save();
            ctx.globalAlpha = heatmapAlpha;
            drawGalaxies(cx, cy, renderScale, growth, soundHorizonScale, ctx, wrapSize, 'heatmap');
            ctx.restore();
        }

        if (galaxyAlpha > CONFIG.GALAXY_ALPHA_THRESHOLD) {
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
    if (state.z > CONFIG.TRANSITION_Z_END && state.showTransition && !state.isComoving) {
        const logZ = Math.log10(state.z);
        const logEnd = Math.log10(CONFIG.TRANSITION_Z_END);
        const logStart = Math.log10(CONFIG.TRANSITION_Z_START);
        
        let t = (logZ - logEnd) / (logStart - logEnd);
        t = Math.max(0, Math.min(1, t));
        
        // Interpolate Mask Size
        const targetRx = w * CONFIG.MASK_WIDTH_RATIO;
        const targetRy = targetRx * 0.5;
        
        const startRy = Math.hypot(w/4, h/2) * CONFIG.MASK_MARGIN;
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
    
    // Scale Factor (Base width 240)
    const scale = w / 240;

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
    const marginLeft = 30 * scale;
    const marginBottom = 30 * scale;
    const axisPadding = 2 * scale; // Padding between curve and axis
    const plotW = w - marginLeft - (15 * scale);
    const plotH = h - marginBottom - axisPadding - (10 * scale);

    // Draw Axes
    correlationCtx.beginPath();
    correlationCtx.strokeStyle = '#666';
    correlationCtx.lineWidth = 1.5 * scale;
    
    // Y-Axis
    correlationCtx.moveTo(marginLeft, h - marginBottom); // Start at bottom
    correlationCtx.lineTo(marginLeft, 0); // Draw to top
    // Y-Axis Arrow
    correlationCtx.moveTo(marginLeft, 0);
    correlationCtx.lineTo(marginLeft - (3 * scale), 5 * scale);
    correlationCtx.moveTo(marginLeft, 0);
    correlationCtx.lineTo(marginLeft + (3 * scale), 5 * scale);

    // X-Axis
    correlationCtx.moveTo(marginLeft, h - marginBottom);
    correlationCtx.lineTo(w, h - marginBottom);
    // X-Axis Arrow
    correlationCtx.moveTo(w, h - marginBottom);
    correlationCtx.lineTo(w - (5 * scale), h - marginBottom - (3 * scale));
    correlationCtx.moveTo(w, h - marginBottom);
    correlationCtx.lineTo(w - (5 * scale), h - marginBottom + (3 * scale));
    
    correlationCtx.stroke();

    // Draw X-Axis Graduations
    correlationCtx.fillStyle = '#888';
    correlationCtx.font = `${9 * scale}px monospace`;
    correlationCtx.textAlign = 'center';
    correlationCtx.textBaseline = 'top';

    const tickInterval = 50;
    for (let r = 50; r < maxDist; r += tickInterval) {
        const x = marginLeft + (r / maxDist) * plotW;
        
        // Tick mark
        correlationCtx.beginPath();
        correlationCtx.moveTo(x, h - marginBottom);
        correlationCtx.lineTo(x, h - marginBottom + (4 * scale));
        correlationCtx.stroke();
        
        // Label
        // Highlight 150
        if (r === 150) {
            correlationCtx.fillStyle = '#4cc9f0';
            correlationCtx.font = `bold ${10 * scale}px monospace`;
        } else {
            correlationCtx.fillStyle = '#888';
            correlationCtx.font = `${9 * scale}px monospace`;
        }
        correlationCtx.fillText(r, x, h - marginBottom + (6 * scale));
    }
    // Reset style
    correlationCtx.strokeStyle = '#4cc9f0';

    // Draw Plot Curve
    correlationCtx.beginPath();
    correlationCtx.strokeStyle = '#4cc9f0';
    correlationCtx.lineWidth = 1 * scale;
    
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
        correlationCtx.setLineDash([4 * scale, 4 * scale]);
        correlationCtx.moveTo(x_s, 0);
        correlationCtx.lineTo(x_s, h - marginBottom - axisPadding);
        correlationCtx.stroke();
        correlationCtx.setLineDash([]);
        
        // Labels
        correlationCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        correlationCtx.font = `${10 * scale}px sans-serif`;
        correlationCtx.fillText('r_s', x_s + (10 * scale), 2 * scale);
    }
    
    // Axis Names
    correlationCtx.fillStyle = '#aaa';
    correlationCtx.font = `italic ${12 * scale}px serif`;
    
    correlationCtx.textAlign = 'right';
    correlationCtx.textBaseline = 'middle';
    correlationCtx.fillText('ξ(r)', marginLeft - (5 * scale), 8 * scale); // Y-axis label

    correlationCtx.textAlign = 'right';
    correlationCtx.textBaseline = 'bottom';
    correlationCtx.fillText('r', w - (5 * scale), h - (8 * scale)); // X-axis label
}



// Sprite Cache
let galaxySprites = {};

function generateGalaxySprites() {
    if (!CONFIG || !CONFIG.GALAXY_COLORS) return;
    
    const size = 64; // Texture size
    const half = size / 2;
    
    CONFIG.GALAXY_COLORS.forEach(colorStr => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Parse color
        const [r, g, b] = colorStr.split(',').map(n => parseInt(n.trim()));
        
        // 1. Soft Glow (Radial Gradient)
        const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
        grad.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, 0.8)`);
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.2)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        
        // 2. Core (Brighter)
        ctx.beginPath();
        const coreRadius = CONFIG.GALAXY_SPRITE_CORE_RADIUS || 5;
        ctx.arc(half, half, coreRadius, 0, Math.PI*2); 
        ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
        ctx.fill();
        
        // 3. Particles / Dust
        // Add some random specks
        for(let i=0; i<20; i++) {
            const dist = Math.random() * half * 0.8;
            const angle = Math.random() * Math.PI * 2;
            const px = half + Math.cos(angle) * dist;
            const py = half + Math.sin(angle) * dist;
            const pSize = Math.random() * 1.5;
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.random() * 0.5 + 0.2})`;
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI*2);
            ctx.fill();
        }
        
        galaxySprites[colorStr] = canvas;
    });
}

function drawGalaxies(cx, cy, scale, growth, horizonScale, targetCtx = ctx, wrapSize = 0, renderType = 'points') {
    if (!state.galaxies || state.galaxies.length === 0) return;
    
    // Lazy Init Sprites
    if (Object.keys(galaxySprites).length === 0) {
        generateGalaxySprites();
    }

    // Capture the master alpha (transition opacity) passed from the caller
    const masterAlpha = targetCtx.globalAlpha;

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
                // Shift is proportional to the Y-component of the distance to center
                
                const dy = gy - sy;
                
                // Kaiser-like squashing:
                // Infall means galaxies move closer to center in Y-direction
                const rsdStrength = CONFIG.GRAVITY_STRENGTH * growth * CONFIG.RSD_FACTOR;
                gy = sy + dy * Math.max(CONFIG.RSD_MIN_SCALE, 1 - rsdStrength); 
                
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
            // Sprite Mode
            const sprite = galaxySprites[g.color];
            if (sprite) {
                // Use CONFIG parameters for size
                const size = (CONFIG.GALAXY_SPRITE_SIZE_MULTIPLIER || 4.0) * scale * g.sizeVar; 
                const drawRadius = Math.max(CONFIG.GALAXY_SPRITE_MIN_RADIUS || 3.0, size); // Semi-major axis
                
                // Use a fixed random factor per galaxy
                const brightnessVar = 0.8 + g.fogFactor * 0.4; 
                // Boost opacity slightly for sprites since they have transparency
                const boost = CONFIG.GALAXY_SPRITE_OPACITY_BOOST || 1.2;
                
                // Multiply by masterAlpha to respect the global transition (z=1100 -> z=5)
                targetCtx.globalAlpha = Math.max(0, Math.min(1, opacity * brightnessVar * boost)) * masterAlpha;
                
                const drawSingle = (tx, ty) => {
                    targetCtx.save();
                    targetCtx.translate(tx, ty);
                    targetCtx.rotate(g.rotation);
                    // Draw Image: (image, dx, dy, dWidth, dHeight)
                    // We draw centered at 0,0
                    // Width = 2 * drawRadius
                    // Height = 2 * drawRadius * eccentricity
                    targetCtx.drawImage(
                        sprite, 
                        -drawRadius, 
                        -drawRadius * g.eccentricity, 
                        drawRadius * 2, 
                        drawRadius * 2 * g.eccentricity
                    );
                    targetCtx.restore();
                };
                
                drawSingle(x, y);
                
                // Wrap for points
                if (wrapSize > 0) {
                    const xOffsets = [0];
                    if (x < drawRadius) xOffsets.push(wrapSize);
                    if (x > wrapSize - drawRadius) xOffsets.push(-wrapSize);
                    
                    const yOffsets = [0];
                    if (y < drawRadius) yOffsets.push(wrapSize);
                    if (y > wrapSize - drawRadius) yOffsets.push(-wrapSize);
                    
                    xOffsets.forEach(ox => {
                        yOffsets.forEach(oy => {
                            if (ox === 0 && oy === 0) return;
                            drawSingle(x + ox, y + oy);
                        });
                    });
                }
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
    let pSize;
    const z = Math.max(0.1, state.z);
    
    if (state.isComoving) {
        pSize = CONFIG.HEATMAP_PIXEL_SIZE_MAX;
    } else {
        // Interpolate from Max to Min (from z=5 to z=1000)
        const logZ = Math.log10(z);
        const logEnd = Math.log10(CONFIG.TRANSITION_Z_END);
        const logStart = 3.0; // log10(1000) - approx start of high-z
        
        const t = Math.max(0, Math.min(1, (logZ - logEnd) / (logStart - logEnd)));
        pSize = CONFIG.HEATMAP_PIXEL_SIZE_MAX - t * (CONFIG.HEATMAP_PIXEL_SIZE_MAX - CONFIG.HEATMAP_PIXEL_SIZE_MIN);
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
    // Match opacity logic with drawGalaxies to ensure consistency
    let opacity = Math.max(0.4, Math.min(1, growth + 0.2)); 
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
            const glowFactor = state.isComoving ? 0.5 : 1.0;

            // 1. Central Peak (High Density)
            g.addColorStop(0, `rgba(${CONFIG.CENTER_HOT_COLOR}, ${opacity * CONFIG.BAO_OPACITY_CENTER * glowFactor})`);
            g.addColorStop(centerRadius / maxRadius, `rgba(${CONFIG.CENTER_HALO_COLOR}, ${opacity * CONFIG.BAO_OPACITY_HALO * glowFactor})`);
            
            // 2. Gap (Low Density)
            g.addColorStop((r_vis - shellWidth) / maxRadius, `rgba(${CONFIG.RING_BASE_COLOR}, ${CONFIG.BAO_OPACITY_GAP})`);
            
            // 3. BAO Ring (Overdensity at Sound Horizon)
            g.addColorStop(r_vis / maxRadius, `rgba(${CONFIG.RING_GLOW_COLOR}, ${opacity * CONFIG.BAO_OPACITY_RING * glowFactor})`);
            
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
