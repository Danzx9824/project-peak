/**
 * BootScene - Generates assets
 */
import Phaser from 'phaser';
import { generateAllAssets } from '../utils/AssetGenerator.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;

        this.cameras.main.setBackgroundColor('#1a1020');

        const titleText = this.add.text(W / 2, H / 2 - 20, 'PROJECT PEAK', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#ff6b8a',
            align: 'center'
        }).setOrigin(0.5);

        const loadText = this.add.text(W / 2, H / 2 + 5, 'Loading...', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        const barW = 100;
        const barH = 4;
        const barX = W / 2 - barW / 2;
        const barY = H / 2 + 18;

        const barBg = this.add.rectangle(W / 2, barY + barH / 2, barW, barH, 0x2a1a4e);
        const barFill = this.add.rectangle(barX, barY + barH / 2, 0, barH, 0xff6b8a).setOrigin(0, 0.5);

        this.time.delayedCall(100, () => {
            barFill.width = barW * 0.3;
            
            this.time.delayedCall(50, () => {
                generateAllAssets(this);
                barFill.width = barW * 0.8;

                this.time.delayedCall(100, () => {
                    barFill.width = barW;
                    loadText.setText('Ready!');

                    this.time.delayedCall(200, () => {
                        this.cameras.main.fadeOut(300, 10, 6, 18);
                        this.cameras.main.once('camerafadeoutcomplete', () => {
                            this.scene.start('MenuScene');
                        });
                    });
                });
            });
        });
    }
}
