import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Partículas 3D flotantes para el hero de la landing
// Formas geométricas que representan productos agrícolas de Cajamarca

export default function HeroParticles() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth;
    const H = el.clientHeight;

    // ── Escena ───────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.035);

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // ── Luces ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0x10b981, 1.8);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0xf59e0b, 1.2);
    dirLight2.position.set(-6, -4, 3);
    scene.add(dirLight2);
    const pointLight = new THREE.PointLight(0x6ee7b7, 2, 30);
    pointLight.position.set(0, 5, 10);
    scene.add(pointLight);

    // ── Paleta de colores ────────────────────────────────────────────────────
    const palette = [
      0x10b981, // emerald-500
      0x059669, // emerald-600
      0x34d399, // emerald-400
      0xf59e0b, // amber-400
      0xfbbf24, // amber-300
      0x6ee7b7, // emerald-300
      0xa7f3d0, // emerald-200
      0xd97706, // amber-500
    ];

    // ── Geometrías variadas ──────────────────────────────────────────────────
    const geos = [
      new THREE.IcosahedronGeometry(0.35, 0),
      new THREE.OctahedronGeometry(0.4, 0),
      new THREE.TetrahedronGeometry(0.38, 0),
      new THREE.DodecahedronGeometry(0.32, 0),
      new THREE.SphereGeometry(0.22, 8, 8),
    ];

    // ── Crear partículas ─────────────────────────────────────────────────────
    type Particle = {
      mesh: THREE.Mesh;
      vx: number; vy: number; vz: number;
      rx: number; ry: number; rz: number;
      baseY: number;
      floatSpeed: number;
      floatOffset: number;
    };

    const particles: Particle[] = [];
    const COUNT = 80;

    for (let i = 0; i < COUNT; i++) {
      const geo = geos[Math.floor(Math.random() * geos.length)];
      const color = palette[Math.floor(Math.random() * palette.length)];
      const mat = new THREE.MeshPhongMaterial({
        color,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.55,
        shininess: 80 + Math.random() * 80,
        specular: new THREE.Color(0xffffff),
        wireframe: Math.random() > 0.65,
      });

      const scale = 0.4 + Math.random() * 1.4;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.setScalar(scale);
      mesh.position.set(
        (Math.random() - 0.5) * 36,
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 18 - 2,
      );
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      scene.add(mesh);

      particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 0.003,
        vy: (Math.random() - 0.5) * 0.003,
        vz: 0,
        rx: (Math.random() - 0.5) * 0.006,
        ry: (Math.random() - 0.5) * 0.008,
        rz: (Math.random() - 0.5) * 0.004,
        baseY: mesh.position.y,
        floatSpeed: 0.3 + Math.random() * 0.7,
        floatOffset: Math.random() * Math.PI * 2,
      });
    }

    // ── Sistema de partículas pequeñas (polvo dorado) ────────────────────────
    const dustCount = 300;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3]     = (Math.random() - 0.5) * 50;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.07,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ── Mouse parallax ───────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    const targetCam = { x: 0, y: 0 };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Loop de animación ────────────────────────────────────────────────────
    let rafId: number;
    let t = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      t += 0.016;

      // Suavizar movimiento de cámara
      targetCam.x += (mouse.x * 1.5 - targetCam.x) * 0.04;
      targetCam.y += (mouse.y * 1.0 - targetCam.y) * 0.04;
      camera.position.x = targetCam.x;
      camera.position.y = targetCam.y;
      camera.lookAt(scene.position);

      // Animar partículas
      particles.forEach((p) => {
        p.mesh.rotation.x += p.rx;
        p.mesh.rotation.y += p.ry;
        p.mesh.rotation.z += p.rz;
        p.mesh.position.x += p.vx;
        p.mesh.position.y = p.baseY + Math.sin(t * p.floatSpeed + p.floatOffset) * 0.6;
        p.mesh.position.z += p.vz;

        // Rebote en bordes
        const px = p.mesh.position.x;
        const py = p.mesh.position.y;
        if (px > 18 || px < -18) p.vx *= -1;
        if (py > 11 || py < -11) { p.vy *= -1; p.baseY = p.mesh.position.y; }
      });

      dust.rotation.y += 0.0003;
      dust.rotation.x += 0.0001;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geos.forEach((g) => g.dispose());
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
