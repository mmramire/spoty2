# language: es

@download-songs @happy-path
Característica: Descarga de biblioteca de canciones guardadas
  Como usuario autenticado de Spotify
  Quiero descargar mi biblioteca completa de canciones guardadas ("Me gusta")
  Para tener un respaldo local en formato JSON con fecha de descarga

  @AC-001 @must
  Escenario: Descarga exitosa de biblioteca con tracks
    Dado que tengo una sesión válida de Spotify con scope "user-library-read"
    Y mi biblioteca tiene 150 canciones guardadas
    Cuando ejecuto "spoty download-songs"
    Entonces el comando finaliza con código de salida 0
    Y se crea un archivo "YYYY-MM-DD-download_songs.json" en el directorio actual
    Y el archivo contiene JSON válido con estructura:
      | campo              | tipo     | descripción                    |
      | metadata           | objeto   | metadatos de la descarga       |
      | metadata.downloadedAt | string | timestamp ISO 8601 UTC        |
      | metadata.totalTracks | integer | 150                           |
      | metadata.spotifyUserId | string | mi user ID de Spotify         |
      | metadata.spotifyDisplayName | string | mi nombre de display       |
      | metadata.version   | string   | "1.0"                          |
      | tracks             | array    | 150 elementos                  |
    Y cada elemento en tracks tiene:
      | campo       | tipo     | descripción                    |
      | addedAt     | string   | cuándo guardé la canción       |
      | track       | objeto   | TrackObject completo Spotify   |
    Y se muestra en consola: "¡Descarga completada! 150 tracks guardados en YYYY-MM-DD-download_songs.json"
    Y en data/app.log hay entrada INFO con "Download completed: 150 tracks"

  @AC-002 @must
  Escenario: Descarga de biblioteca vacía (0 tracks)
    Dado que tengo una sesión válida de Spotify
    Y mi biblioteca no tiene canciones guardadas (0 tracks)
    Cuando ejecuto "spoty download-songs"
    Entonces el comando finaliza con código de salida 0
    Y se crea un archivo "YYYY-MM-DD-download_songs.json"
    Y el archivo contiene: {"metadata":{"totalTracks":0,...},"tracks":[]}
    Y se muestra en consola: "Tu biblioteca está vacía. Archivo creado con 0 tracks."

  @AC-003 @must
  Escenario: Nombre de archivo incluye fecha actual en formato ISO
    Dado que hoy es 15 de enero de 2026
    Y tengo una sesión válida con canciones guardadas
    Cuando ejecuto "spoty download-songs"
    Entonces el archivo creado se llama "2026-01-15-download_songs.json"
    Y el campo metadata.downloadedAt contiene timestamp de hoy (ej: "2026-01-15T14:30:45.123Z")

  @AC-004 @must
  Escenario: Estructura de track incluye todos los campos requeridos
    Dado que tengo una sesión válida con al menos 1 canción guardada
    Cuando ejecuto "spoty download-songs"
    Entonces cada track en el JSON tiene:
      | campo track            | presente | ejemplo                           |
      | track.id               | sí       | "4iV5W9uYEdYUVa79Axb7Rh"         |
      | track.name             | sí       | "Bohemian Rhapsody"              |
      | track.durationMs       | sí       | 354000                           |
      | track.explicit         | sí       | false                            |
      | track.popularity       | sí       | 85                               |
      | track.artists[]        | sí       | [{id, name, externalUrls}]       |
      | track.album            | sí       | {id, name, releaseDate, images[]}|
      | track.externalUrls     | sí       | {spotify: "https://open.spotify.com/track/..."} |
      | track.previewUrl       | sí (nullable) | string o null                 |
      | track.uri              | sí       | "spotify:track:4iV5W9uYEdYUVa79Axb7Rh" |

  @AC-005 @must
  Escenario: Manejo de rate limit HTTP 429 con Retry-After
    Dado que tengo una sesión válida
    Y la API de Spotify devuelve HTTP 429 con cabecera "Retry-After: 2" en la 3ra página
    Cuando ejecuto "spoty download-songs"
    Entonces el sistema espera 2 segundos y reintenta la misma request
    Y si el reintento tiene éxito, continúa la descarga normalmente
    Y en data/app.log hay entrada WARN: "Rate limit hit, waiting 2s (retry 1/5)"
    Y el archivo final contiene todos los tracks (sin pérdida)

  @AC-006 @must
  Escenario: Refresh automático de token expirado durante descarga
    Dado que tengo una sesión válida pero el access token expira en 30 segundos
    Y la descarga tarda 45 segundos (múltiples páginas)
    Cuando ejecuto "spoty download-songs"
    Y en la página 3 la API devuelve HTTP 401
    Entonces el sistema usa el refresh token para obtener nuevo access token
    Y actualiza data/tokens.json con los nuevos tokens
    Y reintenta la request fallida con el nuevo token
    Y continúa la descarga sin intervención del usuario
    Y el archivo final contiene todos los tracks

  @AC-007 @should
  Escenario: Indicador de progreso visible durante descarga
    Dado que tengo una sesión válida con 500 canciones guardadas
    Cuando ejecuto "spoty download-songs"
    Entonces durante la descarga se muestra progreso en consola:
      | mensaje ejemplo                    | frecuencia           |
      | "Descargados 50 de ~500 tracks..."  | cada página (50)     |
      | "Descargados 100 de ~500 tracks..." | cada página (50)     |
      | ...                                 | ...                  |
    Y al finalizar: "¡Descarga completada! 500 tracks guardados en YYYY-MM-DD-download_songs.json"

  @AC-008 @could
  Escenario: Directorio de salida personalizado con --output-dir
    Dado que tengo una sesión válida
    Y existe el directorio "/tmp/spotify-backups"
    Cuando ejecuto "spoty download-songs --output-dir /tmp/spotify-backups"
    Entonces el archivo se crea en "/tmp/spotify-backups/YYYY-MM-DD-download_songs.json"
    Y se muestra la ruta completa en el mensaje de éxito

  @AC-009 @could
  Escenario: Resumen estadístico al completar descarga
    Dado que tengo una sesión válida con 200 canciones guardadas
    Cuando ejecuto "spoty download-songs"
    Entonces al finalizar se muestra resumen:
      |
      | métrica           | ejemplo     |
      | Tracks totales    | 200         |
      | Artistas únicos   | 87          |
      | Álbumes únicos    | 134         |
      | Duración total    | 12h 34m     |
      | Tamaño archivo    | 2.4 MB      |

  @AC-010 @must
  Escenario: Tokens nunca aparecen en logs ni archivo de salida
    Dado que tengo una sesión válida
    Cuando ejecuto "spoty download-songs"
    Y reviso data/app.log
    Y reviso el archivo JSON generado
    Entonces no hay ningún access_token, refresh_token, ni Authorization header en logs
    Y el archivo JSON no contiene campos de autenticación

  @AC-011 @must
  Escenario: Error claro si sesión expirada completamente (refresh token inválido)
    Dado que tengo tokens guardados pero el refresh token expiró (revocado en Spotify)
    Cuando ejecuto "spoty download-songs"
    Entonces el comando falla con código de salida 2
    Y se muestra: "Tu sesión ha expirado. Ejecuta 'spoty connect' para reconectar."
    Y NO se crea archivo de salida
    Y data/tokens.json se limpia (tokens inválidos removidos)

  @AC-012 @must
  Escenario: Cancelación con Ctrl+C no deja archivo parcial
    Dado que tengo una sesión válida con 1000 canciones
    Cuando ejecuto "spoty download-songs"
    Y presiono Ctrl+C durante la descarga (página 5 de 20)
    Entonces el comando termina con código 130
    Y se muestra: "Descarga cancelada por el usuario"
    Y NO existe archivo YYYY-MM-DD-download_songs.json
    Y en data/app.log hay entrada WARN: "Download cancelled by user at track 250/1000"

  @AC-013 @must
  Escenario: Paginación correcta hasta exhaustar all tracks
    Dado que tengo una sesión válida con 3084 canciones guardadas
    Cuando ejecuto "spoty download-songs"
    Entonces el sistema hace 62 requests (61 páginas de 50 + 1 de 34)
    Y metadata.totalTracks == 3084
    Y tracks.length == 3084
    Y no hay tracks duplicados (verificar por track.id único)

  @AC-014 @must
  Escenario: Backoff exponencial en rate limits persistentes
    Dado que la API devuelve 429 repetidamente en misma request
    Cuando ejecuto "spoty download-songs"
    Entonces los tiempos de espera son aproximadamente:
      | reintento | espera esperada (segundos) |
      | 1         | Retry-Ather (ej: 1)        |
      | 2         | 2                          |
      | 3         | 4                          |
      | 4         | 8                          |
      | 5         | 16 (máx 60)              |
    Y tras 5 fallos consecutivos: error y aborta

  @AC-015 @should
  Escenario: Validación de directorio de salida no escribible
    Dado que no tengo permisos de escritura en "/root/no-write"
    Cuando ejecuto "spoty download-songs --output-dir /root/no-write"
    Entonces el comando falla con código 3
    Y se muestra: "Sin permisos de escritura en /root/no-write"
    Y NO se intenta la descarga

  @AC-016 @should
  Escenario: Comando disponible en menú interactivo
    Dado que ejecuto "spoty" sin argumentos (modo interactivo)
    Cuando selecciono la opción "Descargar biblioteca"
    Entonces se ejecuta el mismo flujo que "spoty download-songs"
    Y vuelve al menú principal tras completar