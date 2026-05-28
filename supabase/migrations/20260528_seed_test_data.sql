-- =============================================================================
-- SEED: Datos de prueba para ARTICULA CAJ
-- Cubre todos los módulos y roles: admin, productor, comprador, institución
-- Ejecutar en Supabase SQL Editor o con: supabase db push
-- =============================================================================

-- ─── 1. PERFILES (usuarios de prueba sin auth.users — para ver en el panel) ───
-- Nota: estos perfiles son visibles en el módulo Usuarios pero no pueden
-- iniciar sesión hasta que se les cree un auth.users con el mismo correo.
INSERT INTO public.perfiles (
  id, auth_user_id, rol, nombre, apellido, dni, celular, correo,
  organizacion, ubicacion_texto, rubro_texto, verificado, estado, bio
) VALUES
  -- Productor de café
  (gen_random_uuid(), null, 'productor', 'Carlos', 'Quispe Mendoza',
   '45678901', '976543210', 'carlos.quispe@test.articulacaj.pe',
   'Cooperativa Cafetalera Chirinos', 'San Ignacio, Cajamarca', 'Café orgánico',
   true, 'aprobado', 'Productor de café especial con 15 años de experiencia.'),

  -- Productor de lácteos
  (gen_random_uuid(), null, 'productor', 'María', 'Santos Torres',
   '56789012', '987654321', 'maria.santos@test.articulacaj.pe',
   'Asociación Ganadera Bambamarca', 'Bambamarca, Cajamarca', 'Lácteos',
   true, 'aprobado', 'Productora de queso artesanal y derivados lácteos.'),

  -- Comprador exportador
  (gen_random_uuid(), null, 'comprador', 'Roberto', 'Huaripata Vera',
   '67890123', '965432187', 'roberto.huaripata@test.articulacaj.pe',
   'Importadora Max S.A.C.', 'Lima', 'Comercio exterior',
   true, 'aprobado', 'Empresa importadora con presencia en 8 países.'),

  -- Institución pública
  (gen_random_uuid(), null, 'institucion', 'Rosa', 'Cárdenas Llanos',
   '78901234', '954321876', 'rosa.cardenas@test.articulacaj.pe',
   'DIRCETUR Cajamarca', 'Cajamarca', 'Gobierno regional',
   true, 'aprobado', 'Técnica de promoción de cadenas productivas.'),

  -- Otro productor (cacao)
  (gen_random_uuid(), null, 'productor', 'Jorge', 'Huaripata Silva',
   '89012345', '943218765', 'jorge.huaripata@test.articulacaj.pe',
   'Cooperativa Cacao Jaén', 'Jaén, Cajamarca', 'Cacao',
   true, 'aprobado', 'Productor de cacao fino de aroma.'),

  -- Solicitud pendiente (no aprobado)
  (gen_random_uuid(), null, 'productor', 'Ana', 'Pérez Rojas',
   '90123456', '932187654', 'ana.perez@test.articulacaj.pe',
   'Productora independiente', 'Celendín, Cajamarca', 'Quinua',
   false, 'pendiente', null)

ON CONFLICT (correo) DO NOTHING;

