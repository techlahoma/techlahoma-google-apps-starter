import * as THREE from 'three';
import {
  DOWNTOWN_BUILDINGS,
  DOWNTOWN_STREETS,
  MAP_WORLD_BOUNDS,
  ROOFTOP_RAMPS,
  type BuildingFootprint,
  type CheckpointLocation,
} from '../data/tulsa-map';
import {createExtrudedFootprintMesh} from '../data/building-geometry';
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
  private carWheelMeshes: Map<string, THREE.Mesh[]> = new Map();
  private checkpointMeshes: THREE.Group[] = [];
  private shadowLights: THREE.DirectionalLight[] = [];
  private isReducedMotion = false;
  private resizeObserver: ResizeObserver | null = null;
  private isWebGlSupported = true;

  constructor(options: RendererOptions) {
    this.isReducedMotion = options.isReducedMotion || false;
    this.initThree(options.canvas);
  }

  private initThree(canvas: HTMLCanvasElement): void {
    const container = canvas.parentElement || document.body;
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    try {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x101c38);
      this.scene.fog = new THREE.FogExp2(0x101c38, 0.00042);

      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 3000);
      this.frameDowntown();

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.35;
      this.renderer.shadowMap.enabled = !this.isReducedMotion;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;

      this.setupLighting();
      this.buildDowntownTulsa();
      this.setupResizeObserver(container);
    } catch (err) {
      console.error('WebGL initialization failed:', err);
      this.isWebGlSupported = false;
      this.showWebGlFallback(container);
    }
  }

  private setupResizeObserver(container: HTMLElement): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const {width, height} = entry.contentRect;
        if (width > 0 && height > 0) {
          this.resize(width, height);
        }
      }
    });

    this.resizeObserver.observe(container);
  }

  private showWebGlFallback(container: HTMLElement): void {
    const fallback = document.createElement('div');
    fallback.className = 'webgl-fallback';
    fallback.innerHTML = `
      <h2>WebGL Unavailable</h2>
      <p>Your browser or hardware environment could not initialize WebGL graphics.</p>
      <p>Use the 2D Checkpoint View below for accessible race standings.</p>
    `;
    container.appendChild(fallback);
  }

  private frameDowntown(): void {
    const width = MAP_WORLD_BOUNDS.maxX - MAP_WORLD_BOUNDS.minX;
    const depth = MAP_WORLD_BOUNDS.maxZ - MAP_WORLD_BOUNDS.minZ;
    const span = Math.max(width, depth);
    const centerX = (MAP_WORLD_BOUNDS.minX + MAP_WORLD_BOUNDS.maxX) / 2;
    const centerZ = (MAP_WORLD_BOUNDS.minZ + MAP_WORLD_BOUNDS.maxZ) / 2;
    this.camera.position.set(
      centerX - span * 0.42,
      span * 0.7,
      centerZ + span * 0.48,
    );
    this.camera.lookAt(centerX, 8, centerZ);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x8da6c8, 1.35);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffd2a1, 3.2);
    sunLight.position.set(-280, 520, 340);
    sunLight.castShadow = !this.isReducedMotion;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 1800;
    sunLight.shadow.bias = -0.00015;
    sunLight.shadow.normalBias = 0.8;
    const d = 620;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);
    this.shadowLights.push(sunLight);

    const fillLight = new THREE.DirectionalLight(0x72a8ff, 1.5);
    fillLight.position.set(420, 260, -360);
    this.scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0x91baff, 0x574537, 1.4);
    this.scene.add(hemiLight);
  }

  private buildDowntownTulsa(): void {
    const mapWidth = MAP_WORLD_BOUNDS.maxX - MAP_WORLD_BOUNDS.minX;
    const mapDepth = MAP_WORLD_BOUNDS.maxZ - MAP_WORLD_BOUNDS.minZ;
    const mapCenterX = (MAP_WORLD_BOUNDS.minX + MAP_WORLD_BOUNDS.maxX) / 2;
    const mapCenterZ = (MAP_WORLD_BOUNDS.minZ + MAP_WORLD_BOUNDS.maxZ) / 2;
    const groundGeo = new THREE.PlaneGeometry(mapWidth + 180, mapDepth + 180);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x263441,
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(mapCenterX, 0, mapCenterZ);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const streetMaterial = new THREE.MeshStandardMaterial({
      color: 0x536370,
      roughness: 0.92,
      metalness: 0.03,
    });
    for (const street of DOWNTOWN_STREETS) {
      const streetMesh = this.createStreetMesh(street, streetMaterial);
      if (streetMesh) this.scene.add(streetMesh);
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

  private createStreetMesh(
    street: (typeof DOWNTOWN_STREETS)[number],
    material: THREE.MeshStandardMaterial,
  ): THREE.Mesh | null {
    const dx = street.end[0] - street.start[0];
    const dz = street.end[1] - street.start[1];
    const length = Math.hypot(dx, dz);
    if (length < 0.5) return null;

    const normalX = (-dz / length) * (street.width / 2);
    const normalZ = (dx / length) * (street.width / 2);
    const vertices = new Float32Array([
      street.start[0] + normalX,
      0.06,
      street.start[1] + normalZ,
      street.start[0] - normalX,
      0.06,
      street.start[1] - normalZ,
      street.end[0] - normalX,
      0.06,
      street.end[1] - normalZ,
      street.end[0] + normalX,
      0.06,
      street.end[1] + normalZ,
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  private buildGradientLandmark(bldg: BuildingFootprint): void {
    const mesh = this.createBuildingMesh(bldg, {
      roughness: 0.58,
      metalness: 0.08,
      emissive: 0x5a180d,
      emissiveIntensity: 0.38,
    });
    this.scene.add(mesh);

    this.scene.add(this.createBuildingOutline(bldg, 0xff9f1c, 0.9));

    for (let level = 1; level < bldg.levels; level++) {
      const points = bldg.footprint.map(
        point =>
          new THREE.Vector3(
            point[0],
            (bldg.height / bldg.levels) * level,
            point[1],
          ),
      );
      if (points[0]) points.push(points[0]);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      this.scene.add(
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: 0xffb703,
            transparent: true,
            opacity: 0.75,
          }),
        ),
      );
    }

    const beaconGeometry = new THREE.CylinderGeometry(0.9, 0.9, 8, 16);
    const beaconMaterial = new THREE.MeshBasicMaterial({color: 0x00f5d4});
    const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
    beacon.position.set(bldg.center[0], bldg.height + 4, bldg.center[1]);
    this.scene.add(beacon);

    const pointLight = new THREE.PointLight(0x00f5d4, 4.2, 85);
    pointLight.position.set(bldg.center[0], bldg.height + 7, bldg.center[1]);
    this.scene.add(pointLight);

    if (bldg.label) this.scene.add(this.createBuildingLabel(bldg));
  }

  private buildGenericBuilding(bldg: BuildingFootprint): void {
    const mesh = this.createBuildingMesh(bldg, {
      roughness: 0.72,
      metalness: bldg.type === 'office' ? 0.18 : 0.06,
      emissive: bldg.color,
      emissiveIntensity: 0.07,
    });
    this.scene.add(mesh);

    this.scene.add(
      this.createBuildingOutline(
        bldg,
        bldg.label ? 0xc5d9e8 : 0x647c8f,
        bldg.label ? 0.72 : 0.22,
      ),
    );

    if (bldg.label) this.scene.add(this.createBuildingLabel(bldg));
  }

  private createBuildingOutline(
    building: BuildingFootprint,
    color: THREE.ColorRepresentation,
    opacity: number,
  ): THREE.LineSegments {
    const vertices: number[] = [];
    for (let index = 0; index < building.footprint.length; index++) {
      const point = building.footprint[index];
      const next = building.footprint[(index + 1) % building.footprint.length];
      if (!point || !next) continue;
      vertices.push(
        point[0],
        0.08,
        point[1],
        next[0],
        0.08,
        next[1],
        point[0],
        building.height + 0.08,
        point[1],
        next[0],
        building.height + 0.08,
        next[1],
        point[0],
        0.08,
        point[1],
        point[0],
        building.height + 0.08,
        point[1],
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    return new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
      }),
    );
  }

  private createBuildingMesh(
    building: BuildingFootprint,
    materialOptions: {
      roughness: number;
      metalness: number;
      emissive?: THREE.ColorRepresentation;
      emissiveIntensity?: number;
    },
  ): THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
    const meshData = createExtrudedFootprintMesh(
      building.footprint,
      building.height,
    );
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(meshData.vertices, 3),
    );
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(building.color),
      ...materialOptions,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = building.height > 7;
    // Receiving their own large-scale shadow map exposes roof-triangle acne.
    // Buildings still cast silhouettes onto streets and the ground.
    mesh.receiveShadow = false;
    return mesh;
  }

  private createBuildingLabel(building: BuildingFootprint): THREE.Sprite {
    const label = building.label ?? building.name.toUpperCase();
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'rgba(4, 12, 27, 0.9)';
      context.roundRect(8, 8, 1008, 176, 30);
      context.fill();
      context.strokeStyle =
        building.type === 'gradient' ? '#00f5d4' : '#ffb703';
      context.lineWidth = 8;
      context.stroke();
      context.fillStyle = '#ffffff';
      context.font = '900 76px system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(label, 512, 98, 940);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    const width = Math.min(190, Math.max(100, label.length * 9.5));
    sprite.scale.set(width, width * 0.1875, 1);
    sprite.position.set(
      building.center[0],
      building.height +
        Math.max(14, width * 0.08) +
        this.landmarkLabelLift(building.sourceId),
      building.center[1],
    );
    sprite.renderOrder = 100;
    return sprite;
  }

  private landmarkLabelLift(sourceId: string): number {
    switch (sourceId) {
      case 'osm-250496656':
        return 88;
      case 'osm-250496655':
        return 48;
      case 'osm-60964215':
        return 18;
      default:
        return 0;
    }
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
        this.carWheelMeshes.delete(id);
      }
    }

    for (const [id, state] of carStates.entries()) {
      let carGroup = this.carMeshes.get(id);
      let wheels = this.carWheelMeshes.get(id);

      if (!carGroup || !wheels) {
        const created = this.createProceduralCar(state);
        carGroup = created.group;
        wheels = created.wheels;

        this.scene.add(carGroup);
        this.carMeshes.set(id, carGroup);
        this.carWheelMeshes.set(id, wheels);
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

      // Animate 4 visual wheel suspension travel positions
      if (state.wheelPositions && wheels) {
        for (let i = 0; i < Math.min(4, state.wheelPositions.length); i++) {
          const wPos = state.wheelPositions[i];
          const wMesh = wheels[i];
          if (wPos && wMesh) {
            wMesh.position.set(wPos[0], wPos[1], wPos[2]);
          }
        }
      }
    }
  }

  private createProceduralCar(state: CarState): {
    group: THREE.Group;
    wheels: THREE.Mesh[];
  } {
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
    const defaultPositions: [number, number, number][] = [
      [-3.0, -1.0, 4.5],
      [3.0, -1.0, 4.5],
      [-3.0, -1.0, -4.5],
      [3.0, -1.0, -4.5],
    ];

    const wheels: THREE.Mesh[] = [];
    defaultPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      group.add(wheel);
      wheels.push(wheel);
    });

    return {group, wheels};
  }

  public setReducedMotion(enabled: boolean): void {
    this.isReducedMotion = enabled;
    if (this.renderer) {
      this.renderer.shadowMap.enabled = !enabled;
    }
    for (const light of this.shadowLights) {
      light.castShadow = !enabled;
    }
  }

  public render(): void {
    if (!this.isWebGlSupported || !this.renderer) return;

    if (!this.isReducedMotion) {
      for (const group of this.checkpointMeshes) {
        group.rotation.y += 0.015;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
