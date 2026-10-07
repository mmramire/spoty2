import { stdin, stdout } from 'node:process';
import { type Interface, createInterface } from 'node:readline/promises';
import { validateRedirectUri } from '@/business/auth/types.js';
import { dim, error, info } from './console.js';

let rl: Interface | null = null;

function getReadline(): Interface {
  if (!rl) {
    rl = createInterface({ input: stdin, output: stdout });
  }
  return rl;
}

function writeLine(message: string): void {
  stdout.write(`${message}\n`);
}

export async function prompt(text: string): Promise<string> {
  const readline = getReadline();
  const answer = await readline.question(text);
  return answer.trim();
}

export async function promptClientId(): Promise<string> {
  while (true) {
    const clientId = await prompt('Introduce tu SPOTIFY_CLIENT_ID: ');
    if (clientId.length > 0) {
      return clientId;
    }
    writeLine(error('El Client ID no puede estar vacío.'));
  }
}

export async function promptRedirectUri(): Promise<string> {
  while (true) {
    const redirectUri = await prompt(
      'Introduce tu SPOTIFY_REDIRECT_URI (ej. http://127.0.0.1:8888/callback): '
    );
    const validation = validateRedirectUri(redirectUri);
    if (validation.valid) {
      return redirectUri;
    }
    writeLine(error(validation.error ?? 'URI inválida'));
    writeLine(info('Debe usar http://127.0.0.1:puerto/callback (no localhost)'));
  }
}

export async function promptMenuChoice(): Promise<string> {
  const choice = await prompt('\nSelecciona una opción (0-5): ');
  const optionLabels: Record<string, string> = {
    '0': 'Salir',
    '1': 'Conectar con Spotify',
    '2': 'Ver estado de conexión',
    '3': '',
    '4': 'Descargar biblioteca',
    '5': 'Cerrar sesión',
  };
  if (optionLabels[choice]) {
    writeLine(dim(`  → ${optionLabels[choice]}`));
  }
  return choice;
}

export async function confirmExit(): Promise<boolean> {
  const answer = await prompt('¿Estás seguro de que quieres salir? (s/N): ');
  return answer.toLowerCase() === 's';
}

export function closeReadline(): void {
  if (rl) {
    rl.close();
    rl = null;
  }
}

export function showMessage(message: string): void {
  writeLine(message);
}

export function showError(message: string): void {
  writeLine(error(message));
}

export function showInfo(message: string): void {
  writeLine(info(message));
}

export function showDim(message: string): void {
  writeLine(dim(message));
}