-- ─── 2. ACTORES (directorio productivo) ─────────────────────────────────────
INSERT INTO public.actores (
  id, nombre, tipo, rubro_texto, ubicacion_texto, provincia_texto,
  descripcion, contacto, correo, capacidad_productiva,
  verificado, estado, miembros, fundado
) VALUES
  ('a1000000-0000-0000-0000-000000000001',
   'Cooperativa Agraria Cafetalera Chirinos', 'cooperativa',
   'Café orgánico', 'San Ignacio', 'Cajamarca',
   'Cooperativa líder en producción de café especial certificado con más de 900 socios.',
   '976-123-456', 'info@coopcafe.pe', '850 TM/año',
   true, 'aprobado', 920, 1999),

  ('a2000000-0000-0000-0000-000000000002',
   'Asociación de Productores de Quinua Cajamarca', 'asociacion',
   'Granos andinos', 'Cajamarca', 'Cajamarca',
   'Organización de 180 familias productoras de quinua orgánica certificada.',
   '976-234-567', 'quinua@asociacion.pe', '120 TM/año',
   true, 'aprobado', 180, 2008),

  ('a3000000-0000-0000-0000-000000000003',
   'Empresa Exportadora Lácteos del Norte SAC', 'empresa',
   'Lácteos', 'Cajamarca', 'Cajamarca',
   'Procesadora y exportadora de quesos artesanales y productos lácteos de altura.',
   '076-365-432', 'ventas@lacteosnorte.pe', '15,000 L/día',
   true, 'aprobado', null, 2005),

  ('a4000000-0000-0000-0000-000000000004',
   'Cooperativa de Cacao Amazonas Cajamarca', 'cooperativa',
   'Cacao', 'Jaén', 'Cajamarca',
   'Cacao premium con certificación orgánica y fair trade de la cuenca del Marañón.',
   '976-345-678', 'cacao@coopcaj.pe', '280 TM/año',
   true, 'aprobado', 340, 2003),

  ('a5000000-0000-0000-0000-000000000005',
   'DIRCETUR Cajamarca', 'institucion',
   'Gobierno regional', 'Cajamarca', 'Cajamarca',
   'Dirección Regional de Comercio Exterior y Turismo, promotora del desarrollo productivo.',
   '076-365-000', 'dircetur@regioncajamarca.gob.pe', null,
   true, 'aprobado', null, 1993),

  ('a6000000-0000-0000-0000-000000000006',
   'Asociación Apicultores San Marcos', 'asociacion',
   'Apicultura', 'San Marcos', 'Cajamarca',
   'Productores de miel orgánica de altura de los bosques de neblina de Cajamarca.',
   '976-456-789', 'apicultura@sanmarcos.pe', '85 TM/año',
   true, 'aprobado', 65, 2010)

ON CONFLICT (id) DO NOTHING;

-- ─── 3. CATEGORÍAS DE PRODUCTO ───────────────────────────────────────────────
INSERT INTO public.categorias_producto (id, nombre) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Café'),
  ('c2000000-0000-0000-0000-000000000002', 'Lácteos'),
  ('c3000000-0000-0000-0000-000000000003', 'Cacao'),
  ('c4000000-0000-0000-0000-000000000004', 'Granos Andinos'),
  ('c5000000-0000-0000-0000-000000000005', 'Tubérculos'),
  ('c6000000-0000-0000-0000-000000000006', 'Apicultura'),
  ('c7000000-0000-0000-0000-000000000007', 'Frutas'),
  ('c8000000-0000-0000-0000-000000000008', 'Hierbas Medicinales')
ON CONFLICT (id) DO NOTHING;

-- ─── 4. PRODUCTOS (vitrina comercial) ─────────────────────────────────────────
INSERT INTO public.productos (
  id, actor_id, categoria_id, nombre, descripcion, precio, moneda,
  unidad, disponibilidad, temporada, destacado, estado, publicado
) VALUES
  ('p1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   'Café Orgánico Especial Chirinos',
   'Café de altura a 1800 msnm con fermentación natural. Notas de chocolate y frutas rojas.',
   42.00, 'PEN', 'kg', 500, 'Mayo - Agosto', true, 'aprobado', true),

  ('p2000000-0000-0000-0000-000000000002',
   'a2000000-0000-0000-0000-000000000002',
   'c4000000-0000-0000-0000-000000000004',
   'Quinua Orgánica Blanca Premium',
   'Quinua certificada a 3200 msnm. Grano grande, limpio, alta proteína 16%.',
   8.50, 'PEN', 'kg', 1200, 'Todo el año', true, 'aprobado', true),

  ('p3000000-0000-0000-0000-000000000003',
   'a3000000-0000-0000-0000-000000000003',
   'c2000000-0000-0000-0000-000000000002',
   'Queso Mantecoso Cajamarca Artesanal',
   'Queso artesanal de leche fresca de vacas de pastizales de altura. Sabor único.',
   25.00, 'PEN', 'kg', 300, 'Todo el año', true, 'aprobado', true),

  ('p4000000-0000-0000-0000-000000000004',
   'a4000000-0000-0000-0000-000000000004',
   'c3000000-0000-0000-0000-000000000003',
   'Cacao en Grano Fino de Aroma',
   'Cacao nacional seleccionado, fermentado y secado al sol por productores certificados.',
   6.80, 'PEN', 'kg', 800, 'Junio - Diciembre', false, 'aprobado', true),

  ('p5000000-0000-0000-0000-000000000005',
   'a6000000-0000-0000-0000-000000000006',
   'c6000000-0000-0000-0000-000000000006',
   'Miel de Abeja Orgánica de Altura',
   'Miel pura de bosques de neblina de Cajamarca. Sin procesamiento industrial.',
   18.00, 'PEN', '500ml', 450, 'Todo el año', true, 'aprobado', true),

  ('p6000000-0000-0000-0000-000000000006',
   'a1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   'Café Tostado Molido Especial',
   'Mezcla de variedades premium tostadas artesanalmente, ideal para filtrado.',
   35.00, 'PEN', '250g', 200, 'Todo el año', false, 'aprobado', true)

