# Hoja de vida 3D de Luis Miguel Yances Castillo

Recorrido 3D por mi trayectoria profesional, dibujado como una carta de navegación aérea: Universidad de Córdoba, Quipux, Go Medical, Metagroup y Aunnait. Hecho con Vite y Three.js; se publica en GitHub Pages. Usa pnpm como gestor de paquetes.

## Ejecutar en local

```bash
pnpm install
pnpm dev
```

`pnpm-workspace.yaml` bloquea los scripts de instalación de `esbuild` (no los necesita para compilar). Si agregas dependencias que pidan ejecutar scripts, pnpm te avisará y decides con `pnpm approve-builds`.

Abre la dirección que muestra la terminal (normalmente http://localhost:5173).

Para revisar una parada concreta sin hacer scroll, añade `?u=` a la URL con el número de fotograma clave: `?u=4` (Quipux), `?u=7` (Go Medical), `?u=10` (Metagroup), `?u=13` (ascenso), `?u=15` (Aunnait).

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub. Si lo llamas `TU_USUARIO.github.io`, la web queda en `https://TU_USUARIO.github.io`; con cualquier otro nombre queda en `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`. Las rutas son relativas, así que funciona en ambos casos.
2. Sube el proyecto:

   ```bash
   git init
   git add .
   git commit -m "Hoja de vida 3D"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/NOMBRE_DEL_REPO.git
   git push -u origin main
   ```


3. En el repositorio entra a **Settings > Pages** y en **Source** elige **GitHub Actions**.
4. El workflow `.github/workflows/deploy.yml` instala con pnpm, compila y publica en cada push a `main`. El progreso se ve en la pestaña **Actions**.

## Dónde cambiar cosas

| Qué | Archivo |
| --- | --- |
| Textos, cargos, contacto, LinkedIn y GitHub | `src/content.js` |
| PDF de la hoja de vida | `public/cv-luis-miguel-yances.pdf` (mismo nombre) |
| Colores | `src/palette.js` y `src/style.css` |
| Recorrido de la cámara | `src/path.js` |
| Escenas de cada parada | `src/stations/` |
| Terreno, nubes, rutas de vuelo y avión | `src/world.js`, `src/terrain.js` |
