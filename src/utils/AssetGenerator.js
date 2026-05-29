/**
 * AssetGenerator - PICO-8 style pixel art assets (8x8 tiles, 16-color palette)
 */

const TILE = 8;

// PICO-8 inspired palette with pink/magenta theme
const PAL = {
    black:    '#1a1020',
    dkBlue:   '#2a1a4e',
    dkPurple: '#5a2a6a',
    dkGreen:  '#3a5a3a',
    brown:    '#6a4a2a',
    dkGray:   '#5a5a6a',
    gray:     '#9a9aaa',
    white:    '#f0e8f0',
    red:      '#e03048',
    orange:   '#f08030',
    yellow:   '#f0d040',
    green:    '#40c040',
    blue:     '#30a0e0',
    indigo:   '#6a6aaa',
    pink:     '#ff6b8a',
    peach:    '#ffb8a0'
};

export const THEMES = {
    grass: {
        name: 'Pink Sky',
        sky1: '#ff6b8a', sky2: '#d050a0', sky3: '#4a1a5e',
        ground: PAL.dkGreen, groundDark: '#2a4a2a', groundLight: '#e0f0e0',
        dirt: PAL.brown, dirtDark: '#4a3020',
        accent: PAL.yellow, spike: PAL.gray,
        leaf: '#50aa40', flower: PAL.pink
    },
    rock: {
        name: 'Rocky Cliffs',
        sky1: '#c050a0', sky2: '#6a2a7a', sky3: '#1a0a3e',
        ground: PAL.dkGray, groundDark: '#4a4a5a', groundLight: '#c0c0d0',
        dirt: '#5a4a3a', dirtDark: '#3a2a1a',
        accent: PAL.orange, spike: PAL.gray,
        leaf: '#7a6a4a', flower: PAL.orange
    },
    cloud: {
        name: 'Cloud Heights',
        sky1: '#ffa0c0', sky2: '#c0d0ff', sky3: '#2a1a4e',
        ground: PAL.gray, groundDark: '#8a8a9a', groundLight: '#e0e0f0',
        dirt: '#a090b0', dirtDark: '#706080',
        accent: PAL.blue, spike: '#a0b0c0',
        leaf: '#c0e0f0', flower: PAL.blue
    }
};

export function generateAllAssets(scene) {
    generatePlayerSprites(scene, true);
    generatePlayerSprites(scene, false);
    generateTilesets(scene);
    generateBackgrounds(scene);
    generateParticles(scene);
    generateUI(scene);
    generateCollectibles(scene);
}

