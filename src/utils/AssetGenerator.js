/**
 * AssetGenerator - Procedurally generates all pixel art assets
 */

const TILE = 16;

// Color palettes per theme
export const THEMES = {
    grass: {
        name: 'Grassy Base',
        sky1: '#ff6b8a', sky2: '#ffb347', sky3: '#4a1a5e',
        ground: '#4a7a3a', groundDark: '#3a5e2a', groundLight: '#6aaa4a',
        dirt: '#8a6a3a', dirtDark: '#6a4a2a',
        accent: '#e8d44a', spike: '#8a8a9a',
        bgFar: '#6a2a5a', bgMid: '#5a3a6a', bgNear: '#3a5a3a',
        leaf: '#5aaa3a', flower: '#e84a6a'
    },
    rock: {
        name: 'Rocky Cliffs',
        sky1: '#c44a8a', sky2: '#6a2a7a', sky3: '#1a0a3e',
        ground: '#7a7a8a', groundDark: '#5a5a6a', groundLight: '#9a9aaa',
        dirt: '#6a5a4a', dirtDark: '#4a3a2a',
        accent: '#e07a3a', spike: '#9a6a5a',
        bgFar: '#4a1a4a', bgMid: '#3a2a5a', bgNear: '#5a4a3a',
        leaf: '#8a7a5a', flower: '#e0873a'
    },
    cloud: {
        name: 'Cloud Heights',
        sky1: '#ffa0c0', sky2: '#c0d0ff', sky3: '#2a1a4e',
        ground: '#c0c0d0', groundDark: '#9a9ab0', groundLight: '#e0e0f0',
        dirt: '#b0a0c0', dirtDark: '#8a7a9a',
        accent: '#60d0e0', spike: '#a0b0c0',
        bgFar: '#c090c0', bgMid: '#9080b0', bgNear: '#a0a0c0',
        leaf: '#c0e0f0', flower: '#80d0e0'
    }
};

export function generateAllAssets(scene) {
    generatePlayerSprites(scene);
    generateTilesets(scene);
    generateBackgrounds(scene);
    generateParticles(scene);
    generateUI(scene);
}