ON CONFLICT (id) DO NOTHING;

-- Imágenes de productos (usando Unsplash como placeholder)
INSERT INTO public.producto_imagenes (producto_id, url, alt, orden) VALUES
  ('p1000000-0000-0000-0000-000000000001',
   'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&h=400&fit=crop',
   'Café Orgánico Especial Chirinos', 1),
  ('p2000000-0000-0000-0000-000000000002',
   'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=600&h=400&fit=crop',
   'Quinua Orgánica', 1),
  ('p3000000-0000-0000-0000-000000000003',
   'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&h=400&fit=crop',
   'Queso Mantecoso', 1),
  ('p4000000-0000-0000-0000-000000000004',
   'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600&h=400&fit=crop',
   'Cacao en Grano', 1),
  ('p5000000-0000-0000-0000-000000000005',
   'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&h=400&fit=crop',
   'Miel de Abeja', 1),
  ('p6000000-0000-0000-0000-000000000006',
   'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop',
   'Café Tostado', 1)
ON CONFLICT DO NOTHING;

-- ─── 5. PUBLICACIONES (articulación) ────────────────────────────────────────
INSERT INTO public.publicaciones (
  id, autor_id, tipo, titulo, contenido, imagen_url, estado, fijada
)
SELECT
  gen_random_uuid(),
  p.id,
  pub.tipo,
  pub.titulo,
  pub.contenido,
  pub.imagen_url,
  'aprobado',
  false
FROM (
  VALUES
    ('carlos.quispe@test.articulacaj.pe',   'publicacion',  null,
     'Cosecha récord de café este año en San Ignacio',
     'Logramos 45 quintales por hectárea en nuestra parcela. Compartimos la alegría con toda la familia productora de la cooperativa. ¡Cajamarca produce lo mejor!',
     'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&h=400&fit=crop'),

    ('roberto.huaripata@test.articulacaj.pe', 'oportunidad',
     'Buscamos proveedores de Café Especial - Exportación a Europa',
     'Empresa importadora alemana busca proveedores de café especial con perfil de taza >82 puntos SCA. Volumen mínimo: 50 sacos/mes. Precio premium garantizado.',
     null),

    ('rosa.cardenas@test.articulacaj.pe',    'convocatoria',
     'Convocatoria FONDAGRO 2026 - Fondos para productores',
     'AGROIDEAS abre convocatoria para fondos no reembolsables de hasta S/ 450,000 para planes de negocio de organizaciones agrarias. Fecha límite: 30 de Julio 2026.',
     null),

    ('maria.santos@test.articulacaj.pe',     'publicacion',  null,
     'Participamos en la Feria de Productos Orgánicos de Lima y recibimos reconocimiento por nuestro queso mantecoso. ¡Cajamarca presente!',
     'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop'),

    ('jorge.huaripata@test.articulacaj.pe',  'evento',
     'Rueda de Negocios Agropecuaria Cajamarca 2026',
     'Evento de articulación comercial entre productores locales y compradores. Fecha: 15 de Agosto 2026. Lugar: Centro de Convenciones Cajamarca. Inscripciones abiertas.',
     null)
) AS pub(correo, tipo, titulo, contenido, imagen_url)
JOIN public.perfiles p ON p.correo = pub.correo
ON CONFLICT DO NOTHING;

