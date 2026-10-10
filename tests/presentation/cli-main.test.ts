import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

// Doble de entrada para poder invocar el modo interactivo desde la prueba sin abrir una
// terminal real. El resto de funciones del módulo (showMessage, showError, prompt, etc.)
// se conservan tal cual.
vi.mock('@/presentation/prompts.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/presentation/prompts.js')>();
  return {
    ...original,
    promptMenuChoice: vi.fn(async () => '0'),
    confirmExit: vi.fn(async () => true),
  };
});

function leerFuente(rutaRelativa: string): string {
  return readFileSync(new URL(`../../${rutaRelativa}`, import.meta.url), 'utf8');
}

describe('TC-016 — Punto de entrada del CLI sin efectos secundarios (TASK-010)', () => {
  it('importar el módulo de lógica no ejecuta el arranque, no escribe en consola ni termina el proceso', async () => {
    const escrituras = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const terminacion = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    try {
      const logica = await import('@/cli-main.js');
      expect(logica).toBeDefined();
      expect(terminacion).not.toHaveBeenCalled();
      expect(escrituras).not.toHaveBeenCalled();
    } finally {
      escrituras.mockRestore();
      terminacion.mockRestore();
    }
  });

  it('exporta main, handleCommand, runInteractiveMode y showHelp invocables desde la prueba', async () => {
    const { handleCommand, main, runInteractiveMode, showHelp } = await import('@/cli-main.js');

    expect(typeof main).toBe('function');
    expect(typeof handleCommand).toBe('function');
    expect(typeof runInteractiveMode).toBe('function');
    expect(typeof showHelp).toBe('function');

    const escrituras = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const argvOriginal = process.argv;
    process.argv = ['node', 'spoty', '--help'];
    try {
      expect(await main()).toBe(0);
      const ayuda = escrituras.mock.calls.map((llamada) => String(llamada[0])).join('');
      expect(ayuda).toContain('Uso:');
      expect(ayuda).toContain('  spoty [comando]');
      expect(ayuda).toContain('Modo interactivo:');

      escrituras.mockClear();
      expect(await handleCommand('comando-inexistente')).toBe(-1);
      expect(escrituras).not.toHaveBeenCalled();

      escrituras.mockClear();
      expect(await showHelp()).toBe(0);

      escrituras.mockClear();
      expect(await runInteractiveMode()).toBe(0);
      const salida = escrituras.mock.calls.map((llamada) => String(llamada[0])).join('');
      expect(salida).toContain('¡Hasta luego!');
    } finally {
      process.argv = argvOriginal;
      escrituras.mockRestore();
    }
  });

  it('src/cli.ts conserva exclusivamente el arranque y los códigos de salida actuales', () => {
    const arranque = leerFuente('src/cli.ts');
    const logica = leerFuente('src/cli-main.ts');

    expect(arranque).toContain("from './cli-main.js'");
    expect(arranque).toContain('main()');
    expect(arranque).toContain('.then((code) => process.exit(code))');
    expect(arranque).toContain('process.exit(1)');
    expect(arranque).not.toContain('async function main');
    expect(arranque).not.toContain('async function handleCommand');
    expect(arranque).not.toContain('async function runInteractiveMode');
    expect(arranque).not.toContain('async function showHelp');
    expect(arranque).not.toContain('business/');

    expect(logica).toContain('async function main');
    expect(logica).toContain('async function handleCommand');
    expect(logica).toContain('async function runInteractiveMode');
    expect(logica).toContain('async function showHelp');
    expect(logica).toContain('AuthErrorType.CONFIG');
    expect(logica).toContain('AuthErrorType.PORT_IN_USE');

    const empaquetado = JSON.parse(leerFuente('package.json')) as {
      bin?: Record<string, string>;
    };
    expect(empaquetado.bin?.spoty).toBe('dist/cli.js');
  });
});