// ──── Player Sprites ────
function generatePlayerSprites(scene) {
    const W = 12, H = 16;
    // Color palette
    const C = {
        outline: '#1a1020',
        hair: '#5a2030',
        hairLight: '#8a3040',
        skin: '#f0c090',
        skinDark: '#d0a070',
        eye: '#1a1030',
        eyeWhite: '#f0f0f0',
        body: '#3060c0',
        bodyLight: '#4080e0',
        bodyDark: '#2040a0',
        scarf: '#e03048',
        scarfDark: '#b02038',
        pants: '#2a3060',
        pantsLight: '#3a4080',
        shoes: '#4a3020',
        shoesLight: '#6a4a30'
    };

    // Pixel data for idle frame (12x16)
    const idleFrame = [
        '....oooo....',
        '...oHHHHo...',
        '..oHHhhHHo..',
        '..oHssssHo..',
        '..osEssEso..',
        '...ossso....',
        '...rrrr.....',
        '..oBBBBo....',
        '..oBbbBo....',
        '..oBBBBo....',
        '...oBBo.....',
        '...oPPo.....',
        '...oPPo.....',
        '..oP..Po....',
        '..oSooSo....',
        '............'
    ];

    const colorMap = {
        'o': C.outline, 'H': C.hair, 'h': C.hairLight,
        's': C.skin, 'S': C.shoes, 'E': C.eye,
        'B': C.body, 'b': C.bodyLight, 'r': C.scarf,
        'R': C.scarfDark, 'P': C.pants, 'p': C.pantsLight,
        'w': C.eyeWhite, 'd': C.skinDark, 'L': C.shoesLight
    };

    // Idle animation (2 frames - subtle breathing)
    const idleFrames = [idleFrame, createBreathFrame(idleFrame)];

    // Run animation (4 frames)
    const runFrames = createRunFrames(C, colorMap);

    // Jump frame
    const jumpFrame = [
        '....oooo....',
        '...oHHHHo...',
        '..oHHhhHHo..',
        '..oHssssHo..',
        '..osEssEso..',
        '...ossso....',
        '..rrrrr.....',
        '..oBBBBo....',
        '..oBbbBo....',
        '..oBBBBo....',
        '...oBBo.....',
        '..oP..Po....',
        '..oP..Po....',
        '..oSooSo....',
        '............',
        '............'
    ];

    // Fall frame
    const fallFrame = [
        '............',
        '....oooo....',
        '...oHHHHo...',
        '..oHHhhHHo..',
        '..oHssssHo..',
        '..osEssEso..',
        '...ossso....',
        '...rrrr.....',
        '..oBBBBo....',
        '..oBbbBo....',
        '..oBBBBo....',
        '...oBBo.....',
        '..oP..Po....',
        '..oP..Po....',
        '..oSooSo....',
        '............'
    ];

    // Dash frame
    const dashFrame = [
        '............',
        '....oooo....',
        '...oHHHHo...',
        '..oHHhhHHo..',
        '..oHssssHo..',
        '..osEssEso..',
        '...osssorrr.',
        '...oBBBBo...',
        '...oBbbBo...',
        '...oBBBBo...',
        '....oBBo....',
        '....oPPo....',
        '...oP..Po...',
        '...oSooSo...',
        '............',
        '............'
    ];

    // Generate sprite sheet texture (all frames in a row)
    const allFrames = [...idleFrames, ...runFrames, jumpFrame, fallFrame, dashFrame];
    const sheetWidth = allFrames.length * W;
    const canvas = scene.textures.createCanvas('player_sheet', sheetWidth, H);
    const ctx = canvas.getContext();

    allFrames.forEach((frame, fi) => {
        drawPixelFrame(ctx, frame, fi * W, 0, colorMap);
    });

    canvas.refresh();

    // Create frame data
    const frameNames = [];
    for (let i = 0; i < allFrames.length; i++) {
        scene.textures.get('player_sheet').add(i, 0, i * W, 0, W, H);
        frameNames.push(i);
    }

    // Define animations
    scene.anims.create({
        key: 'player_idle',
        frames: [{ key: 'player_sheet', frame: 0 }, { key: 'player_sheet', frame: 1 }],
        frameRate: 3, repeat: -1
    });

    scene.anims.create({
        key: 'player_run',
        frames: [
            { key: 'player_sheet', frame: 2 }, { key: 'player_sheet', frame: 3 },
            { key: 'player_sheet', frame: 4 }, { key: 'player_sheet', frame: 5 }
        ],
        frameRate: 10, repeat: -1
    });

    scene.anims.create({
        key: 'player_jump',
        frames: [{ key: 'player_sheet', frame: 6 }],
        frameRate: 1, repeat: 0
    });

    scene.anims.create({
        key: 'player_fall',
        frames: [{ key: 'player_sheet', frame: 7 }],
        frameRate: 1, repeat: 0
    });

    scene.anims.create({
        key: 'player_dash',
        frames: [{ key: 'player_sheet', frame: 8 }],
        frameRate: 1, repeat: 0
    });

    // Ghost sprite for dash trail
    const ghostCanvas = scene.textures.createCanvas('player_ghost', W, H);
    const gctx = ghostCanvas.getContext();
    drawPixelFrame(gctx, dashFrame, 0, 0, colorMap, 0.4);
    ghostCanvas.refresh();
}

function createBreathFrame(base) {
    const copy = [...base];
    // Slight shift in body area for breathing effect
    copy[8] = '..oBBbBo....';
    return copy;
}

function createRunFrames(C, colorMap) {
    const f1 = [
        '....oooo....',
        '...oHHHHo...',
        '..oHHhhHHo..',
        '..oHssssHo..',
        '..osEssEso..',
        '...ossso....',
        '...rrrr.....',
        '..oBBBBo....',
        '..oBbbBo....',
        '..oBBBBo....',
        '...oBBo.....',
        '...oPPo.....',
        '..oP..Po....',
        '..oSo.oSo...',
        '............',
        '............'
    ];
    const f2 = [
        '....oooo....',
        '...oHHHHo...',
        '..oHHhhHHo..',
        '..oHssssHo..',
        '..osEssEso..',
        '...ossso....',
        '...rrrr.....',
        '..oBBBBo....',
        '..oBbbBo....',
        '..oBBBBo....',
        '...oBBo.....',
        '..oPoPo.....',
        '..oSo.Po....',
        '......oSo...',
        '............',
        '............'
    ];
    const f3 = [
        '....oooo....',
        '...oHHHHo...',
        '..oHHhhHHo..',
        '..oHssssHo..',
        '..osEssEso..',
        '...ossso....',
        '...rrrr.....',
        '..oBBBBo....',
        '..oBbbBo....',
        '..oBBBBo....',
        '...oBBo.....',
        '...oPPo.....',
        '...oPPo.....',
        '..oSooSo....',
        '............',
        '............'
    ];
    const f4 = [
        '....oooo....',
        '...oHHHHo...',
        '..oHHhhHHo..',
        '..oHssssHo..',
        '..osEssEso..',
        '...ossso....',
        '...rrrr.....',
        '..oBBBBo....',
        '..oBbbBo....',
        '..oBBBBo....',
        '...oBBo.....',
        '....oPoPo...',
        '...oP.oSo...',
        '..oSo.......',
        '............',
        '............'
    ];
    return [f1, f2, f3, f4];
}