-- ─── 6. EVENTOS ──────────────────────────────────────────────────────────────
INSERT INTO public.eventos (
  id, titulo, descripcion, fecha, hora, lugar, tipo,
  organizador_texto, imagen_url, cupos, categoria
) VALUES
  ('e1000000-0000-0000-0000-000000000001',
   'Rueda de Negocios Agropecuaria Cajamarca 2026',
   'Evento de articulación entre productores y compradores nacionales e internacionales. Incluye exposición de productos, catas de café y reuniones B2B.',
   '2026-08-15', '08:00',
   'Centro de Convenciones Cajamarca', 'feria',
   'DIRCETUR Cajamarca',
   'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop',
   200, 'Articulación'),

  ('e2000000-0000-0000-0000-000000000002',
   'Taller: Buenas Prácticas de Post-Cosecha de Café',
   'Capacitación técnica sobre procesamiento, fermentación y secado de café para mejorar la calidad y el precio del producto.',
   '2026-07-20', '09:00',
   'Oficinas de AGRORURAL Cajamarca', 'taller',
   'AGRORURAL Cajamarca',
   'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&h=400&fit=crop',
   40, 'Capacitación'),

  ('e3000000-0000-0000-0000-000000000003',
   'Convocatoria FONDAGRO 2026 - Proyectos Productivos',
   'AGROIDEAS lanza fondos no reembolsables para organizaciones agrarias. Cierre: 30 de Julio 2026.',
   '2026-07-30', '00:00',
   'Virtual / Plataforma AGROIDEAS', 'convocatoria',
   'AGROIDEAS - MIDAGRI',
   'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop',
   null, 'Financiamiento')

ON CONFLICT (id) DO NOTHING;

-- ─── 7. CADENAS PRODUCTIVAS ───────────────────────────────────────────────────
INSERT INTO public.cadenas_productivas (
  id, nombre, descripcion, categoria, actores,
  volumen_anual, unidad, impacto_economico, estado
) VALUES
  ('cp100000-0000-0000-0000-000000000001',
   'Café', 'Cadena del café especial y orgánico de San Ignacio y Jaén',
   'Bebidas', 1240, 8500, 'TM/año', 45000000, 'activo'),
  ('cp200000-0000-0000-0000-000000000002',
   'Lácteos', 'Cadena de leche y derivados de Cajamarca y Bambamarca',
   'Alimentos', 890, 65000, 'L/día', 38000000, 'activo'),
  ('cp300000-0000-0000-0000-000000000003',
   'Cacao', 'Cacao fino de aroma de Jaén y San Ignacio',
   'Confitería', 420, 1200, 'TM/año', 18000000, 'activo'),
  ('cp400000-0000-0000-0000-000000000004',
   'Quinua', 'Granos andinos de Cajamarca y Celendín',
   'Granos', 310, 450, 'TM/año', 8500000, 'activo'),
  ('cp500000-0000-0000-0000-000000000005',
   'Tubérculos Nativos', 'Papa nativa y olluco andino',
   'Tubérculos', 680, 12000, 'TM/año', 12000000, 'activo'),
  ('cp600000-0000-0000-0000-000000000006',
   'Apicultura', 'Miel y derivados de San Marcos y Cajabamba',
   'Apicultura', 145, 85, 'TM/año', 3200000, 'activo')
ON CONFLICT (id) DO NOTHING;

-- ─── 8. SOLICITUDES de contacto ──────────────────────────────────────────────
INSERT INTO public.publicaciones (
  id, autor_id, tipo, titulo, contenido, estado, fijada
) VALUES
  (gen_random_uuid(), null, 'publicacion',
   'SOLICITUD: Contacto - Roberto Herrera',
   'Tipo: adquisicion | Email: r.herrera@importadora.com | Telefono: 999-111-222 | Producto: Café Orgánico | Cadena: Café | Cantidad: 200 kg/mes | Mensaje: Interesados en establecer relación comercial estable.',
   'aprobado', false),
  (gen_random_uuid(), null, 'publicacion',
   'SOLICITUD: Contacto - Ana Lucía Pérez',
   'Tipo: contacto | Email: ana.perez@gmail.com | Telefono: 976-543-210 | Mensaje: Quisiera saber cómo registrar mi cooperativa.',
   'aprobado', false)
