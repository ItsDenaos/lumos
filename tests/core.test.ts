import { describe, expect, it } from 'vitest';
import { Input } from '../src/core/input';
import { FixedStepper } from '../src/core/loop';
import { artPixelSize } from '../src/core/screen';

describe('bucle de paso fijo', () => {
  const dt = 1 / 60;

  it('ejecuta un paso por fotograma a 60 Hz aunque haya pequeñas fluctuaciones', () => {
    const stepper = new FixedStepper(dt, 0.25);
    const frames = [16.6, 16.8, 16.5, 16.9, 16.7, 16.6].map((ms) => ms / 1000);
    expect(frames.map((f) => stepper.advance(f))).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('acumula el tiempo en pantallas rápidas (144 Hz)', () => {
    const stepper = new FixedStepper(dt, 0.25);
    let steps = 0;
    for (let i = 0; i < 144; i++) steps += stepper.advance(1 / 144);
    expect(steps).toBeGreaterThanOrEqual(59);
    expect(steps).toBeLessThanOrEqual(60);
    expect(stepper.alpha).toBeGreaterThanOrEqual(0);
    expect(stepper.alpha).toBeLessThanOrEqual(1);
  });

  it('limita el tiempo a 0,25 s al volver de otra pestaña', () => {
    const stepper = new FixedStepper(dt, 0.25);
    expect(stepper.advance(5)).toBe(15);
  });
});

describe('teclado', () => {
  it('detecta el recién pulsado una sola vez e ignora la autorepetición', () => {
    const input = new Input();
    input.keyDown('KeyW');
    input.beginStep();
    expect(input.wasPressed('KeyW')).toBe(true);
    input.keyDown('KeyW', true);
    input.beginStep();
    expect(input.wasPressed('KeyW')).toBe(false);
    expect(input.isDown('KeyW')).toBe(true);
  });

  it('una pulsación entre dos pasos no se pierde', () => {
    const input = new Input();
    input.keyDown('ArrowUp');
    input.keyUp('ArrowUp');
    input.beginStep();
    expect(input.wasPressed('ArrowUp')).toBe(true);
    expect(input.isDown('ArrowUp')).toBe(false);
  });

  it('al perder el foco se sueltan todas las teclas', () => {
    const input = new Input();
    input.keyDown('KeyA');
    input.keyDown('ArrowRight');
    input.releaseAll();
    input.beginStep();
    expect(input.controlsFor('lu').left).toBe(false);
    expect(input.controlsFor('mos').right).toBe(false);
  });

  it('cada jugador usa su lado del teclado', () => {
    const input = new Input();
    input.keyDown('KeyD');
    input.keyDown('KeyW');
    input.keyDown('ArrowLeft');
    input.beginStep();
    expect(input.controlsFor('lu')).toMatchObject({ right: true, jumpPressed: true, left: false });
    expect(input.controlsFor('mos')).toMatchObject({ left: true, jumpPressed: false, right: false });
  });
});

describe('escalado de la pantalla', () => {
  it('usa un número entero de píxeles por píxel del arte cuando se pierde poco tamaño', () => {
    // 1920 × 1080: justo 3 píxeles por píxel del arte.
    expect(artPixelSize(1.5, 1)).toBe(3);
    // 1366 × 768: 2,13 → 2 (se encoge un 6 %).
    expect(artPixelSize(1366 / 1280, 1)).toBe(2);
    // Con pantalla de alta densidad cuentan los píxeles reales.
    expect(artPixelSize(1, 2)).toBe(4);
  });

  it('llena la ventana si el entero la encogería demasiado', () => {
    const exact = (1366 / 1280) * 1.25 * 2;
    expect(artPixelSize(1366 / 1280, 1.25)).toBeCloseTo(exact, 6);
  });
});
