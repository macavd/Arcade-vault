# Snake

Clon del clásico arcade **Snake** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Guía la serpiente por una rejilla para comer frutas: cada fruta la hace crecer un segmento, suma puntos y acelera el juego un poco. Chocar contra un muro o contra tu propio cuerpo termina la partida.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en `game.js`; atlas de sprites en `sprites.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

> Las frutas se dibujan desde `snake-assets/fruits.png`. Si abres el archivo con `file://` y el navegador bloquea la imagen, usa el servidor local.

## Controles

| Tecla             | Acción             |
| ----------------- | ------------------ |
| `←` `→` `↑` `↓`   | Mover la serpiente |
| `W` `A` `S` `D`   | Mover (alternativo)|
| `Enter` / `Espacio` | Reiniciar (en Game Over) |

## Puntuación

| Evento       | Puntos |
| ------------ | ------ |
| Comer fruta  | 10     |

## Características

- Rejilla fija de 32×24 celdas sobre canvas 800×600
- Frutas aleatorias tomadas del atlas de sprites de Google Snake
- La velocidad aumenta progresivamente con cada fruta comida
- Muros mortales y auto-colisión
- Estética neón acorde a Arcade Vault
