"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

type ArtifactStatus = "proxy" | "meshy";
type ReleaseState = "blocked" | "cleared";

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

function createFallbackArtifact() {
  const group = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({
    color: 0x151817,
    metalness: 0.92,
    roughness: 0.24,
  });
  const blackSoft = new THREE.MeshStandardMaterial({
    color: 0x292d2b,
    metalness: 0.78,
    roughness: 0.34,
  });
  const coral = new THREE.MeshStandardMaterial({
    color: 0xff6848,
    emissive: 0x7d1608,
    emissiveIntensity: 1.6,
    metalness: 0.5,
    roughness: 0.22,
  });
  const lime = new THREE.MeshStandardMaterial({
    color: 0xb8ff68,
    emissive: 0x2a5600,
    emissiveIntensity: 1.55,
    metalness: 0.42,
    roughness: 0.2,
  });

  const rail = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.3, 0.48, 8, 2, 2), black);
  group.add(rail);

  const railInset = new THREE.Mesh(
    new THREE.BoxGeometry(4.76, 0.08, 0.52),
    blackSoft,
  );
  railInset.position.y = 0.18;
  group.add(railInset);

  const gate = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.58, 0.98, 3, 4, 3),
    black,
  );
  gate.position.y = 0.13;
  group.add(gate);

  const gateChannel = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 1.72, 1.04),
    coral,
  );
  gateChannel.position.set(-0.16, 0.14, 0);
  group.add(gateChannel);

  const verifiedRail = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.14, 0.54),
    lime,
  );
  verifiedRail.position.set(1.68, 0.1, 0);
  group.add(verifiedRail);

  const sealBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.18, 48),
    blackSoft,
  );
  sealBody.rotation.x = Math.PI / 2;
  sealBody.position.set(0.43, 0.42, 0.56);
  group.add(sealBody);

  const sealRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.055, 12, 48),
    lime,
  );
  sealRing.position.set(0.43, 0.42, 0.67);
  group.add(sealRing);

  const lock = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.52, 0.28),
    coral,
  );
  lock.position.set(-1.5, 0.28, 0.35);
  group.add(lock);

  return group;
}

function normalizeMeshyModel(root: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  const scale = 5.45 / maxDimension;
  const material = new THREE.MeshStandardMaterial({
    color: 0x171a18,
    metalness: 0.94,
    roughness: 0.27,
  });

  root.scale.setScalar(scale);
  root.position.copy(center.multiplyScalar(-scale));
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    if (!object.geometry.getAttribute("normal")) {
      object.geometry.computeVertexNormals();
    }
    const previousMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const previousMaterial of previousMaterials) previousMaterial.dispose();
    object.material = material;
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

export function ProofArtifact({ releaseState }: { releaseState: ReleaseState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const releaseStateRef = useRef(releaseState);
  const [status, setStatus] = useState<ArtifactStatus>("proxy");

  useEffect(() => {
    releaseStateRef.current = releaseState;
  }, [releaseState]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let disposed = false;
    let frame = 0;
    let visible = true;
    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0.35, 7.3);

    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(environment).texture;
    environment.dispose();

    const stage = new THREE.Group();
    stage.rotation.set(0.06, -0.32, 0.02);
    scene.add(stage);

    const proxyArtifact = createFallbackArtifact();
    stage.add(proxyArtifact);

    const coralLight = new THREE.PointLight(0xff6848, 28, 6, 1.8);
    coralLight.position.set(-2.2, 1.2, 2.4);
    scene.add(coralLight);

    const limeLight = new THREE.PointLight(0xb8ff68, 22, 6, 1.8);
    limeLight.position.set(2.2, -0.8, 2.2);
    scene.add(limeLight);

    const keyLight = new THREE.DirectionalLight(0xf4efe1, 3.4);
    keyLight.position.set(2.5, 4, 4);
    scene.add(keyLight);

    new GLTFLoader().load(
      "/media/proofrail-evidence-core.glb",
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }

        normalizeMeshyModel(gltf.scene);
        stage.remove(proxyArtifact);
        disposeObject(proxyArtifact);
        stage.add(gltf.scene);
        setStatus("meshy");
      },
      undefined,
      (error) => {
        console.warn("ProofRail Meshy model unavailable; using realtime proxy.", error);
      },
    );

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const halfHorizontalFov =
        Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect;
      camera.position.z = Math.max(7.3, 3.05 / Math.max(halfHorizontalFov, 0.01));
      camera.updateProjectionMatrix();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointerTarget.set(
        ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        ((event.clientY - rect.top) / rect.height - 0.5) * 2,
      );
    };

    const onPointerLeave = () => pointerTarget.set(0, 0);
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = new THREE.Timer();
    timer.connect(document);

    const render = (timestamp: number) => {
      timer.update(timestamp);
      if (!visible) return;

      const elapsed = timer.getElapsed();
      const reduced = reduceMotion.matches;
      const cleared = releaseStateRef.current === "cleared";
      pointer.lerp(pointerTarget, 0.045);
      stage.rotation.y =
        -0.32 +
        pointer.x * 0.12 +
        (reduced ? 0 : Math.sin(elapsed * 0.28) * 0.045);
      stage.rotation.x = 0.06 + pointer.y * 0.055;
      stage.position.y = reduced ? 0 : Math.sin(elapsed * 0.62) * 0.045;
      coralLight.intensity = THREE.MathUtils.lerp(
        coralLight.intensity,
        cleared ? 5 : 28,
        0.06,
      );
      limeLight.intensity = THREE.MathUtils.lerp(
        limeLight.intensity,
        cleared ? 34 : 16,
        0.06,
      );
      renderer.render(scene, camera);
    };

    const animate = (timestamp: number) => {
      render(timestamp);
      frame = window.requestAnimationFrame(animate);
    };

    resizeObserver.observe(host);
    intersectionObserver.observe(host);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    resize();
    frame = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      disposeObject(stage);
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      timer.dispose();
    };
  }, []);

  return (
    <div
      className="artifact-stage"
      ref={hostRef}
      data-status={status}
      data-release-state={releaseState}
      role="img"
      aria-label={`3D visualization of the ProofRail evidence gate: release ${releaseState}`}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="artifact-reticle" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="artifact-readout" aria-hidden="true">
        <span>Object / evidence core</span>
        <strong>
          {status === "meshy" ? "Evidence model" : "Realtime proxy"} · {releaseState}
        </strong>
      </div>
      <p className="artifact-hint">
        {releaseState === "cleared" ? "Gate cleared" : "Move to inspect"}
      </p>
    </div>
  );
}