// ──── Player Sprites (8x8) ────
function generatePlayerSprites(scene, hasDash) {
    const W = 8, H = 8;
    const hairColor = hasDash ? PAL.red : PAL.blue;

    const C = {
        'o': PAL.black,
        'H': hairColor,
        's': PAL.peach,
        'E': PAL.black,
        'B': PAL.blue,
        'b': '#4090d0',
        'P': PAL.dkBlue,
        'S': PAL.brown
    };

    // Idle (2 frames)
    const idle1 = [
        '.oHHHo..',
        'oHsssHo.',
        'osEsEso.',
        '.osss...',
        '.oBBBo..',
        '..oPo...',
        '..oPo...',
        '.oS.So..'
    ];
    const idle2 = [
        '.oHHHo..',
        'oHsssHo.',
        'osEsEso.',
        '.osss...',
        '.oBbBo..',
        '..oPo...',
        '..oPo...',
        '.oS.So..'
    ];

    // Run (4 frames)
    const run1 = [
        '.oHHHo..',
        'oHsssHo.',
        'osEsEso.',
        '.osss...',
        '.oBBBo..',
        '..oPo...',
        '.oP.Po..',
        '.oS.So..'
    ];
    const run2 = [
        '.oHHHo..',
        'oHsssHo.',
        'osEsEso.',
        '.osss...',
        '.oBBBo..',
        '.oP.Po..',
        '.oS..Po.',
        '.....So.'
    ];
    const run3 = [
        '.oHHHo..',
        'oHsssHo.',
        'osEsEso.',
        '.osss...',
        '.oBBBo..',
        '..oPo...',
        '..oPo...',
        '.oS.So..'
    ];
    const run4 = [
        '.oHHHo..',
        'oHsssHo.',
        'osEsEso.',
        '.osss...',
        '.oBBBo..',
        '.oP.Po..',
        '.oP..So.',
        '.So.....'
    ];

    // Jump
    const jump = [
        '.oHHHo..',
        'oHsssHo.',
        'osEsEso.',
        '.osss...',
        '.oBBBo..',
        '.oP.Po..',
        '.oS.So..',
        '........'
    ];

    // Fall
    const fall = [
        '........',
        '.oHHHo..',
        'oHsssHo.',
        'osEsEso.',
        '.osss...',
        '.oBBBo..',
        '.oP.Po..',
        '.oS.So..'
    ];

    // Dash
    const dash = [
        '.oHHHo..',
        'oHsssHo.',
        'osEsEso.',
        '.osss...',
        '.oBBBo..',
        '..oPo...',
        '..oPo...',
        '.oS.So..'
    ];

    const allFrames = [idle1, idle2, run1, run2, run3, run4, jump, fall, dash];
    const sheetW = allFrames.length * W;
    const sheetKey = hasDash ? 'player_sheet' : 'player_sheet_nodash';
    const canvas = scene.textures.createCanvas(sheetKey, sheetW, H);
    const ctx = canvas.getContext();

    allFrames.forEach((frame, fi) => {
        for (let y = 0; y < frame.length; y++) {
            for (let x = 0; x < frame[y].length; x++) {
                const ch = frame[y][x];
                if (ch !== '.' && C[ch]) {
                    ctx.fillStyle = C[ch];
                    ctx.fillRect(fi * W + x, y, 1, 1);
                }
            }
        }
    });
    canvas.refresh();

    for (let i = 0; i < allFrames.length; i++) {
        scene.textures.get(sheetKey).add(i, 0, i * W, 0, W, H);
    }

    scene.anims.create({
        key: `${sheetKey}_idle`,
        frames: [{ key: sheetKey, frame: 0 }, { key: sheetKey, frame: 1 }],
        frameRate: 3, repeat: -1
    });
    scene.anims.create({
        key: `${sheetKey}_run`,
        frames: [
            { key: sheetKey, frame: 2 }, { key: sheetKey, frame: 3 },
            { key: sheetKey, frame: 4 }, { key: sheetKey, frame: 5 }
        ],
        frameRate: 10, repeat: -1
    });
    scene.anims.create({
        key: `${sheetKey}_jump`,
        frames: [{ key: sheetKey, frame: 6 }],
        frameRate: 1, repeat: 0
    });
    scene.anims.create({
        key: `${sheetKey}_fall`,
        frames: [{ key: sheetKey, frame: 7 }],
        frameRate: 1, repeat: 0
    });
    scene.anims.create({
        key: `${sheetKey}_dash`,
        frames: [{ key: sheetKey, frame: 8 }],
        frameRate: 1, repeat: 0
    });
}

