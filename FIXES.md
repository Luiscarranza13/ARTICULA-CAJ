# ARTICULA CAJ — Registro de Correcciones

> Última actualización: 2026-05-28  
> Branch: `main` — Todos los cambios confirmados con build exitoso (`✓ built in ~3s`)

---

## Estado general

| Categoría | Total | ✅ Listo | ⚠️ Parcial | ❌ Pendiente |
|-----------|-------|----------|------------|-------------|
| Bugs críticos | 5 | 5 | 0 | 0 |
| UI / Ortografía | 4 | 4 | 0 | 0 |
| Módulos de contenido | 6 | 6 | 0 | 0 |
| Permisos por rol | 8 | 8 | 0 | 0 |
| Dashboard / Gráficos | 5 | 5 | 0 | 0 |
| Landing page | 4 | 4 | 0 | 0 |
| Admin / Configuración | 4 | 4 | 0 | 0 |
| **Total** | **36** | **36** | **0** | **0** |

---

## Detalle de cada issue

### 1. ✅ Ortografía en la interfaz
**Problema:** Textos sin tildes en toda la app (ej. "dias", "modulo", "proximos", "contrasena", "administracion").  
**Solución:** Correcciones aplicadas en `DashboardPage`, `DirectoryPage`, `AdminUsersPage`, `LoginPage`, `Header`, `HelpPage`, `ContentPage`.  
**Archivos:** `src/pages/DashboardPage.tsx`, `src/pages/AdminUsersPage.tsx`, `src/pages/LoginPage.tsx`, `src/pages/DirectoryPage.tsx`

---

### 2. ✅ Logo de la plataforma
**Problema:** Se usaba un ícono SVG genérico (hoja) en lugar del logo real.  
**Solución:** `logo.jpeg` copiado a `public/logo.jpeg` y usado en Sidebar (expandido y colapsado), navbar de la landing, footer y como `favicon` + `apple-touch-icon` en `index.html`.  
**Archivos:** `public/logo.jpeg`, `index.html`, `src/components/layout/Sidebar.tsx`, `src/pages/LandingPage.tsx`

---

### 3. ✅ Datos falsos en estadísticas / gráficos
**Problema:** Los stats de la landing y el dashboard mostraban valores hardcodeados (3,847 / 1,234 / 289 / S/124) en vez de datos reales de la BD.  
**Solución:** Se creó `fetchRealKpis()` que cuenta directamente de las tablas `perfiles` (estado='aprobado') y `productos` (publicado=true). La función intenta la vista `v_dashboard_kpis` primero; si falla, usa el conteo directo como fallback.  
**Archivos:** `src/lib/data.ts`

---

### 4. ✅ Articulación — foro público en la landing
**Problema:** Las publicaciones, oportunidades y convocatorias de articulación no eran visibles sin iniciar sesión.  
**Solución:** Se agregó la sección "Contenidos" a la landing con tres tabs (Noticias, Eventos, Convocatorias), mostrando datos reales con actualización en tiempo real via Supabase Realtime.  
**Archivos:** `src/pages/LandingPage.tsx`, `src/lib/data.ts` (`fetchPublicContent`)

---

### 5. ✅ Contenidos — error al crear noticias/eventos/convocatorias
**Problema:** La página de Contenidos intentaba insertar en tablas `noticias` y `convocatorias` que no existían en la BD.  
**Solución:** Reescritura completa de `ContentPage.tsx`. Noticias → `publicaciones` con `tipo='publicacion'`; Convocatorias → `publicaciones` con `tipo='convocatoria'`; Eventos → tabla `eventos` existente.  
**Archivos:** `src/pages/ContentPage.tsx`

---

### 6. ✅ Landing — sección Nosotros / Visión y Misión
**Problema:** La landing no tenía información sobre la organización.  
**Solución:** Nueva sección `#nosotros` con cards de Misión, Visión y 4 valores institucionales (Transparencia, Inclusión, Articulación, Impacto). Enlace añadido al navbar.  
**Archivos:** `src/pages/LandingPage.tsx`

---

### 7. ✅ Botón para ver la página principal desde el panel
**Problema:** No había forma rápida de previsualizar la landing estando en el panel admin.  
**Solución:** Ícono `ExternalLink` en el `Header` del panel que abre `/` en una nueva pestaña.  
**Archivos:** `src/components/layout/Header.tsx`

---

