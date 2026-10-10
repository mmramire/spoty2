# Criterios de aceptación: Creación de playlist vacía

# Nota de estado: versión 0.2.0 con definiciones aprobadas P-001 a P-007. Los escenarios son
# ejecutables en español. El estado global permanece DRAFT hasta nueva revisión del revisor
# de especificación más aprobación humana explícita; no se declara SPEC_READY.

@003-creacion-de-playlist-vacia
Característica: Creación de playlist vacía
  Como usuario autenticado
  Quiero crear una playlist vacía desde el CLI spoty2
  Para disponer de una lista vacía asociada a mi cuenta

  @AC-001 @RF-001 @RF-002 @UC-001
  Escenario: Crear playlist vacía con confirmación e identificador
    Dado que el usuario dispone de una sesión válida obtenida vía opción 1
    Cuando el usuario confirma la creación con nombre válido, descripción efectiva y visibilidad pública o privada
    Entonces el sistema crea una única playlist vacía asociada al usuario en Spotify
    Y el sistema muestra Playlist creada: "Viaje 2026" (privada, descripción: "Carretera", id: ..., enlace: ...) con identificador y enlace
    Y el sistema registra inicio y éxito en data/app.log sin datos sensibles

  @AC-002 @RF-001 @RF-002 @UC-001
  Escenario: Punto de inicio por comando directo con parámetros validados
    Dado que el CLI spoty2 está disponible
    Cuando el usuario ejecuta spoty create-new-playlist --name "Viaje 2026" --private
    Entonces el sistema inicia el flujo UC-001 con ese nombre y visibilidad privada y descripción "Playlist sin descripción"
    Y cuando el usuario ejecuta spoty create-new-playlist --name "Viaje 2026" --private --description "Carretera"
    Entonces el sistema inicia el flujo UC-001 con esa descripción
    Y cuando el usuario ejecuta spoty create-new-playlist --name "Viaje 2026" --public --description "Carretera"
    Entonces el sistema inicia el flujo UC-001 con visibilidad pública
    Pero cuando el nombre tiene menos de 3 o más de 100 caracteres visibles o la visibilidad falta o es doble
    Entonces el sistema muestra Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales. o Se debe declarar flag único en comando --public o --private según corresponda

  @AC-003 @RF-001 @RF-002 @UC-001
  Escenario: Punto de inicio por menú interactivo con confirmación
    Dado que el usuario ejecuta spoty en modo interactivo
    Cuando el usuario selecciona la opción 4. Crear playlist vacía
    Entonces el sistema muestra la ayuda (navega con 0-4,9, Ctrl+C para cancelar)
    Y el sistema pide Nombre de la playlist (3-100 caracteres):
    Y el sistema pide Descripción (opcional, Enter para usar "Playlist sin descripción"):
    Y el sistema ofrece la lista de visibilidad con pública preseleccionada
    Y el sistema pide confirmación final con formato (s/N):
    Pero solo la respuesta s confirma y cualquier otra respuesta vuelve al menú sin crear
    Y la combinación Ctrl+C aborta sin crear en cualquier petición

  @AC-004 @RF-002 @RNF-001 @RNF-006 @UC-001
  Escenario: Informar errores de sesión, autorización y servicio sin exponer datos sensibles
    Dado que el usuario ha iniciado el flujo UC-001
    Cuando no existe sesión válida
    Entonces el sistema muestra No hay sesión activa. Conecta con Spotify con la opción 1 y no crea nada
    Y cuando Spotify responde 401
    Entonces el sistema muestra Sesión caducada. Vuelve a conectar con Spotify.
    Y cuando Spotify responde 403
    Entonces el sistema muestra Permisos insuficientes para crear la playlist.
    Y cuando Spotify responde 429 hasta 3 reintentos respetando Retry-After o 10 segundos y persiste el límite
    Entonces el sistema muestra Vuelva a intentarlo más tarde
    Y cuando ocurre un fallo genérico
    Entonces el sistema muestra No se pudo crear la playlist por un error inesperado.
    Y el sistema registra el fallo con causa sin cuerpo sensible y sin tokens en registros, consola ni ficheros

  @AC-005 @RF-001 @RF-002 @RNF-006 @UC-001
  Escenario: Validar nombre y gestionar duplicados contra listas propias
    Dado que el usuario ha iniciado el flujo UC-001
    Cuando el nombre está vacío o solo tiene espacios o queda fuera de 3-100 caracteres visibles
    Entonces el sistema lo rechaza y en comando directo muestra Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales. y continúa con Nombre de la playlist (3-100 caracteres):
    Y cuando el nombre coincide con una lista propia tras recortar espacios con comparación exacta sensible a mayúsculas
    Entonces el sistema muestra Ya existe una playlist llamada "X". y el menú ¿Qué deseas hacer? 1. Modificar nombre 2. Crear de todos modos con el mismo nombre 0. Cancelar sin crear / Elige (0-2):
    Y cuando el usuario elige 1
    Entonces el sistema repite el nombre y pregunta ¿Deseas modificar descripción y visibilidad? (s/N):
    Y cuando el usuario elige 2
    Entonces el sistema continúa hacia la confirmación final
    Pero cuando el usuario elige 0
    Entonces el sistema muestra Creación cancelada. No se creó ninguna playlist. y no crea nada

## Reglas del documento

- Utilizar palabras clave Gherkin en español: `Característica`, `Escenario`, `Dado`, `Cuando`, `Entonces`, `Y`, `Pero`.
- Mantener tags técnicos de trazabilidad como `@RF-001`, `@UC-001` y `@AC-001`.
- Cada criterio debe ser verificable.
- Incluir escenarios de error cuando sean relevantes.
- Incluir explícitamente el punto de inicio cuando el usuario deba disparar el flujo.
- Estado actual: versión 0.2.0 con AC-001 a AC-005 ejecutables; AC-002 y AC-003 cubren los puntos de inicio validados; AC-004 y AC-005 cubren errores y duplicados con mensajes exactos; pendiente nueva revisión y aprobación humana para SPEC_READY.