// ──── Tilesets (8x8 per tile) ────
function generateTilesets(scene) {
    Object.keys(THEMES).forEach(themeKey => {
        const t = THEMES[themeKey];
        const tileCount = 11;
        const canvas = scene.textures.createCanvas(`tiles_${themeKey}`, TILE * tileCount, TILE);
        const ctx = canvas.getContext();

        // Tile 0: Empty

        // Tile 1: Ground top
        ctx.fillStyle = t.groundDark;
        ctx.fillRect(1 * TILE, 0, TILE, TILE);
        ctx.fillStyle = t.ground;
        ctx.fillRect(1 * TILE, 2, TILE, TILE - 2);
        ctx.fillStyle = t.groundLight;
        ctx.fillRect(1 * TILE, 0, TILE, 2);
        ctx.fillStyle = t.groundDark;
        ctx.fillRect(1 * TILE + 2, 3, 1, 1);
        ctx.fillRect(1 * TILE + 6, 3, 1, 1);

        // Tile 2: Ground fill
        ctx.fillStyle = t.dirt;
        ctx.fillRect(2 * TILE, 0, TILE, TILE);
        ctx.fillStyle = t.dirtDark;
        ctx.fillRect(2 * TILE + 1, 2, 2, 2);
        ctx.fillRect(2 * TILE + 5, 5, 2, 2);

        // Tile 3: Spike up
        ctx.fillStyle = t.spike;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(3 * TILE + 4 - i, 2 + i, i * 2 + 1, 1);
        }
        ctx.fillStyle = PAL.white;
        ctx.fillRect(3 * TILE + 3, 3, 1, 1);

        // Tile 4: Spike down
        ctx.fillStyle = t.spike;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(4 * TILE + 4 - i, 5 - i, i * 2 + 1, 1);
        }

        // Tile 5: Spike left
        ctx.fillStyle = t.spike;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(5 * TILE + 2 + i, 4 - i, 1, i * 2 + 1);
        }

        // Tile 6: Spike right
        ctx.fillStyle = t.spike;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(6 * TILE + 5 - i, 4 - i, 1, i * 2 + 1);
        }

        // Tile 7: One-way platform
        ctx.fillStyle = t.groundLight;
        ctx.fillRect(7 * TILE, 0, TILE, 2);
        ctx.fillStyle = t.ground;
        ctx.fillRect(7 * TILE, 2, TILE, 1);
        ctx.fillStyle = t.accent;
        ctx.fillRect(7 * TILE + 2, 1, 1, 1);
        ctx.fillRect(7 * TILE + 5, 1, 1, 1);

        // Tile 8: Exit portal
        ctx.fillStyle = PAL.yellow;
        ctx.fillRect(8 * TILE + 2, 1, 4, 6);
        ctx.fillStyle = '#fff8d0';
        ctx.fillRect(8 * TILE + 3, 2, 2, 4);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(8 * TILE + 3, 3, 1, 1);

        // Tile 9: Checkpoint flag
        ctx.fillStyle = PAL.dkGray;
        ctx.fillRect(9 * TILE + 3, 1, 1, 7);
        ctx.fillStyle = t.accent;
        ctx.fillRect(9 * TILE + 4, 1, 3, 2);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(9 * TILE + 5, 1, 1, 1);

        // Tile 10: Crumbling block
        ctx.fillStyle = t.ground;
        ctx.fillRect(10 * TILE, 0, TILE, 3);
        ctx.fillStyle = t.groundDark;
        ctx.fillRect(10 * TILE, 2, TILE, 1);
        ctx.fillStyle = PAL.black;
        ctx.fillRect(10 * TILE + 2, 0, 1, 1);
        ctx.fillRect(10 * TILE + 5, 1, 1, 1);

        canvas.refresh();
        for (let i = 0; i < tileCount; i++) {
            scene.textures.get(`tiles_${themeKey}`).add(i, 0, i * TILE, 0, TILE, TILE);
        }
    });
}

// ──── Backgrounds (static gradient — single layer) ────
function generateBackgrounds(scene) {
    Object.keys(THEMES).forEach(themeKey => {
        const t = THEMES[themeKey];
        const W = 320, H = 180;

        // Single sky gradient (no parallax layers)
        const skyCanvas = scene.textures.createCanvas(`sky_${themeKey}`, W, H);
        const sCtx = skyCanvas.getContext();
        const grad = sCtx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, t.sky1);
        grad.addColorStop(0.5, t.sky2);
        grad.addColorStop(1, t.sky3);
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, W, H);

        // Stars
        sCtx.fillStyle = '#ffffff';
        for (let i = 0; i < 20; i++) {
            const sx = Math.floor(Math.random() * W);
            const sy = Math.floor(Math.random() * H * 0.5);
            sCtx.globalAlpha = 0.3 + Math.random() * 0.5;
            sCtx.fillRect(sx, sy, 1, 1);
        }
        sCtx.globalAlpha = 1;

        // Simple mountain silhouette at bottom
        sCtx.fillStyle = t.sky3;
        sCtx.globalAlpha = 0.4;
        sCtx.beginPath();
        sCtx.moveTo(0, H);
        const peaks = 6;
        for (let i = 0; i <= peaks; i++) {
            const px = (i / peaks) * W;
            const py = H - 30 + Math.sin(i * 2.1) * 20 + Math.cos(i * 0.8) * 10;
            sCtx.lineTo(px, py);
        }
        sCtx.lineTo(W, H);
        sCtx.closePath();
        sCtx.fill();
        sCtx.globalAlpha = 1;

        skyCanvas.refresh();
    });
}

