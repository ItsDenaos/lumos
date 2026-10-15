// Gestor de escenas: título, mapa, partida… Funciona como una pila: la pausa, los resultados
// o las opciones se apilan sobre la partida, y solo la escena de arriba recibe la lógica.

export interface Scene {
  enter?(): void;
  exit?(): void;
  /** Un paso de lógica a 60 Hz. */
  update(dt: number): void;
  /** Dibujo; alpha es la fracción del siguiente paso, para interpolar. */
  render(ctx: CanvasRenderingContext2D, alpha: number): void;
  /** La ventana perdió el foco o se cambió de pestaña. */
  onFocusLost?(): void;
}

export class SceneManager {
  private readonly stack: Scene[] = [];

  /** La escena de arriba. */
  get scene(): Scene | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  /** Cambia a otra escena, quitando todas las apiladas. */
  switchTo(scene: Scene): void {
    while (this.stack.length > 0) this.stack.pop()!.exit?.();
    this.stack.push(scene);
    scene.enter?.();
  }

  /** Pone una escena encima (la de abajo queda congelada). */
  push(scene: Scene): void {
    this.stack.push(scene);
    scene.enter?.();
  }

  /** Quita la escena de arriba y vuelve a la de debajo. */
  pop(): void {
    if (this.stack.length <= 1) return;
    this.stack.pop()!.exit?.();
  }

  update(dt: number): void {
    this.scene?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.scene?.render(ctx, alpha);
  }

  focusLost(): void {
    this.scene?.onFocusLost?.();
  }
}
