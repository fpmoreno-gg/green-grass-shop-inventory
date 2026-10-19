# Green Grass — Shop Inventory (Web)

Web app de inventario y préstamo de herramientas/consumibles para Green Grass Landscape.
React + TypeScript + Vite + Tailwind v4, con Firebase Firestore como backend
(gratuito). Implementa el modelo de datos, catálogo, préstamos/devoluciones,
consumibles, trailers y reportes de la especificación del proyecto.

## Correr en local

```bash
npm install
npm run dev
```

La app arranca en **modo demo**: sin configurar Firebase, todos los datos se
guardan en `localStorage` del navegador (ver `src/data/local`), con datos de
ejemplo precargados. Esto permite probar los 6 flujos completos (catálogo,
préstamo, devolución, consumibles, trailers, reportes) sin crear nada en la nube.

**PIN de acceso demo: `1234`**

## Conectar Firebase (backend real)

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com) (plan Spark/gratuito).
2. Habilita **Firestore Database** (modo producción) y **Authentication → Anonymous**.
3. Copia `.env.example` a `.env` y pega las credenciales de tu app web (Project settings → General → Your apps).
4. Despliega las reglas de `firestore.rules` (`firebase deploy --only firestore:rules`), o pégalas manualmente en la consola.
5. Reinicia `npm run dev`. La app detecta las variables `VITE_FIREBASE_*` y cambia automáticamente de `localRepository` a `firestoreRepository` (ver `src/data/index.ts`) — el resto de la UI no cambia.
6. Carga los datos reales de herramientas/consumibles (puedes adaptar `src/data/local/seed.ts` como referencia de forma y subirlos manualmente o con un script).

No se ha corrido `npm audit fix --force`: baja `firebase` a una versión muy
vieja (9.x) para "resolver" una advisory en `@grpc/grpc-js`, un paquete que
solo se usa en entornos Node (no en el bundle del navegador). Revisar
`npm audit` antes de usar el SDK de Firebase en un backend Node.

## Estructura

```
src/
  types/models.ts        Modelo de datos compartido (Tool, Worker, Loan, Supply, Trailer, ShopManager)
  data/                   Capa de datos (repository pattern)
    types.ts              Contrato DataRepository
    local/                Implementación demo (localStorage)
    firestore/             Implementación real (Firestore) + mapeo camelCase <-> snake_case
  lib/
    firebase.ts           Init de Firebase + auth anónima (solo para cumplir las reglas de seguridad)
    auth.tsx              Sesión del Shop Manager (login por PIN, guardado en localStorage)
    files.ts              Conversión de foto local a data URL (sin Firebase Storage todavía)
  hooks/useData.ts         Hooks useTools/useLoans/etc. sobre el repository activo
  components/             UI compartida (Button, Card, Input, Sidebar, gráficos SVG simples)
  pages/                  Una carpeta por módulo: tools, loans, supplies, trailers, reports, settings
```

## Qué falta (fuera de alcance de esta sesión)

- **App iOS nativa (SwiftUI)** — no se construyó en esta sesión: este entorno no tiene Xcode/macOS para escribirla y probarla con garantías. El modelo de datos y las reglas de Firestore son reutilizables tal cual.
- **Integración con Trellis (solo lectura)** — a propósito, según el orden de construcción de la spec ("al final, antes de pruebas en campo"). No hay credenciales ni documentación de la API de Trellis todavía; cuando estén disponibles, se implementa como una Firebase Function de solo lectura (nunca se escribe en Trellis desde esta app), con el token guardado en el entorno de la función, nunca en el cliente.
- **Subida real de fotos (Firebase Storage)** — hoy las fotos de check-out/return se guardan como data URL embebida; funciona para demo pero no escala bien en Firestore (límite de 1 MB por documento). Mover a Storage cuando haya backend real.
- **Logo real de Green Grass** — se usó un placeholder de texto ("GG"). Reemplazar en `src/components/layout/Sidebar.tsx` y `src/pages/Login.tsx` por el archivo de marca real, sin modificarlo (regla de la spec).