### 8. ✅ Diferencia entre Articulación y Contenidos
**Problema:** Ambos módulos parecían hacer lo mismo.  
**Solución:**
- **Articulación** = Red social de miembros. Cualquier usuario registrado puede publicar (publicación, oportunidad, convocatoria, evento). Feed colaborativo con likes y comentarios.
- **Contenidos** = Gestión institucional. Administradores e instituciones publican noticias oficiales, eventos y convocatorias formales. Aparece en la landing pública.

**Archivos:** `src/pages/ArticulationPage.tsx`, `src/pages/ContentPage.tsx`, `src/components/layout/AppLayout.tsx` (subtítulos diferenciados)

---

### 9. ✅ Articulación — subir imágenes en publicaciones
**Problema:** Solo se podía poner una URL de imagen; no había upload de archivo.  
**Solución:** Input de archivo con preview, upload al bucket `avatars` de Supabase Storage, imagen auto-incluida en la publicación.  
**Archivos:** `src/pages/ArticulationPage.tsx`

---

### 10. ✅ Articulación — formulario en ventana flotante (modal)
**Problema:** El formulario de nueva publicación estaba inline en la página.  
**Solución:** Modal animado con `AnimatePresence` de Framer Motion. Se abre al hacer clic en "¿Qué quieres compartir?" y se cierra al publicar o cancelar.  
**Archivos:** `src/pages/ArticulationPage.tsx`

---

### 11. ✅ Articulación y Contenidos visualmente diferenciados
**Problema:** Ambas secciones tenían la misma apariencia y propósito aparente.  
**Solución:** Articulación tiene un diseño de feed social (avatar, likes, compartir); Contenidos tiene un diseño de gestión editorial (tabla, estados, filtros). Subtítulos distintos en el layout.  
**Archivos:** `src/pages/ArticulationPage.tsx`, `src/pages/ContentPage.tsx`

---

### 12. ✅ Indicadores — datos reales y explicación de funcionamiento
**Problema:** Indicadores dependía de la vista `v_dashboard_kpis` que podía no existir, y tenía textos técnicos ("Vista v_cadenas_resumen").  
**Solución:** 
- Fallback robusto: intenta la vista, si falla usa `fetchRealKpis()` (conteo directo).
- Textos técnicos eliminados.
- Gráfico de pie para impacto económico por cadena.
- Tarjeta informativa explicando cómo se calculan los valores y dónde editarlos.

**Archivos:** `src/pages/IndicatorsPage.tsx`

---

### 13. ✅ Notificaciones persistentes (mark all read)
**Problema:** Al marcar todas como leídas y recargar la página, volvían a aparecer como no leídas.  
**Solución:** Se agregó `notifications` al `partialize` de Zustand persist. Ahora el estado de lectura sobrevive recargas.  
**Archivos:** `src/store/useStore.ts`

---

### 14. ✅ Solicitudes — botón de credenciales (llave)
**Problema:** Duda sobre si mantener el botón de credenciales en Solicitudes o moverlo a Usuarios.  
**Decisión:** Se mantiene en **Solicitudes** (flujo lógico: solicitud aprobada → crear credenciales → notificar). También disponible en el modal de detalle de solicitud aprobada.  
**Archivos:** `src/pages/AdminContactPage.tsx`

---

### 15. ✅ Testimonios — sin URL de foto, sin estrellas
**Problema:** El formulario pedía URL de foto y rating de estrellas innecesarios.  
**Solución:**
- Eliminado campo "URL de foto".
- Eliminadas estrellas de rating del formulario.
- Añadido botón **"Buscar foto"** que consulta la tabla `perfiles` por nombre y auto-rellena la foto del perfil del usuario.

**Archivos:** `src/pages/AdminContactPage.tsx`

---

### 16. ✅ Configuración — estadísticas automáticas desde la BD
**Problema:** Los contadores de la landing (actores, productos) eran valores manuales.  
**Solución:**
- **Actores registrados** y **Productos en vitrina**: calculados automáticamente (read-only, etiqueta "Auto · BD").
- **Acuerdos comerciales** e **Impacto en ventas**: siguen siendo editables por el admin.
- Al guardar configuración, se sincronizan los valores reales antes de persistir.

**Archivos:** `src/pages/AdminContactPage.tsx`, `src/lib/data.ts`

---

