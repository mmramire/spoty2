import { AuthError, AuthErrorType, isCancelledError } from './business/auth/errors.js';
import { checkExistingSession, runAuthFlow } from './business/auth/flow.js';
import { getUserProfile } from './business/auth/profile.js';
import { clearStoredTokens, getStoredTokens } from './business/auth/tokens.js';
import { type AuthConfig, getAuthConfig } from './business/auth/types.js';
import {
  blank,
  bold,
  confirm,
  dim,
  divider,
  error,
  info,
  section,
  startSpinner,
  step,
  stopSpinner,
  stopSpinnerWithError,
  warning,
} from './presentation/console.js';
import { MESSAGES } from './presentation/messages.js';
import {
  closeReadline,
  confirmExit,
  prompt,
  promptClientId,
  promptMenuChoice,
  promptRedirectUri,
  showError,
  showMessage,
} from './presentation/prompts.js';

async function ensureConfig(): Promise<AuthConfig> {
  try {
    return getAuthConfig();
  } catch {
    showMessage(error('Configuración incompleta. Necesitas configurar las variables de entorno.'));
    showMessage(info('Obtén tus credenciales en: https://developer.spotify.com/dashboard'));
    const clientId = await promptClientId();
    const redirectUri = await promptRedirectUri();
    process.env.SPOTIFY_CLIENT_ID = clientId;
    process.env.SPOTIFY_REDIRECT_URI = redirectUri;
    showMessage(confirm(MESSAGES.config.configSaved));
    return getAuthConfig();
  }
}

async function handleConnect(): Promise<void> {
  showMessage(section('Conexión a Spotify'));
  const config = await ensureConfig();

  showMessage(step(MESSAGES.auth.starting));

  const existingSession = await checkExistingSession();
  if (existingSession) {
    showMessage(
      confirm(
        MESSAGES.auth.sessionValid(
          existingSession.profile.display_name,
          existingSession.profile.email
        )
      )
    );
    showMessage(blank());
    return;
  }

  showMessage(step(MESSAGES.auth.openingBrowser));

  startSpinner(MESSAGES.auth.waitingCallback);

  try {
    const { profile } = await runAuthFlow(config);
    stopSpinner(confirm(MESSAGES.auth.success(profile.display_name, profile.email)));
  } catch (err) {
    if (isCancelledError(err)) {
      stopSpinner();
      showMessage(MESSAGES.auth.cancelled);
    } else if (err instanceof AuthError) {
      stopSpinnerWithError(MESSAGES.errors.generic(err.message));
      throw err;
    } else {
      stopSpinnerWithError(MESSAGES.errors.generic('Error desconocido'));
      throw err;
    }
  }
  showMessage(blank());
}

async function handleStatus(): Promise<void> {
  showMessage(section('Estado de Conexión'));
  const tokens = getStoredTokens();
  if (!tokens) {
    showMessage(warning(MESSAGES.errors.configRequired));
    showMessage(blank());
    return;
  }

  try {
    const profile = await getUserProfile(tokens.access_token);
    showMessage(confirm(MESSAGES.auth.sessionValid(profile.display_name, profile.email)));
  } catch (err) {
    if (err instanceof AuthError && err.type === AuthErrorType.TOKEN_EXPIRED) {
      showMessage(warning(MESSAGES.auth.sessionExpired));
    } else if (err instanceof AuthError && err.type === AuthErrorType.OAUTH_INVALID) {
      showMessage(warning(MESSAGES.auth.sessionInvalid));
    } else {
      showMessage(error('Error al verificar sesión.'));
    }
  }
  showMessage(blank());
}

async function handleLogout(): Promise<void> {
  showMessage(section('Cerrar Sesión'));
  const confirmLogout = await prompt(MESSAGES.auth.logoutConfirm);
  if (confirmLogout.toLowerCase() !== 's') {
    showMessage(info('Cancelado.'));
    showMessage(blank());
    return;
  }
  clearStoredTokens();
  showMessage(confirm(MESSAGES.auth.logoutSuccess));
  showMessage(blank());
}

async function showMenu(): Promise<void> {
  showMessage(divider());
  showMessage(bold('Menú Principal'));
  showMessage(MESSAGES.menu.title);
  showMessage(MESSAGES.menu.connect);
  showMessage(MESSAGES.menu.status);
  showMessage(MESSAGES.menu.logout);
  showMessage(MESSAGES.menu.exit);
  showMessage(dim(MESSAGES.menu.hint));
}

function getExitCodeForError(err: AuthError): number {
  return err.type === AuthErrorType.CONFIG ? 2 : err.type === AuthErrorType.PORT_IN_USE ? 3 : 1;
}

async function handleCommand(command: string): Promise<number> {
  try {
    switch (command) {
      case 'connect':
        await handleConnect();
        return 0;
      case 'status':
        await handleStatus();
        return 0;
      case 'logout':
        await handleLogout();
        return 0;
      default:
        return -1;
    }
  } catch (err) {
    if (isCancelledError(err)) {
      showMessage(MESSAGES.auth.cancelled);
      return 0;
    }
    if (err instanceof AuthError) {
      showError(MESSAGES.errors.generic(err.message));
      return getExitCodeForError(err);
    }
    showError(MESSAGES.errors.generic('Error desconocido'));
    return 1;
  }
}

async function runInteractiveMode(): Promise<number> {
  showMessage(section('Conexión a Spotify'));
  while (true) {
    await showMenu();
    const choice = await promptMenuChoice();

    switch (choice) {
      case '1': {
        const result = await handleCommand('connect');
        if (result !== 0) return result;
        break;
      }
      case '2':
        await handleStatus();
        break;
      case '3':
        await handleLogout();
        break;
      case '4': {
        if (await confirmExit()) {
          showMessage('¡Hasta luego!');
          closeReadline();
          return 0;
        }
        break;
      }
      default:
        showError(MESSAGES.errors.invalidOption);
    }

    if (choice !== '4') {
      showMessage(divider());
      showMessage(info('Volviendo al menú principal...'));
      showMessage(blank());
    }
  }
}

async function showHelp(): Promise<number> {
  showMessage(section('spoty - Conexión a Spotify'));
  showMessage(bold('Uso:'));
  showMessage('  spoty [comando]');
  showMessage('');
  showMessage(bold('Comandos:'));
  showMessage('  connect   Iniciar flujo de conexión con Spotify');
  showMessage('  status    Ver estado de la conexión actual');
  showMessage('  logout    Cerrar sesión y borrar tokens guardados');
  showMessage('  --help    Mostrar esta ayuda');
  showMessage('');
  showMessage(bold('Variables de entorno:'));
  showMessage('  SPOTIFY_CLIENT_ID     Client ID de tu app en Spotify Dashboard');
  showMessage('  SPOTIFY_REDIRECT_URI  URI de redirección (http://127.0.0.1:puerto/callback)');
  showMessage('');
  showMessage(bold('Modo interactivo:'));
  showMessage('  Ejecuta "spoty" sin argumentos para entrar al menú interactivo');
  return 0;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    return showHelp();
  }

  if (args[0]) {
    return handleCommand(args[0]);
  }

  return runInteractiveMode();
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    showError(MESSAGES.errors.generic(err instanceof Error ? err.message : 'Error desconocido'));
    process.exit(1);
  });