function drawPixelFrame(ctx, frame, ox, oy, colorMap, alpha = 1.0) {
    ctx.globalAlpha = alpha;
    for (let y = 0; y < frame.length; y++) {
        for (let x = 0; x < frame[y].length; x++) {
            const ch = frame[y][x];
            if (ch !== '.' && colorMap[ch]) {
                ctx.fillStyle = colorMap[ch];
                ctx.fillRect(ox + x, oy + y, 1, 1);
            }
        }
    }
    ctx.globalAlpha = 1.0;
}

// ──── Tilesets ────
function generateTilesets(scene) {
    Object.keys(THEMES).forEach(themeKey => {
        const t = THEMES[themeKey];
        const tileCount = 10;
        const canvas = scene.textures.createCanvas(`tiles_${themeKey}`, TILE * tileCount, TILE);
        const ctx = canvas.getContext();

        // Tile 0: Empty (nothing)

        // Tile 1: Solid ground top
        drawGroundTop(ctx, 1 * TILE, 0, t);

        // Tile 2: Solid ground middle
        drawGroundMid(ctx, 2 * TILE, 0, t);

        // Tile 3: Spike up
        drawSpike(ctx, 3 * TILE, 0, 'up', t);

        // Tile 4: Spike down
        drawSpike(ctx, 4 * TILE, 0, 'down', t);

        // Tile 5: Spike left
        drawSpike(ctx, 5 * TILE, 0, 'left', t);

        // Tile 6: Spike right
        drawSpike(ctx, 6 * TILE, 0, 'right', t);

        // Tile 7: Platform (one-way)
        drawPlatform(ctx, 7 * TILE, 0, t);

        // Tile 8: Exit portal
        drawExit(ctx, 8 * TILE, 0, t);

        // Tile 9: Checkpoint
        drawCheckpoint(ctx, 9 * TILE, 0, t);

        canvas.refresh();

        // Add individual tile frames
        for (let i = 0; i < tileCount; i++) {
            scene.textures.get(`tiles_${themeKey}`).add(i, 0, i * TILE, 0, TILE, TILE);
        }
    });
}

function drawGroundTop(ctx, x, y, t) {
    // Top surface with grass/detail
    ctx.fillStyle = t.groundDark;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = t.ground;
    ctx.fillRect(x, y + 2, TILE, TILE - 2);
    ctx.fillStyle = t.groundLight;
    ctx.fillRect(x, y, TILE, 3);
    // Detail pixels
    ctx.fillStyle = t.groundDark;
    for (let i = 0; i < TILE; i += 4) {
        ctx.fillRect(x + i, y + 4, 2, 1);
    }
    ctx.fillStyle = t.dirt;
    ctx.fillRect(x, y + TILE - 4, TILE, 4);
    // Edge highlight
    ctx.fillStyle = t.accent;
    ctx.fillRect(x + 2, y, 1, 1);
    ctx.fillRect(x + 7, y, 2, 1);
    ctx.fillRect(x + 13, y, 1, 1);
}

function drawGroundMid(ctx, x, y, t) {
    ctx.fillStyle = t.dirt;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = t.dirtDark;
    for (let i = 0; i < TILE; i += 5) {
        for (let j = 0; j < TILE; j += 4) {
            ctx.fillRect(x + i + (j % 3), y + j, 2, 2);
        }
    }
}

