/**
 * MenuScene - Animated title screen with parallax and particles
 */
import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;

        this.cameras.main.fadeIn(500, 10, 6, 18);

        // Sky background
        this.add.image(W / 2, H / 2, 'sky_grass').setScrollFactor(0);

        // Parallax layers with gentle sway
        this.bgFar = this.add.image(W / 2, H / 2, 'bgfar_grass').setScrollFactor(0).setAlpha(0.8);
        this.bgMid = this.add.image(W / 2, H / 2, 'bgmid_grass').setScrollFactor(0).setAlpha(0.7);
        this.bgNear = this.add.image(W / 2, H / 2, 'bgnear_grass').setScrollFactor(0).setAlpha(0.6);

        // Gentle parallax animation
        this.tweens.add({
            targets: this.bgFar,
            x: W / 2 + 3,
            duration: 4000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: this.bgMid,
            x: W / 2 + 5,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: this.bgNear,
            x: W / 2 - 4,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Wind particles
        this.windParticles = this.add.particles(0, 0, 'particle_leaf', {
            x: { min: 0, max: W },
            y: { min: 0, max: H },
            speedX: { min: 10, max: 30 },
            speedY: { min: -5, max: 5 },
            scale: { start: 1, end: 0.5 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 4000,
            frequency: 800,
            quantity: 1,
            rotate: { min: 0, max: 360 }
        });

        // Pollen particles
        this.pollenParticles = this.add.particles(0, 0, 'particle_pollen', {
            x: { min: 0, max: W },
            y: { min: 0, max: H },
            speedX: { min: 5, max: 15 },
            speedY: { min: -10, max: -2 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.4, end: 0 },
            lifespan: 5000,
            frequency: 400,
            quantity: 1
        });

        // Mountain emoji
        this.add.text(W / 2, H / 2 - 45, '🏔️', {
            fontSize: '20px'
        }).setOrigin(0.5);

        // Title
        const title = this.add.text(W / 2, H / 2 - 25, 'PROJECT\nPEAK', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 6,
            stroke: '#4a1a5e',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Title glow animation
        this.tweens.add({
            targets: title,
            alpha: { from: 0.8, to: 1 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Subtitle
        this.add.text(W / 2, H / 2 + 8, 'A Precision Platformer', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '4px',
            color: '#ffb347',
            align: 'center'
        }).setOrigin(0.5);

        // Start prompt
        const prompt = this.add.text(W / 2, H / 2 + 35, 'PRESS SPACE TO START', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '5px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: prompt,
            alpha: { from: 0.3, to: 1 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Controls info
        this.add.text(W / 2, H - 20, 'WASD/Arrows: Move   Space/Z: Jump   Shift/X: Dash', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '3px',
            color: '#8a7aaa',
            align: 'center'
        }).setOrigin(0.5);

        // Input handling
        this.input.keyboard.once('keydown-SPACE', () => this.startGame());
        this.input.keyboard.once('keydown-ENTER', () => this.startGame());
        this.input.keyboard.once('keydown-Z', () => this.startGame());
    }

    startGame() {
        this.cameras.main.fadeOut(500, 10, 6, 18);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene', { level: 0 });
        });
    }
}
