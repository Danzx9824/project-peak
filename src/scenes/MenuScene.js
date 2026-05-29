/**
 * MenuScene - PICO-8 style menu
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

        // Simple static sky
        this.add.image(W / 2, H / 2, 'sky_grass').setScrollFactor(0);

        // Wind particles (minimal)
        this.windParticles = this.add.particles(0, 0, 'particle_leaf', {
            x: { min: 0, max: W },
            y: { min: 0, max: H },
            speedX: { min: 20, max: 40 },
            speedY: { min: -2, max: 2 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 3000,
            frequency: 600,
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

        this.tweens.add({
            targets: title,
            alpha: { from: 0.8, to: 1 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Subtitle
        this.add.text(W / 2, H / 2 + 8, 'A PICO-8 Style Platformer', {
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
        this.add.text(W / 2, H - 20, 'WASD: Move   W: Jump   K: Dash', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '3px',
            color: '#e0e0f0',
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