function drawSpike(ctx, x, y, dir, t) {
    ctx.fillStyle = t.spike;
    const cx = x + 8, cy = y + 8;
    switch (dir) {
        case 'up':
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(x + 8 - i, y + 4 + i, i * 2, 1);
            }
            ctx.fillStyle = '#e0e0f0';
            ctx.fillRect(x + 7, y + 5, 2, 2);
            break;
        case 'down':
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(x + 8 - i, y + 8 - i, i * 2, 1);
            }
            ctx.fillStyle = '#e0e0f0';
            ctx.fillRect(x + 7, y + 7, 2, 2);
            break;
        case 'left':
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(x + 4 + i, y + 8 - i, 1, i * 2);
            }
            break;
        case 'right':
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(x + 8 - i, y + 8 - i, 1, i * 2);
            }
            break;
    }
}

function drawPlatform(ctx, x, y, t) {
    ctx.fillStyle = t.groundLight;
    ctx.fillRect(x, y, TILE, 4);
    ctx.fillStyle = t.ground;
    ctx.fillRect(x, y + 1, TILE, 3);
    ctx.fillStyle = t.groundDark;
    ctx.fillRect(x, y + 3, TILE, 1);
    // Dots
    ctx.fillStyle = t.accent;
    ctx.fillRect(x + 3, y + 1, 1, 1);
    ctx.fillRect(x + 11, y + 1, 1, 1);
}

function drawExit(ctx, x, y, t) {
    // Glowing portal
    ctx.fillStyle = '#f0e060';
    ctx.fillRect(x + 4, y + 2, 8, 12);
    ctx.fillStyle = '#ffe090';
    ctx.fillRect(x + 5, y + 3, 6, 10);
    ctx.fillStyle = '#fff8d0';
    ctx.fillRect(x + 6, y + 4, 4, 8);
    // Stars
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 7, y + 6, 2, 2);
}

function drawCheckpoint(ctx, x, y, t) {
    // Flag pole
    ctx.fillStyle = '#8a7a6a';
    ctx.fillRect(x + 7, y + 2, 2, 14);
    // Flag
    ctx.fillStyle = t.accent;
    ctx.fillRect(x + 9, y + 2, 5, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 10, y + 3, 2, 2);
}

// ──── Background Layers ────
function generateBackgrounds(scene) {
    Object.keys(THEMES).forEach(themeKey => {
        const t = THEMES[themeKey];
        const W = 320, H = 180;

        // Layer 0: Sky gradient
        const skyCanvas = scene.textures.createCanvas(`sky_${themeKey}`, W, H);
        const sCtx = skyCanvas.getContext();
        const grad = sCtx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, t.sky1);
        grad.addColorStop(0.5, t.sky2);
        grad.addColorStop(1, t.sky3);
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, W, H);
        // Sun/moon
        sCtx.fillStyle = '#ffe8b0';
        sCtx.beginPath();
        sCtx.arc(240, 40, 20, 0, Math.PI * 2);
        sCtx.fill();
        sCtx.fillStyle = '#fff4d8';
        sCtx.beginPath();
        sCtx.arc(240, 40, 15, 0, Math.PI * 2);
        sCtx.fill();
        // Stars
        sCtx.fillStyle = '#ffffff';
        for (let i = 0; i < 30; i++) {
            const sx = Math.random() * W;
            const sy = Math.random() * H * 0.6;
            sCtx.globalAlpha = 0.3 + Math.random() * 0.7;
            sCtx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
        }
        sCtx.globalAlpha = 1;
        skyCanvas.refresh();

        // Layer 1: Far mountains
        const farCanvas = scene.textures.createCanvas(`bgfar_${themeKey}`, W, H);
        const fCtx = farCanvas.getContext();
        drawMountainLayer(fCtx, W, H, t.bgFar, 0.3, 60, 3);
        farCanvas.refresh();

        // Layer 2: Mid mountains
        const midCanvas = scene.textures.createCanvas(`bgmid_${themeKey}`, W, H);
        const mCtx = midCanvas.getContext();
        drawMountainLayer(mCtx, W, H, t.bgMid, 0.5, 80, 5);
        midCanvas.refresh();

        // Layer 3: Near silhouettes (trees/rocks)
        const nearCanvas = scene.textures.createCanvas(`bgnear_${themeKey}`, W, H);
        const nCtx = nearCanvas.getContext();
        drawNearLayer(nCtx, W, H, t.bgNear, themeKey);
        nearCanvas.refresh();
    });
}

