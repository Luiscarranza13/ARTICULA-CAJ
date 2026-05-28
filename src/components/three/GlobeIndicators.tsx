import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Globo 3D de Cajamarca para la sección de Indicadores
// Muestra los actores como puntos de luz sobre el globo

const CAJAMARCA_DISTRITOS = [
  { name: 'Cajamarca',    lat:  -7.16, lng: -78.51, size: 1.4 },
  { name: 'Jaén',         lat:  -5.70, lng: -78.81, size: 1.1 },
  { name: 'San Ignacio',  lat:  -5.14, lng: -79.00, size: 0.9 },
  { name: 'Bambamarca',   lat:  -6.68, lng: -78.52, size: 0.8 },
  { name: 'Chota',        lat:  -6.56, lng: -78.65, size: 0.8 },
  { name: 'Celendín',     lat:  -6.86, lng: -78.15, size: 0.7 },
  { name: 'Cajabamba',    lat:  -7.62, lng: -78.05, size: 0.7 },
  { name: 'San Marcos',   lat:  -7.33, lng: -78.17, size: 0.6 },
  { name: 'Cutervo',      lat:  -6.37, lng: -78.81, size: 0.6 },
  { name: 'Contumaza',    lat:  -7.37, lng: -78.91, size: 0.5 },
];

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

export default function GlobeIndicators() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth;
    const H = el.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // ── Luces ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sun = new THREE.DirectionalLight(0x10b981, 2.5);
    sun.position.set(3, 3, 3);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x6ee7b7, 1.0);
    fill.position.set(-3, -1, -2);
    scene.add(fill);

    // ── Globo base ───────────────────────────────────────────────────────────
    const R = 1.5;
    const globeGeo = new THREE.SphereGeometry(R, 48, 48);
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0x064e3b,
      transparent: true,
      opacity: 0.85,
      shininess: 60,
      specular: new THREE.Color(0x10b981),
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Wireframe sobre el globo
    const wireGeo = new THREE.SphereGeometry(R + 0.01, 20, 20);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    scene.add(new THREE.Mesh(wireGeo, wireMat));

    // Anillo decorativo
    const ringGeo = new THREE.TorusGeometry(R + 0.18, 0.008, 8, 80);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.4 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.4;
    scene.add(ring);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(R + 0.28, 0.005, 8, 80),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.25 }),
    );
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.z = Math.PI / 6;
    scene.add(ring2);

    // ── Puntos de Cajamarca ──────────────────────────────────────────────────
    const group = new THREE.Group();
    scene.add(group);

    CAJAMARCA_DISTRITOS.forEach((d) => {
      const pos = latLngToVec3(d.lat, d.lng, R);

      // Punto principal
      const dotGeo = new THREE.SphereGeometry(0.028 * d.size, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      group.add(dot);

      // Halo pulsante
      const haloGeo = new THREE.SphereGeometry(0.06 * d.size, 8, 8);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.2,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(pos);
      group.add(halo);

      // Línea vertical (spike)
      const spikeGeo = new THREE.CylinderGeometry(0.004, 0.001, 0.12 * d.size, 4);
      const spikeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      const normal = pos.clone().normalize();
      spike.position.copy(pos.clone().add(normal.clone().multiplyScalar(0.06 * d.size)));
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      group.add(spike);
    });

    // Rotar el globo para centrar en Perú
    globe.rotation.y   = 2.1;
    group.rotation.y   = 2.1;
    wireGeo.dispose();

    // ── Atmósfera (glow externo) ─────────────────────────────────────────────
    const atmGeo = new THREE.SphereGeometry(R + 0.12, 32, 32);
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // ── Partículas de fondo ──────────────────────────────────────────────────
    const starsGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(600);
    for (let i = 0; i < 200; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3.5 + Math.random() * 1.5;
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({
      color: 0x6ee7b7, size: 0.03, transparent: true, opacity: 0.5, sizeAttenuation: true,
    })));

    // ── Interacción mouse ────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Animación ────────────────────────────────────────────────────────────
    let rafId: number;
    let t = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      t += 0.016;

      globe.rotation.y += 0.002;
      group.rotation.y += 0.002;
      ring.rotation.z  += 0.001;
      ring2.rotation.z -= 0.0007;

      // Mouse tilt suave
      globe.rotation.x += (mouse.y * 0.15 - globe.rotation.x) * 0.03;
      group.rotation.x  = globe.rotation.x;

      // Pulso de halos
      group.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshBasicMaterial;
          if (mat.opacity < 0.3 && mat.transparent) {
            mat.opacity = 0.1 + Math.abs(Math.sin(t * 1.5 + Math.random())) * 0.2;
          }
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={mountRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />
  );
}
