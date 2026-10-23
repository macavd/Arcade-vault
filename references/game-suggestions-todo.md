# Sugerencias de juegos (game-planner)

> To-Do de candidatos propuestos por el agente `game-planner`. Append-only: nunca
> se borra histórico, solo se marca el estado. Estados:
> `- [ ]` pendiente de spec · `- [x]` descartado (con motivo) o ya implementado.

## Pendientes de spec

- [ ] **tuberias** — TUBERÍAS · PUZZLE/magenta · 2026-10-21 — Pipe Mania: puzzle de construir rutas contra el flujo. Llena el hueco de PUZZLE (solo caida) y magenta (solo caida) con una mecánica nueva, no un apilador tipo Tetris.

### Tanda 2026-10-21 (4 game-planner en paralelo, 20 juegos por carril)

Carril laberinto / persecución (ARCADE):

- [ ] **cavador** — CAVADOR · ARCADE/yellow · 2026-10-21 — Dig Dug: excavar túneles e inflar bichos. Terreno destructible, el jugador crea el laberinto (no solapa con gloton).
- [ ] **piramix** — PIRÁMIX · ARCADE/magenta · 2026-10-21 — Q*bert: saltar por pirámide isométrica cambiando colores. Único concepto isométrico; pitfall = proyección iso en canvas 2D.
- [ ] **detonix** — DETONIX · ARCADE/green · 2026-10-21 — Bomberman SOLO modo campaña 1P vs IA (no VERSUS). Bombas + laberinto destructible, propagación en cruz.
- [ ] **buscaoro** — BUSCAORO · ARCADE/cyan · 2026-10-21 — Lode Runner: recoger oro y enterrar guardias cavando. Plataforma+laberinto vertical, no es rompeladrillos.
- [ ] **pinguido** — PINGUIDO · ARCADE/cyan · 2026-10-21 — Pengo: empujar bloques de hielo para aplastar enemigos. Física de empuje-deslizamiento en cadena.

Carril shooters espaciales (SHOOTER):

- [ ] **enjambre** — ENJAMBRE · SHOOTER/cyan · 2026-10-21 — Galaga: formación que pica en picado (curvas bézier). Distinto de invasores; estrena cyan en SHOOTER.
- [ ] **ciempies** — CIEMPIÉS · SHOOTER/green · 2026-10-21 — Centipede: enemigo segmentado que se parte al disparar, campo de hongos. Jugador confinado a banda inferior.
- [ ] **contramisil** — CONTRAMISIL · SHOOTER/magenta · 2026-10-21 — Missile Command: defensivo por trayectorias, input de puntero. Único "no-nave" del set; ciudades → onLives.
- [ ] **defensor** — DEFENSOR · SHOOTER/yellow · 2026-10-21 — Defender: scroll horizontal con wraparound + rescate + escáner. Alcance alto, recortar MVP.
- [ ] **escuadrilla** — ESCUADRILLA · SHOOTER/cyan · 2026-10-21 — 1942: shmup de scroll vertical con tonel de evasión, power-ups y jefe. Completa el eje vertical.

Carril puzzle / lógica (PUZZLE):

- [ ] **buscaminas** — BUSCAMINAS · PUZZLE/green · 2026-10-21 — Minesweeper: deducción lógica event-driven, primer clic seguro. Mecánica no-apiladora.
- [ ] **fusion** — FUSIÓN · PUZZLE/yellow · 2026-10-21 — 2048: merge deslizante con score nativo, evitar doble fusión por turno. Distinto a Tetris.
- [ ] **apagon** — APAGÓN · PUZZLE/cyan · 2026-10-21 — Lights Out: lógica combinatoria de toggles, tableros garantizados resolubles (GF(2)).
- [ ] **gemas** — GEMAS · PUZZLE/magenta · 2026-10-21 — Match-3 (Bejeweled): swap + combos, bucle de reacción hasta estabilizar. No es caída controlada.
- [ ] **cajas** — CAJAS · PUZZLE/green · 2026-10-21 — Sokoban: planificación espacial empujando cajas, niveles a mano + detección de deadlock.

Carril plataformas / deportes / habilidad (ARCADE + VERSUS):

- [ ] **trepador** — TREPADOR · ARCADE/magenta · 2026-10-21 — Donkey Kong: escalada esquivando barriles. Plataformas+escaleras+gravedad, arquetipo jump&climb ausente.
- [ ] **aleteo** — ALETEO · ARCADE/yellow · 2026-10-21 — Flappy: volador de un botón. Género one-button reflex ausente, barato de implementar, timestep fijo.
- [ ] **velocista** — VELOCISTA · ARCADE/cyan · 2026-10-21 — Track & Field: atletismo de pulsación. Métrica=tiempo→score ascendente, cap anti-autoclicker.
- [ ] **asfalto** — ASFALTO · VERSUS/green · 2026-10-21 — Pole Position: carreras vs CPU (refuerza VERSUS). Pitfall = render pseudo-3D de carretera (mayor riesgo).
- [ ] **canasta** — CANASTA · ARCADE/yellow · 2026-10-21 — Tiro a canasta por tiempo: ángulo+fuerza, aro móvil, rachas. Partida por tiempo → onGameOver sin onLives.

### Tanda game-jam 2026-10-23 — tema "Cruzar obstáculos sin morir en el intento"

- [ ] **ranaria** — RANARIA · ARCADE/green · 2026-10-23 — Frogger (juego central de la jam): "Cruza la carretera y el río sin convertirte en papilla". YA existe en el catálogo como maqueta (SPEC 06); la spec es solo de MOTOR (patrón SPEC 09) + rediseño de portada. Specs en `specs/game-jam/ranaria/`. Necesita prototipo nuevo (`06-frogger`).
- [ ] **turbovia** — TURBOVÍA · ARCADE/cyan · 2026-10-23 — Road Fighter: conducir a toda velocidad esquivando tráfico en carretera con scroll vertical. Mismo tema que Frogger (esquivar sin morir) pero control continuo de vehículo, no saltos por rejilla. Specs en `specs/game-jam/turbovia/`. Necesita prototipo nuevo (`07-road-fighter`).
- [ ] **patrulla-lunar** — PATRULLA LUNAR · SHOOTER/yellow · 2026-10-23 — Moon Patrol: buggy que cruza terreno lunar saltando cráteres y disparando rocas/OVNIs. Auto-runner salto+disparo; aporta categoría SHOOTER y color yellow a la tanda. Specs en `specs/game-jam/patrulla-lunar/`. Necesita prototipo nuevo (`08-moon-patrol`).

## Descartados / implementados