// ──── Particles (1-2px, minimal) ────
function generateParticles(scene) {
    // Dust
    const dustC = scene.textures.createCanvas('particle_dust', 2, 2);
    const dCtx = dustC.getContext();
    dCtx.fillStyle = '#d0c8a0';
    dCtx.fillRect(0, 0, 2, 2);
    dustC.refresh();

    // Leaf
    const leafC = scene.textures.createCanvas('particle_leaf', 2, 2);
    const lCtx = leafC.getContext();
    lCtx.fillStyle = '#50aa40';
    lCtx.fillRect(0, 0, 2, 1);
    lCtx.fillRect(0, 1, 1, 1);
    leafC.refresh();

    // Pollen
    const pollenC = scene.textures.createCanvas('particle_pollen', 1, 1);
    const pCtx = pollenC.getContext();
    pCtx.fillStyle = '#fff8d0';
    pCtx.fillRect(0, 0, 1, 1);
    pollenC.refresh();

    // Death
    const deathC = scene.textures.createCanvas('particle_death', 2, 2);
    const deCtx = deathC.getContext();
    deCtx.fillStyle = PAL.red;
    deCtx.fillRect(0, 0, 2, 2);
    deathC.refresh();

    // Dash trail
    const trailC = scene.textures.createCanvas('particle_trail', 2, 2);
    const tCtx = trailC.getContext();
    tCtx.fillStyle = PAL.blue;
    tCtx.fillRect(0, 0, 2, 2);
    trailC.refresh();

    // Collect sparkle
    const sparkC = scene.textures.createCanvas('particle_sparkle', 2, 2);
    const spCtx = sparkC.getContext();
    spCtx.fillStyle = PAL.yellow;
    spCtx.fillRect(0, 0, 1, 1);
    spCtx.fillRect(1, 1, 1, 1);
    spCtx.fillStyle = PAL.white;
    spCtx.fillRect(1, 0, 1, 1);
    spCtx.fillRect(0, 1, 1, 1);
    sparkC.refresh();
}

// ──── UI Elements ────
function generateUI(scene) {
    // Death icon (tiny skull)
    const skullC = scene.textures.createCanvas('icon_death', 6, 6);
    const sCtx = skullC.getContext();
    sCtx.fillStyle = PAL.white;
    sCtx.fillRect(1, 0, 4, 4);
    sCtx.fillRect(0, 1, 6, 2);
    sCtx.fillStyle = PAL.black;
    sCtx.fillRect(1, 1, 1, 1);
    sCtx.fillRect(4, 1, 1, 1);
    sCtx.fillStyle = PAL.white;
    sCtx.fillRect(1, 4, 1, 2);
    sCtx.fillRect(3, 4, 1, 1);
    sCtx.fillRect(5, 4, 1, 1);
    skullC.refresh();

    // Berry icon
    const berryI = scene.textures.createCanvas('icon_berry', 6, 6);
    const bCtx = berryI.getContext();
    bCtx.fillStyle = PAL.red;
    bCtx.fillRect(1, 2, 4, 3);
    bCtx.fillRect(2, 5, 2, 1);
    bCtx.fillStyle = PAL.dkGreen;
    bCtx.fillRect(2, 0, 2, 2);
    bCtx.fillStyle = PAL.white;
    bCtx.fillRect(2, 3, 1, 1);
    berryI.refresh();
}

// ──── Collectibles ────
function generateCollectibles(scene) {
    // Strawberry (8x8)
    const berryC = scene.textures.createCanvas('item_strawberry', 8, 8);
    const ctx = berryC.getContext();

    ctx.fillStyle = PAL.red;
    ctx.fillRect(2, 2, 4, 4);
    ctx.fillRect(1, 3, 6, 2);
    ctx.fillRect(3, 6, 2, 1);

    ctx.fillStyle = '#f06080'; // highlight
    ctx.fillRect(2, 2, 1, 2);

    ctx.fillStyle = PAL.dkGreen; // leaves
    ctx.fillRect(3, 0, 2, 2);
    ctx.fillRect(2, 1, 1, 1);
    ctx.fillRect(5, 1, 1, 1);

    ctx.fillStyle = PAL.white; // seeds
    ctx.fillRect(2, 4, 1, 1);
    ctx.fillRect(5, 4, 1, 1);
    ctx.fillRect(4, 5, 1, 1);

    berryC.refresh();
}