### 17. ✅ Dashboard Productor — datos propios
**Problema:** El dashboard mostraba estadísticas globales sin relación con el productor.  
**Solución:** Dashboard por rol. Para productor muestra: Mis productos (publicados), Mis publicaciones (aprobadas), Actores en red, Eventos próximos. Botón de acción directo a "Mis productos".  
**Archivos:** `src/pages/DashboardPage.tsx`

---

### 18. ✅ Quitar "Actividad reciente" del Dashboard
**Problema:** El panel de actividad reciente mostraba publicaciones de otros usuarios sin contexto.  
**Solución:** Sección eliminada completamente del Dashboard.  
**Archivos:** `src/pages/DashboardPage.tsx`

---

### 19. ✅ Quitar textos técnicos/de desarrollador del UI
**Problema:** Textos como "Datos en tiempo real desde la tabla actores" o "Vista v_cadenas_resumen" eran visibles para los usuarios finales.  
**Solución:** Reemplazados por texto descriptivo natural en `DirectoryPage`, `DashboardPage`, `IndicatorsPage`.  
**Archivos:** `src/pages/DirectoryPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/IndicatorsPage.tsx`

---

### 20. ✅ Solo admins pueden crear nuevos actores
**Problema:** El botón "Nuevo actor" era visible para todos los roles.  
**Solución:** Botón "Nuevo actor" oculto para no-admins. Botones Editar/Eliminar en el modal de detalle también ocultos para no-admins.  
**Archivos:** `src/pages/DirectoryPage.tsx`

---

### 21. ✅ Vitrina — productor solo ve sus propios productos
**Problema:** El productor veía los productos de todos los usuarios.  
**Solución:** Al cargar, se consultan los actores del productor actual (`actores WHERE propietario_id = user.id`). Los productos se filtran para mostrar solo los de esos actores. El título cambia a "Mis productos".  
**Archivos:** `src/pages/MarketplacePage.tsx`

---

### 22. ✅ Articulación — gestión de publicaciones propias
**Problema:** No había forma de ver solo las publicaciones propias ni gestión diferenciada.  
**Solución:**
- Botones Editar/Eliminar visibles solo para el autor o admin (`canEdit(pub)`).
- Modal flotante diferencia el formulario por tipo: Publicación (sin título, imagen opcional), Oportunidad/Convocatoria (con título requerido), Evento (con fecha).
- Mensaje informativo para no-admins indicando que la publicación queda en revisión.

**Archivos:** `src/pages/ArticulationPage.tsx`

---

### 23. ✅ Soporte técnico — mensaje al administrador
**Problema:** El botón de soporte abría un `mailto:` genérico.  
**Solución:** Modal con formulario (asunto + mensaje) que crea una solicitud en la tabla `publicaciones` con prefijo `[SOPORTE TÉCNICO]`, visible para el admin en el módulo de solicitudes.  
**Archivos:** `src/pages/HelpPage.tsx`

---

### 24. ✅ Dashboard Comprador — datos reales del mercado
**Problema:** El comprador veía estadísticas globales sin relevancia para su rol.  
**Solución:** KPIs específicos: Productos disponibles, Proveedores activos, Convocatorias vigentes, Eventos próximos. Botón de acción directo a "Ver vitrina".  
**Archivos:** `src/pages/DashboardPage.tsx`

---

### 25. ✅ Directorio — restricciones para comprador
**Problema:** El comprador podía crear actores.  
**Solución:** El botón "Nuevo actor" solo se muestra para administradores. El directorio es visible para todos los roles.  
**Archivos:** `src/pages/DirectoryPage.tsx`

---

### 26. ✅ Vitrina — comprador contacta por WhatsApp
**Problema:** El botón "Contactar" no tenía funcionalidad real.  
**Solución:** Al hacer clic, se busca el actor dueño del producto, se extrae su teléfono, se normaliza al formato internacional peruano (+51) y se abre `https://wa.me/{numero}?text={mensaje_prellenado}`.  
**Archivos:** `src/pages/MarketplacePage.tsx`

---

### 27. ✅ Articulación — restricciones para comprador
**Problema:** El comprador podía editar/eliminar publicaciones de otros.  
**Solución:** La función `canEdit(pub)` verifica `pub.autorId === user?.id` o `isAdmin`. Solo se pueden gestionar las propias publicaciones.  
**Archivos:** `src/pages/ArticulationPage.tsx`

---

