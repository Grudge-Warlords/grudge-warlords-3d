/**
 * RTSHUD — RTS mode HUD using Babylon.js GUI.
 */

import { Scene } from '@babylonjs/core/scene';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import { Control } from '@babylonjs/gui/2D/controls/control';

const GOLD = '#c5a059';
const DARK = 'rgba(10,10,26,0.85)';

export class RTSHUD {
  public gui: AdvancedDynamicTexture;
  private _titleText: TextBlock;
  private _selectionText: TextBlock;
  private _unitCountText: TextBlock;
  private _fpsText: TextBlock;

  constructor(scene: Scene) {
    this.gui = AdvancedDynamicTexture.CreateFullscreenUI('rtsHUD', true, scene);

    // ── Title ────────────────────────────────────────────
    this._titleText = new TextBlock('title', 'GRUDGE WARLORDS — RTS');
    this._titleText.color = GOLD;
    this._titleText.fontSize = 13;
    this._titleText.fontFamily = "'Oxanium', sans-serif";
    this._titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this._titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this._titleText.left = 10;
    this._titleText.top = 8;
    this.gui.addControl(this._titleText);

    // ── Selection info (bottom center) ──────────────────
    const bottomPanel = new StackPanel('bottomPanel');
    bottomPanel.isVertical = true;
    bottomPanel.width = '300px';
    bottomPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    bottomPanel.top = -10;
    this.gui.addControl(bottomPanel);

    const selBg = new Rectangle('selBg');
    selBg.width = '300px';
    selBg.height = '50px';
    selBg.background = DARK;
    selBg.color = `${GOLD}40`;
    selBg.thickness = 1;
    selBg.cornerRadius = 6;
    bottomPanel.addControl(selBg);

    this._selectionText = new TextBlock('selText', 'No units selected');
    this._selectionText.color = '#ccc';
    this._selectionText.fontSize = 12;
    this._selectionText.fontFamily = "'Oxanium', sans-serif";
    selBg.addControl(this._selectionText);

    // ── Unit count (top right) ──────────────────────────
    this._unitCountText = new TextBlock('unitCount', 'Units: 0');
    this._unitCountText.color = '#888';
    this._unitCountText.fontSize = 11;
    this._unitCountText.fontFamily = 'monospace';
    this._unitCountText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this._unitCountText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this._unitCountText.left = -10;
    this._unitCountText.top = 8;
    this.gui.addControl(this._unitCountText);

    // ── FPS (top right below unit count) ────────────────
    this._fpsText = new TextBlock('fps', 'FPS: --');
    this._fpsText.color = '#666';
    this._fpsText.fontSize = 10;
    this._fpsText.fontFamily = 'monospace';
    this._fpsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this._fpsText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this._fpsText.left = -10;
    this._fpsText.top = 22;
    this.gui.addControl(this._fpsText);
  }

  updateSelection(count: number, types: string[]): void {
    if (count === 0) {
      this._selectionText.text = 'Click to select units  ·  Right-click to move';
    } else {
      const typeStr = types.length > 0 ? types.join(', ') : '';
      this._selectionText.text = `${count} unit${count > 1 ? 's' : ''} selected${typeStr ? ' (' + typeStr + ')' : ''}`;
    }
  }

  updateUnitCount(player: number, enemy: number): void {
    this._unitCountText.text = `Friendly: ${player}  Enemy: ${enemy}`;
  }

  updateFPS(fps: number): void {
    this._fpsText.text = `FPS: ${Math.floor(fps)}`;
  }

  dispose(): void {
    this.gui.dispose();
  }
}
