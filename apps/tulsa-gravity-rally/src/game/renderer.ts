import * as THREE from 'three';
import {
  DOWNTOWN_BUILDINGS,
  DOWNTOWN_STREETS,
  ROOFTOP_RAMPS,
  type CheckpointLocation,
} from '../data/tulsa-map';
import type {CarState} from './physics';

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  isReducedMotion?: boolean;
}

export class GameRenderer {
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;

  private carMeshes: Map<string, THREE.Group> = new Map();
  private checkpointMeshes: THREE.Group[] = [];
  private isReducedMotion = false;
  private animFrameId: number | null = null;

  constructor(options: RendererOptions) {
    this.isReducedMotion = options.isReducedMotion || false;
    this.initThree(options.canvas);
  }

  private initThree(canvas: HTMLCanvasElement): void {
    const width = canvas.clientWidth || 1440;
    const height = canvas.clientHeight || 900;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1128);
    this.scene.fog = new THREE.FogExp2(0x0a1128, 0.0035);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 600);
    this.camera.position.set(-80, 75, 110);
    this.camera.lookAt(0, 10, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isReducedMotion;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setupLighting();
    this.buildDowntownTulsa();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x213a5c, 1.2);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffaa55, 2.2);
    sunLight.position.set(120, 140, -80);
    sunLight.castShadow = !this.isReducedMotion;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 350;
    const d = 140;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x112244, 0x442211, 0.6);
    this.scene.add(hemiLight);
  }

  private buildDowntownTulsa(): void {
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1b2028,
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    for (const street of DOWNTOWN_STREETS) {
      const dx = street.end[0] - street.start[0];
      const dz = street.end[1] - street.start[1];
      const length = Math.sqrt(dx * dx + dz * dz);

      const streetGeo = new THREE.PlaneGeometry(street.width, length);
      const streetMat = new THREE.MeshStandardMaterial({
        color: 0x282e38,
        roughness: 0.9,
      });
      const mesh = new THREE.Mesh(streetGeo, streetMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(
        (street.start[0] + street.end[0]) / 2,
        0.05,
        (street.start[1] + street.end[1]) / 2,
      );
      mesh.rotation.z = Math.atan2(dx, dz);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }

    for (const bldg of DOWNTOWN_BUILDINGS) {
      if (bldg.type === 'gradient') {
        this.buildGradientLandmark(bldg);
      } else {
        this.buildGenericBuilding(bldg);
      }
    }

    for (const ramp of ROOFTOP_RAMPS) {
      const dx = ramp.end[0] - ramp.start[0];
      const dy = ramp.end[1] - ramp.start[1];
      const dz = ramp.end[2] - ramp.start[2];
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const rampGeo = new THREE.BoxGeometry(ramp.width, 0.6, length);
      const rampMat = new THREE.MeshStandardMaterial({
        color: 0x00b4d8,
        emissive: 0x0077b6,
        emissiveIntensity: 0.4,
        roughness: 0.4,
      });
      const rampMesh = new THREE.Mesh(rampGeo, rampMat);
      rampMesh.position.set(
        (ramp.start[0] + ramp.end[0]) / 2,
        (ramp.start[1] + ramp.end[1]) / 2,
        (ramp.start[2] + ramp.end[2]) / 2,
      );

      const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
      const yaw = Math.atan2(dx, dz);
      rampMesh.rotation.y = yaw;
      rampMesh.rotation.x = -pitch;
      rampMesh.castShadow = true;
      rampMesh.receiveShadow = true;
      this.scene.add(rampMesh);
    }
  }

  private buildGradientLandmark(bldg: (typeof DOWNTOWN_BUILDINGS)[0]): void {
    const group = new THREE.Group();
    group.position.set(bldg.center[0], 0, bldg.center[1]);

    const levelHeight = bldg.height / 5;
    for (let i = 0; i < 5; i++) {
      const inset = i * 0.8;
      const w = bldg.size[0] - inset;
      const d = bldg.size[1] - inset;

      const geo = new THREE.BoxGeometry(w, levelHeight, d);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(bldg.color),
        roughness: 0.6,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = levelHeight * i + levelHeight / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      const winGeo = new THREE.BoxGeometry(w + 0.2, levelHeight * 0.4, d + 0.2);
      const winMat = new THREE.MeshStandardMaterial({
        color: 0xffb703,
        emissive: 0xff9f1c,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const winMesh = new THREE.Mesh(winGeo, winMat);
      winMesh.position.y = levelHeight * i + levelHeight / 2;
      group.add(winMesh);
    }

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1b2028';
      ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = '#00f5d4';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GRADIENT', 256, 64);
    }
    const texture = new THREE.CanvasTexture(signCanvas);
    const signGeo = new THREE.BoxGeometry(16, 4, 0.8);
    const signMat = new THREE.MeshBasicMaterial({map: texture});
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, bldg.height + 2, bldg.size[1] / 2);
    group.add(signMesh);

    const beaconGeo = new THREE.CylinderGeometry(1, 1, 6, 16);
    const beaconMat = new THREE.MeshBasicMaterial({color: 0x00f5d4});
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(0, bldg.height + 3, 0);
    group.add(beaconMesh);

    const pointLight = new THREE.PointLight(0x00f5d4, 5.0, 60);
    pointLight.position.set(0, bldg.height + 6, 0);
    group.add(pointLight);

    this.scene.add(group);
  }

  private buildGenericBuilding(bldg: (typeof DOWNTOWN_BUILDINGS)[0]): void {
    const geo = new THREE.BoxGeometry(bldg.size[0], bldg.height, bldg.size[1]);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(bldg.color),
      roughness: 0.7,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(bldg.center[0], bldg.height / 2, bldg.center[1]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const winGeo = new THREE.BoxGeometry(
      bldg.size[0] + 0.1,
      bldg.height * 0.7,
      bldg.size[1] + 0.1,
    );
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xcc8800,
      emissiveIntensity: 0.35,
    });
    const winMesh = new THREE.Mesh(winGeo, winMat);
    winMesh.position.set(bldg.center[0], bldg.height / 2, bldg.center[1]);
    this.scene.add(winMesh);
  }

  public setCheckpoints(
    checkpoints: CheckpointLocation[],
    activeIndex: number,
  ): void {
    for (const group of this.checkpointMeshes) {
      this.scene.remove(group);
    }
    this.checkpointMeshes = [];

    checkpoints.forEach((cp, idx) => {
      const group = new THREE.Group();
      group.position.set(cp.position[0], cp.position[1], cp.position[2]);

      const isActive = idx === activeIndex;
      const ringColor = isActive
        ? 0x00f5d4
        : idx < activeIndex
          ? 0x555555
          : 0xff9f1c;

      const torusGeo = new THREE.TorusGeometry(cp.radius, 0.8, 16, 32);
      const torusMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        wireframe: false,
      });
      const torusMesh = new THREE.Mesh(torusGeo, torusMat);
      torusMesh.rotation.x = Math.PI / 2;
      group.add(torusMesh);

      if (isActive) {
        const beamGeo = new THREE.CylinderGeometry(
          0.5,
          cp.radius,
          40,
          16,
          1,
          true,
        );
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x00f5d4,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 20;
        group.add(beam);
      }

      this.scene.add(group);
      this.checkpointMeshes.push(group);
    });
  }

  public updateCars(carStates: Map<string, CarState>): void {
    const activeIds = new Set(carStates.keys());

    for (const [id, mesh] of this.carMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.carMeshes.delete(id);
      }
    }

    for (const [id, state] of carStates.entries()) {
      let carGroup = this.carMeshes.get(id);
      if (!carGroup) {
        carGroup = this.createProceduralCar(state);
        this.scene.add(carGroup);
        this.carMeshes.set(id, carGroup);
      }

      carGroup.position.set(
        state.position[0],
        state.position[1],
        state.position[2],
      );
      carGroup.quaternion.set(
        state.rotation[0],
        state.rotation[1],
        state.rotation[2],
        state.rotation[3],
      );
    }
  }

  private createProceduralCar(state: CarState): THREE.Group {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(5.6, 2.2, 14.0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(state.color),
      roughness: 0.3,
      metalness: 0.4,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    const haloGeo = new THREE.TorusGeometry(4.0, 0.4, 8, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(state.color),
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.rotation.x = Math.PI / 2;
    haloMesh.position.y = -1.0;
    group.add(haloMesh);

    const emojiCanvas = document.createElement('canvas');
    emojiCanvas.width = 256;
    emojiCanvas.height = 256;
    const ctx = emojiCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(128, 128, 110, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '140px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.emoji, 128, 128);
    }
    const texture = new THREE.CanvasTexture(emojiCanvas);
    const placardGeo = new THREE.PlaneGeometry(4.5, 4.5);
    const placardMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const placard = new THREE.Mesh(placardGeo, placardMat);
    placard.rotation.x = -Math.PI / 2;
    placard.position.y = 1.25;
    group.add(placard);

    const headGeo = new THREE.BoxGeometry(1.2, 0.6, 0.4);
    const headMat = new THREE.MeshBasicMaterial({color: 0x00f5d4});
    const headL = new THREE.Mesh(headGeo, headMat);
    headL.position.set(-2.0, 0.2, 7.1);
    const headR = new THREE.Mesh(headGeo, headMat);
    headR.position.set(2.0, 0.2, 7.1);
    group.add(headL);
    group.add(headR);

    const tailMat = new THREE.MeshBasicMaterial({color: 0xff0055});
    const tailL = new THREE.Mesh(headGeo, tailMat);
    tailL.position.set(-2.0, 0.2, -7.1);
    const tailR = new THREE.Mesh(headGeo, tailMat);
    tailR.position.set(2.0, 0.2, -7.1);
    group.add(tailL);
    group.add(tailR);

    const wheelGeo = new THREE.CylinderGeometry(1.8, 1.8, 1.2, 16);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
    });
    const positions: [number, number, number][] = [
      [-3.0, -1.0, 4.5],
      [3.0, -1.0, 4.5],
      [-3.0, -1.0, -4.5],
      [3.0, -1.0, -4.5],
    ];

    positions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      group.add(wheel);
    });

    return group;
  }

  public setReducedMotion(enabled: boolean): void {
    this.isReducedMotion = enabled;
    this.renderer.shadowMap.enabled = !enabled;
  }

  public render(): void {
    for (const group of this.checkpointMeshes) {
      group.rotation.y += 0.015;
    }

    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.renderer.dispose();
  }
}