### 28. ✅ Dashboard Institución — datos reales
**Problema:** Igual que productor/comprador: datos globales sin relevancia institucional.  
**Solución:** KPIs específicos: Mis publicaciones, Actores registrados, Eventos publicados, Convocatorias activas. Gráficos de cadenas visibles (igual que admin). Botón de acción directo a "Nueva publicación".  
**Archivos:** `src/pages/DashboardPage.tsx`

---

### 29. ✅ Directorio — restricciones para institución
**Problema:** Instituciones podían crear actores.  
**Solución:** Igual que issues 20 y 25 — botón "Nuevo actor" exclusivo de administradores.  
**Archivos:** `src/pages/DirectoryPage.tsx`

---

### 30. ✅ Articulación — restricciones para institución
**Problema:** Instituciones podían editar publicaciones de otros miembros.  
**Solución:** Misma lógica `canEdit(pub)` aplicada a todos los roles.  
**Archivos:** `src/pages/ArticulationPage.tsx`

---

### 31. ✅ Indicadores — datos reales con fallback
**Problema:** `IndicatorsPage` dependía de `v_dashboard_kpis` y `v_cadenas_resumen` que pueden no existir.  
**Solución:** 
1. KPIs: usa `fetchRealKpis()` (conteo directo de tablas) si la vista falla.
2. Cadenas: intenta `v_cadenas_resumen`, si falla usa tabla `cadenas_productivas` directamente.
3. Suscripción realtime a cambios en `perfiles`, `productos` y `site_config`.

**Archivos:** `src/pages/IndicatorsPage.tsx`, `src/lib/data.ts`

---

### 32. ✅ Contenidos — arreglar errores de edición y eliminación
**Problema:** No dejaba crear, editar ni eliminar noticias, eventos ni convocatorias.  
**Solución:** Reescritura completa con las tablas correctas. El delete usa `publicaciones` para noticias/convocatorias y `eventos` para eventos.  
**Archivos:** `src/pages/ContentPage.tsx`

---

### 33. ✅ Sesiones independientes por pestaña
**Problema:** Al iniciar sesión con otra cuenta en una nueva pestaña, todas las pestañas cambiaban de usuario simultáneamente.  
**Causa:** Supabase usaba `localStorage` (compartido entre pestañas) para almacenar la sesión.  
**Solución:**
- Supabase configurado con `storage: sessionStorage` — cada pestaña tiene su propia sesión independiente.
- Zustand `partialize` actualizado: ya no persiste `user` ni `isAuthenticated` (se derivan de la sesión de Supabase).
- Nombre de la clave de storage actualizado a `articula-caj-v3` para evitar conflictos con la versión anterior.

**Archivos:** `src/lib/supabase.ts`, `src/store/useStore.ts`

---

### 34a. ✅ Articulación — publicación solo con imagen (sin texto)
**Problema:** Era obligatorio escribir texto para publicar.  
**Solución:** Para el tipo "Publicación", el contenido es opcional si se adjunta una imagen. Si se publica solo imagen, el contenido se guarda como `'📷'` y no se muestra en el feed.  
**Archivos:** `src/pages/ArticulationPage.tsx`

---

### 34b. ✅ Landing — sección pública con publicaciones y foro
**Problema:** La landing no mostraba el contenido publicado en el panel.  
**Solución:** Nueva sección `#contenidos` con:
- Tabs: **Noticias** / **Eventos** / **Convocatorias**
- Contador de items por tab
- Cards con imagen, fecha, autor y descripción
- **Tiempo real**: suscripción a cambios en `publicaciones` y `eventos`
- CTA "Ver todo en la plataforma" hacia el login

**Archivos:** `src/pages/LandingPage.tsx`, `src/lib/data.ts` (`fetchPublicContent`)

---

## Notas de despliegue

### Script de datos de prueba
Ejecutar en **Supabase → SQL Editor**:
```
supabase/migrations/20260528_seed_test_data.sql
```
Inserta: 6 perfiles, 6 actores, 6 productos, 5 publicaciones, 3 eventos, 6 cadenas, 5 testimonios.

### Edge Function `admin-users`
El módulo de Usuarios tiene un fallback robusto: si la Edge Function no está desplegada, opera directamente sobre la tabla `perfiles`. Para habilitar la creación completa de usuarios con autenticación:
```bash
supabase functions deploy admin-users
```

### Variables de entorno requeridas
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SEND_GMAIL_API_KEY=   # opcional — para envío de emails
```