function drawMountainLayer(ctx, W, H, color, opacity, baseY, peakCount) {
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    const segW = W / peakCount;
    for (let i = 0; i <= peakCount; i++) {
        const px = i * segW;
        const py = baseY + Math.sin(i * 1.5) * 30 + Math.cos(i * 0.7) * 20;
        if (i === 0) ctx.lineTo(0, py);
        else ctx.lineTo(px, py);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawNearLayer(ctx, W, H, color, theme) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = color;
    if (theme === 'grass') {
        // Trees
        for (let i = 0; i < 8; i++) {
            const tx = i * 45 + 10;
            const th = 30 + Math.random() * 20;
            const tw = 8 + Math.random() * 6;
            // Trunk
            ctx.fillRect(tx + tw / 2 - 1, H - th, 3, th);
            // Canopy
            for (let j = 0; j < 3; j++) {
                const cw = tw - j * 2;
                ctx.fillRect(tx + j, H - th - 5 + j * 3, cw, 6);
            }
        }
    } else if (theme === 'rock') {
        // Rocky pillars
        for (let i = 0; i < 6; i++) {
            const rx = i * 60 + 5;
            const rh = 40 + Math.random() * 30;
            ctx.fillRect(rx, H - rh, 15 + Math.random() * 10, rh);
        }
    } else {
        // Clouds
        for (let i = 0; i < 5; i++) {
            const cx = i * 70 + 10;
            const cy = H - 40 + Math.random() * 20;
            drawCloud(ctx, cx, cy);
        }
    }
    ctx.globalAlpha = 1;
}

function drawCloud(ctx, x, y) {
    ctx.fillRect(x, y, 20, 6);
    ctx.fillRect(x + 3, y - 3, 14, 3);
    ctx.fillRect(x - 2, y + 2, 24, 4);
}

// ──── Particles ────
function generateParticles(scene) {
    // Dust particle
    const dustCanvas = scene.textures.createCanvas('particle_dust', 4, 4);
    const dCtx = dustCanvas.getContext();
    dCtx.fillStyle = '#d0c8a0';
    dCtx.fillRect(1, 1, 2, 2);
    dCtx.fillStyle = '#e0d8b0';
    dCtx.fillRect(1, 1, 1, 1);
    dustCanvas.refresh();

    // Leaf particle
    const leafCanvas = scene.textures.createCanvas('particle_leaf', 4, 4);
    const lCtx = leafCanvas.getContext();
    lCtx.fillStyle = '#6aaa4a';
    lCtx.fillRect(0, 1, 3, 2);
    lCtx.fillStyle = '#4a8a3a';
    lCtx.fillRect(1, 0, 1, 1);
    lCtx.fillRect(2, 2, 1, 1);
    leafCanvas.refresh();

    // Wind/pollen particle
    const pollenCanvas = scene.textures.createCanvas('particle_pollen', 2, 2);
    const pCtx = pollenCanvas.getContext();
    pCtx.fillStyle = '#fff8d0';
    pCtx.fillRect(0, 0, 2, 2);
    pollenCanvas.refresh();

    // Death particle
    const deathCanvas = scene.textures.createCanvas('particle_death', 3, 3);
    const deCtx = deathCanvas.getContext();
    deCtx.fillStyle = '#ff4060';
    deCtx.fillRect(0, 0, 3, 3);
    deathCanvas.refresh();

    // Dash trail particle
    const trailCanvas = scene.textures.createCanvas('particle_trail', 3, 3);
    const tCtx = trailCanvas.getContext();
    tCtx.fillStyle = '#80c0ff';
    tCtx.fillRect(0, 0, 3, 3);
    tCtx.fillStyle = '#c0e0ff';
    tCtx.fillRect(1, 1, 1, 1);
    trailCanvas.refresh();
}

// ──── UI Elements ────
function generateUI(scene) {
    // Death icon (skull)
    const skullCanvas = scene.textures.createCanvas('icon_death', 8, 8);
    const sCtx = skullCanvas.getContext();
    sCtx.fillStyle = '#ffffff';
    sCtx.fillRect(1, 0, 6, 6);
    sCtx.fillRect(0, 1, 8, 4);
    sCtx.fillStyle = '#1a1020';
    sCtx.fillRect(2, 2, 1, 2);
    sCtx.fillRect(5, 2, 1, 2);
    sCtx.fillStyle = '#ffffff';
    sCtx.fillRect(2, 6, 1, 2);
    sCtx.fillRect(4, 6, 1, 2);
    sCtx.fillRect(6, 6, 1, 1);
    skullCanvas.refresh();
}