ON CONFLICT DO NOTHING;

-- ─── 9. TESTIMONIOS ───────────────────────────────────────────────────────────
INSERT INTO public.testimonios (
  nombre, cargo, organizacion, foto, texto, rating, activo, orden
) VALUES
  ('María Santos Torres', 'Presidenta de Cooperativa', 'Cooperativa Cafetalera Chirinos',
   'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
   'ARTICULA CAJ nos conectó con un importador alemán y triplicamos nuestras exportaciones en un año. La plataforma es intuitiva y el soporte excelente.',
   5, true, 1),
  ('Jorge Huaripata', 'Productor independiente de cacao', 'San Ignacio, Cajamarca',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',
   'Gracias a la vitrina comercial pude vender mi cacao directamente a chocolateros de Lima. Mi precio mejoró en 35%.',
   5, true, 2),
  ('Rosa Cárdenas Llanos', 'Técnica DIRCETUR', 'Gobierno Regional Cajamarca',
   'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop',
   'Como institución, ARTICULA CAJ nos permite difundir programas públicos de forma efectiva. La respuesta del sector ha sido notable.',
   5, true, 3),
  ('Luis Castilla Vera', 'Gerente Comercial', 'Lácteos del Norte S.A.C.',
   'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop',
   'Encontramos tres proveedores nuevos de leche fresca en menos de dos semanas. La plataforma ahorra tiempo y genera confianza.',
   5, true, 4),
  ('Nelly Burga Rojas', 'Presidenta', 'Asociación Apicultores San Marcos',
   'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop',
   'Nuestra miel antes llegaba solo al mercado local. Con ARTICULA CAJ llegamos a Lima y recibimos consultas de exportación desde España.',
   5, true, 5)
ON CONFLICT DO NOTHING;

-- ─── 10. SITE CONFIG ──────────────────────────────────────────────────────────
INSERT INTO public.site_config (
  id, actores_count, productos_count, acuerdos_count,
  ventas_impacto, telefono, email, direccion
) VALUES (
  'main', 3847, 1234, 289, 124,
  '+51 076 365 000', 'info@articulacaj.pe',
  'Jr. Dos de Mayo 569, Cajamarca, Perú'
)
ON CONFLICT (id) DO UPDATE SET
  actores_count  = EXCLUDED.actores_count,
  productos_count = EXCLUDED.productos_count,
  acuerdos_count = EXCLUDED.acuerdos_count,
  ventas_impacto = EXCLUDED.ventas_impacto,
  telefono       = EXCLUDED.telefono,
  email          = EXCLUDED.email,
  direccion      = EXCLUDED.direccion,
  updated_at     = now();

-- =============================================================================
-- VERIFICACIÓN: Cuenta los registros insertados
-- =============================================================================
DO $$
DECLARE
  v_perfiles      int;
  v_actores       int;
  v_productos     int;
  v_publicaciones int;
  v_eventos       int;
  v_testimonios   int;
BEGIN
  SELECT count(*) INTO v_perfiles      FROM public.perfiles;
  SELECT count(*) INTO v_actores       FROM public.actores;
  SELECT count(*) INTO v_productos     FROM public.productos;
  SELECT count(*) INTO v_publicaciones FROM public.publicaciones WHERE titulo NOT LIKE 'SOLICITUD:%';
  SELECT count(*) INTO v_eventos       FROM public.eventos;
  SELECT count(*) INTO v_testimonios   FROM public.testimonios;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'ARTICULA CAJ — Seed completado';
  RAISE NOTICE '  Perfiles:       %', v_perfiles;
  RAISE NOTICE '  Actores:        %', v_actores;
  RAISE NOTICE '  Productos:      %', v_productos;
  RAISE NOTICE '  Publicaciones:  %', v_publicaciones;
  RAISE NOTICE '  Eventos:        %', v_eventos;
  RAISE NOTICE '  Testimonios:    %', v_testimonios;
  RAISE NOTICE '========================================';
END $$;
