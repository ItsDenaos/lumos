// Bucle de paso fijo: la lógica avanza siempre a 60 Hz y el dibujo va al ritmo de la pantalla.

/** Acumulador de tiempo real que decide cuántos pasos de lógica tocan en cada fotograma. */
export class FixedStepper {
  private accumulator = 0;

  constructor(
    readonly dt: number,
    readonly maxFrameTime: number,
  ) {}

  /** Añade el tiempo real transcurrido (en segundos) y devuelve cuántos pasos ejecutar. */
  advance(elapsed: number): number {
    let frame = Math.min(Math.max(elapsed, 0), this.maxFrameTime);
    // En pantallas de 60 Hz el fotograma dura casi exactamente un paso: se ajusta para
    // que las pequeñas fluctuaciones no alternen fotogramas de 0 y 2 pasos.
    if (Math.abs(frame - this.dt) < 0.0005) frame = this.dt;
    this.accumulator += frame;
    let steps = 0;
    while (this.accumulator >= this.dt) {
      this.accumulator -= this.dt;
      steps++;
    }
    return steps;
  }

  /** Fracción (0..1) del siguiente paso ya transcurrida, para interpolar el dibujo. */
  get alpha(): number {
    return Math.min(1, this.accumulator / this.dt);
  }

  reset(): void {
    this.accumulator = 0;
  }
}

/** Arranca el bucle con requestAnimationFrame. Devuelve una función para detenerlo. */
export function startLoop(
  stepper: FixedStepper,
  update: (dt: number) => void,
  render: (alpha: number, frameTime: number) => void,
): () => void {
  let last = performance.now();
  let handle = 0;
  const frame = (now: number) => {
    const elapsed = (now - last) / 1000;
    last = now;
    const steps = stepper.advance(elapsed);
    for (let i = 0; i < steps; i++) update(stepper.dt);
    render(stepper.alpha, elapsed);
    handle = requestAnimationFrame(frame);
  };
  handle = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(handle);
}
