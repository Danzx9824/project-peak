import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';

const config = {
    type: Phaser.WEBGL,
    width: 320,
    height: 180,
    parent: 'game-container',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    backgroundColor: '#1a0a2e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 700 },
            debug: false,
            tileBias: 24
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, MenuScene, GameScene],
    fps: {
        target: 60,
        forceSetTimeOut: false
    },
    render: {
        pixelArt: true,
        antialias: false,
        antialiasGL: false
    }
};

const game = new Phaser.Game(config);
