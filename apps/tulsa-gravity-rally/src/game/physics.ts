import RAPIER from '@dimforge/rapier3d-compat';
import {
  DOWNTOWN_BUILDINGS,
  MAP_WORLD_BOUNDS,
  ROOFTOP_RAMPS,
  type CheckpointLocation,
} from '../data/tulsa-map';
import {createExtrudedFootprintMesh} from '../data/building-geometry';

export interface CarControlInput {
  steering: number;
  throttle: number;
  brake: boolean;
  boost: boolean;
  sequence: number;
  timestamp: number;
}

export interface CarState {
  id: string;
  emoji: string;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  velocity: [number, number, number];
  speedKmH: number;
  isGrounded: boolean;
  boostCooldown: number;
  lastCheckpointIndex: number;
  checkpointsCompleted: number;
  lastCheckpointTime: number;
  score: number;
  wheelPositions: [number, number, number][];
  wheelSuspensionLengths: number[];
}

export const CAR_SPECS = {
  halfWidth: 2.8,
  halfHeight: 1.1,
  halfLength: 7.0,
  wheelRadius: 1.8,
  mass: 1200,
  engineForce: 36000,
  brakeForce: 45000,
  steerAngleMax: 0.52,
  suspensionRestLength: 1.4,
  suspensionStiffness: 48000,
  suspensionDamping: 3800,
  boostImpulseUp: 6000,
  boostImpulseForward: 12000,
  boostCooldownTime: 3.5,
  inputTimeoutMs: 650,
};

const WHEEL_MOUNTS_LOCAL: [number, number, number][] = [
  [
    -CAR_SPECS.halfWidth * 0.9,
    -CAR_SPECS.halfHeight * 0.55,
    CAR_SPECS.halfLength * 0.72,
  ],
  [
    CAR_SPECS.halfWidth * 0.9,
    -CAR_SPECS.halfHeight * 0.55,
    CAR_SPECS.halfLength * 0.72,
  ],
  [
    -CAR_SPECS.halfWidth * 0.9,
    -CAR_SPECS.halfHeight * 0.55,
    -CAR_SPECS.halfLength * 0.72,
  ],
  [
    CAR_SPECS.halfWidth * 0.9,
    -CAR_SPECS.halfHeight * 0.55,
    -CAR_SPECS.halfLength * 0.72,
  ],
];

function rotateVectorByQuaternion(
  v: [number, number, number],
  q: {x: number; y: number; z: number; w: number},
): [number, number, number] {
  const x = v[0],
    y = v[1],
    z = v[2];
  const qx = q.x,
    qy = q.y,
    qz = q.z,
    qw = q.w;

  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;

  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ];
}

export class PhysicsEngine {
  public world!: RAPIER.World;
  private initialized = false;
  private carBodies: Map<string, RAPIER.RigidBody> = new Map();
  private carColliders: Map<string, RAPIER.Collider> = new Map();
  private carStates: Map<string, CarState> = new Map();
  private carInputs: Map<string, CarControlInput> = new Map();
  private carInputReceivedAt: Map<string, number> = new Map();
  private carInvertedTimers: Map<string, number> = new Map();
  private carSpawnPositions: Map<string, [number, number, number]> = new Map();
  private accumulator = 0;

  public async init(): Promise<void> {
    if (this.initialized) return;
    await RAPIER.init();

    const gravity = {x: 0.0, y: -11.8, z: 0.0};
    this.world = new RAPIER.World(gravity);

    // Main Ground plane
    const groundCenterX = (MAP_WORLD_BOUNDS.minX + MAP_WORLD_BOUNDS.maxX) / 2;
    const groundCenterZ = (MAP_WORLD_BOUNDS.minZ + MAP_WORLD_BOUNDS.maxZ) / 2;
    const groundHalfWidth =
      (MAP_WORLD_BOUNDS.maxX - MAP_WORLD_BOUNDS.minX) / 2 + 90;
    const groundHalfDepth =
      (MAP_WORLD_BOUNDS.maxZ - MAP_WORLD_BOUNDS.minZ) / 2 + 90;
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      groundCenterX,
      -0.5,
      groundCenterZ,
    );
    const groundBody = this.world.createRigidBody(groundBodyDesc);
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(
      groundHalfWidth,
      0.5,
      groundHalfDepth,
    );
    this.world.createCollider(groundColliderDesc, groundBody);

    this.buildMapColliders();
    this.initialized = true;
  }

  private buildMapColliders(): void {
    for (const bldg of DOWNTOWN_BUILDINGS) {
      const mesh = createExtrudedFootprintMesh(bldg.footprint, bldg.height);
      const bodyDesc = RAPIER.RigidBodyDesc.fixed();
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.trimesh(
        mesh.vertices,
        mesh.indices,
      ).setFriction(0.82);
      this.world.createCollider(colliderDesc, body);
    }

    for (const ramp of ROOFTOP_RAMPS) {
      const dx = ramp.end[0] - ramp.start[0];
      const dy = ramp.end[1] - ramp.start[1];
      const dz = ramp.end[2] - ramp.start[2];
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const midX = (ramp.start[0] + ramp.end[0]) / 2;
      const midY = (ramp.start[1] + ramp.end[1]) / 2;
      const midZ = (ramp.start[2] + ramp.end[2]) / 2;

      const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
      const yaw = Math.atan2(dx, dz);

      const q = new RAPIER.Quaternion(0, 0, 0, 1);
      const halfYaw = yaw / 2;
      const halfPitch = pitch / 2;
      q.y = Math.sin(halfYaw) * Math.cos(halfPitch);
      q.w = Math.cos(halfYaw) * Math.cos(halfPitch);
      q.x = Math.cos(halfYaw) * Math.sin(halfPitch);
      q.z = -Math.sin(halfYaw) * Math.sin(halfPitch);

      const bodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(midX, midY, midZ)
        .setRotation(q);
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.cuboid(
        ramp.width / 2,
        0.4,
        length / 2,
      );
      this.world.createCollider(colliderDesc, body);
    }
  }

  public addCar(
    id: string,
    emoji: string,
    color: string,
    spawnPos: [number, number, number],
  ): CarState {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawnPos[0], spawnPos[1], spawnPos[2])
      .setLinearDamping(0.4)
      .setAngularDamping(1.2);

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      CAR_SPECS.halfWidth,
      CAR_SPECS.halfHeight,
      CAR_SPECS.halfLength,
    )
      .setMass(CAR_SPECS.mass)
      .setFriction(0.6)
      .setRestitution(0.1);

    const collider = this.world.createCollider(colliderDesc, body);

    this.carBodies.set(id, body);
    this.carColliders.set(id, collider);

    const initialWheelOffsets = WHEEL_MOUNTS_LOCAL.map(
      mount =>
        [mount[0], mount[1] - CAR_SPECS.suspensionRestLength, mount[2]] as [
          number,
          number,
          number,
        ],
    );

    const initialState: CarState = {
      id,
      emoji,
      color,
      position: [spawnPos[0], spawnPos[1], spawnPos[2]],
      rotation: [0, 0, 0, 1],
      velocity: [0, 0, 0],
      speedKmH: 0,
      isGrounded: true,
      boostCooldown: 0,
      lastCheckpointIndex: -1,
      checkpointsCompleted: 0,
      lastCheckpointTime: 0,
      score: 0,
      wheelPositions: initialWheelOffsets,
      wheelSuspensionLengths: [
        CAR_SPECS.suspensionRestLength,
        CAR_SPECS.suspensionRestLength,
        CAR_SPECS.suspensionRestLength,
        CAR_SPECS.suspensionRestLength,
      ],
    };

    this.carStates.set(id, initialState);
    this.carInputs.set(id, {
      steering: 0,
      throttle: 0,
      brake: false,
      boost: false,
      sequence: 0,
      timestamp: Date.now(),
    });
    this.carInputReceivedAt.set(id, Date.now());
    this.carInvertedTimers.set(id, 0);
    this.carSpawnPositions.set(id, [...spawnPos]);

    return initialState;
  }

  public removeCar(id: string): void {
    const body = this.carBodies.get(id);
    if (body) {
      this.world.removeRigidBody(body);
      this.carBodies.delete(id);
      this.carColliders.delete(id);
      this.carStates.delete(id);
      this.carInputs.delete(id);
      this.carInputReceivedAt.delete(id);
      this.carInvertedTimers.delete(id);
      this.carSpawnPositions.delete(id);
    }
  }

  public updateCarInput(id: string, input: CarControlInput): void {
    const clampedInput: CarControlInput = {
      steering: Math.max(
        -1,
        Math.min(1, Number.isFinite(input.steering) ? input.steering : 0),
      ),
      throttle: Math.max(
        -1,
        Math.min(1, Number.isFinite(input.throttle) ? input.throttle : 0),
      ),
      brake: Boolean(input.brake),
      boost: Boolean(input.boost),
      sequence: input.sequence || 0,
      timestamp: input.timestamp || Date.now(),
    };
    this.carInputs.set(id, clampedInput);
    this.carInputReceivedAt.set(id, Date.now());
  }

  public hasCar(id: string): boolean {
    return this.carStates.has(id);
  }

  public getCarState(id: string): CarState | undefined {
    return this.carStates.get(id);
  }

  public getCarStates(): Map<string, CarState> {
    return this.carStates;
  }

  public resetRace(): void {
    for (const [id, state] of this.carStates.entries()) {
      state.lastCheckpointIndex = -1;
      state.checkpointsCompleted = 0;
      state.lastCheckpointTime = 0;
      state.score = 0;
      state.boostCooldown = 0;
      this.resetCarToPosition(
        id,
        this.carSpawnPositions.get(id) ?? [0, 4.5, 20],
      );
    }
  }

  public step(
    dt: number,
    checkpoints: CheckpointLocation[],
  ): Map<string, CarState> {
    if (!this.initialized) return this.carStates;

    const fixedDt = 1 / 60;
    this.accumulator += Math.min(dt, 0.1);

    while (this.accumulator >= fixedDt) {
      this.stepPhysicsSubstep(fixedDt, checkpoints);
      this.accumulator -= fixedDt;
    }

    return this.carStates;
  }

  private stepPhysicsSubstep(
    dt: number,
    checkpoints: CheckpointLocation[],
  ): void {
    const now = Date.now();

    for (const [id, body] of this.carBodies.entries()) {
      const carCollider = this.carColliders.get(id);
      const input = this.carInputs.get(id) || {
        steering: 0,
        throttle: 0,
        brake: false,
        boost: false,
        sequence: 0,
        timestamp: now,
      };
      const state = this.carStates.get(id)!;

      const receivedAt = this.carInputReceivedAt.get(id) ?? 0;
      const isStale = now - receivedAt > CAR_SPECS.inputTimeoutMs;
      const activeThrottle = isStale ? 0 : input.throttle;
      const activeSteering = isStale ? 0 : input.steering;
      const activeBrake = isStale ? false : input.brake;
      const activeBoost = isStale ? false : input.boost;

      const pos = body.translation();
      const rot = body.rotation();
      const linvel = body.linvel();

      if (
        pos.y < -10 ||
        pos.x < MAP_WORLD_BOUNDS.minX - 80 ||
        pos.x > MAP_WORLD_BOUNDS.maxX + 80 ||
        pos.z < MAP_WORLD_BOUNDS.minZ - 80 ||
        pos.z > MAP_WORLD_BOUNDS.maxZ + 80
      ) {
        this.resetCarToCheckpoint(id, checkpoints, state.lastCheckpointIndex);
        continue;
      }

      // Check if inverted
      const upY = 1 - 2 * (rot.x * rot.x + rot.z * rot.z);
      if (upY < 0.2) {
        const invTime = (this.carInvertedTimers.get(id) || 0) + dt;
        this.carInvertedTimers.set(id, invTime);
        if (invTime > 2.0) {
          this.resetCarToCheckpoint(id, checkpoints, state.lastCheckpointIndex);
          this.carInvertedTimers.set(id, 0);
          continue;
        }
      } else {
        this.carInvertedTimers.set(id, 0);
      }

      // 4 Wheel Raycast Suspension Calculation
      let groundedWheelsCount = 0;
      const currentWheelPositions: [number, number, number][] = [];
      const currentSuspensionLengths: number[] = [];
      const suspensionDown = rotateVectorByQuaternion([0, -1, 0], rot);
      const suspensionUp = suspensionDown.map(value => -value) as [
        number,
        number,
        number,
      ];
      const suspensionRayLength =
        CAR_SPECS.suspensionRestLength + CAR_SPECS.wheelRadius;

      for (let i = 0; i < 4; i++) {
        const mountLocal = WHEEL_MOUNTS_LOCAL[i]!;
        const worldMountOffset = rotateVectorByQuaternion(mountLocal, rot);
        const rayOrigin = {
          x: pos.x + worldMountOffset[0],
          y: pos.y + worldMountOffset[1],
          z: pos.z + worldMountOffset[2],
        };
        const rayDir = {
          x: suspensionDown[0],
          y: suspensionDown[1],
          z: suspensionDown[2],
        };
        const ray = new RAPIER.Ray(rayOrigin, rayDir);

        // Raycast excluding own car collider
        const hit = this.world.castRayAndGetNormal(
          ray,
          suspensionRayLength,
          true,
          undefined,
          undefined,
          carCollider,
        );

        if (
          hit &&
          hit.timeOfImpact > 0.05 &&
          hit.timeOfImpact <= suspensionRayLength
        ) {
          groundedWheelsCount++;
          const hitDist = hit.timeOfImpact;
          const suspensionLength = Math.max(
            0,
            Math.min(
              CAR_SPECS.suspensionRestLength,
              hitDist - CAR_SPECS.wheelRadius,
            ),
          );
          const compression = CAR_SPECS.suspensionRestLength - suspensionLength;
          const springForce = CAR_SPECS.suspensionStiffness * compression;
          const mountVelocity = body.velocityAtPoint(rayOrigin);
          const velocityAlongUp =
            mountVelocity.x * suspensionUp[0] +
            mountVelocity.y * suspensionUp[1] +
            mountVelocity.z * suspensionUp[2];
          const dampingForce = CAR_SPECS.suspensionDamping * velocityAlongUp;
          const totalSuspensionForce = Math.max(0, springForce - dampingForce);

          body.applyImpulseAtPoint(
            {
              x: suspensionUp[0] * totalSuspensionForce * dt,
              y: suspensionUp[1] * totalSuspensionForce * dt,
              z: suspensionUp[2] * totalSuspensionForce * dt,
            },
            rayOrigin,
            true,
          );
          currentSuspensionLengths.push(suspensionLength);
          currentWheelPositions.push([
            mountLocal[0],
            mountLocal[1] - suspensionLength,
            mountLocal[2],
          ]);
        } else {
          currentSuspensionLengths.push(CAR_SPECS.suspensionRestLength);
          currentWheelPositions.push([
            mountLocal[0],
            mountLocal[1] - CAR_SPECS.suspensionRestLength,
            mountLocal[2],
          ]);
        }
      }

      state.isGrounded = groundedWheelsCount >= 2;
      state.wheelPositions = currentWheelPositions;
      state.wheelSuspensionLengths = currentSuspensionLengths;

      // Orientation vectors
      const forwardX = 2 * (rot.x * rot.z + rot.w * rot.y);
      const forwardZ = 1 - 2 * (rot.x * rot.x + rot.y * rot.y);
      const rightX = 1 - 2 * (rot.y * rot.y + rot.z * rot.z);
      const rightZ = 2 * (rot.x * rot.y - rot.w * rot.z);

      // Steering Torque
      if (Math.abs(activeSteering) > 0.05) {
        body.applyTorqueImpulse({x: 0, y: -activeSteering * 750, z: 0}, true);
      }

      // Engine Acceleration
      if (activeThrottle !== 0) {
        const force =
          activeThrottle *
          CAR_SPECS.engineForce *
          (state.isGrounded ? 1.0 : 0.2);
        body.applyImpulse(
          {x: forwardX * force * dt, y: 0, z: forwardZ * force * dt},
          true,
        );
      }

      // Braking
      if (activeBrake) {
        body.setLinearDamping(2.5);
      } else {
        body.setLinearDamping(0.4);
      }

      // Tire Lateral Friction damping
      const lateralVel = linvel.x * rightX + linvel.z * rightZ;
      const lateralGrip = Math.min(1, 8 * dt) * body.mass();
      body.applyImpulse(
        {
          x: -lateralVel * rightX * lateralGrip,
          y: 0,
          z: -lateralVel * rightZ * lateralGrip,
        },
        true,
      );

      // Boost handling
      if (state.boostCooldown > 0) {
        state.boostCooldown = Math.max(0, state.boostCooldown - dt);
      }

      if (activeBoost && state.boostCooldown === 0) {
        state.boostCooldown = CAR_SPECS.boostCooldownTime;
        body.applyImpulse(
          {
            x: forwardX * CAR_SPECS.boostImpulseForward,
            y: CAR_SPECS.boostImpulseUp,
            z: forwardZ * CAR_SPECS.boostImpulseForward,
          },
          true,
        );
      }

      // Clamp vertical velocity to prevent launch into orbit
      if (linvel.y > 20.0) {
        body.setLinvel({x: linvel.x, y: 20.0, z: linvel.z}, true);
      }

      const speed = Math.sqrt(
        linvel.x * linvel.x + linvel.y * linvel.y + linvel.z * linvel.z,
      );
      state.speedKmH = Math.round(speed * 3.6);

      state.position = [pos.x, pos.y, pos.z];
      state.rotation = [rot.x, rot.y, rot.z, rot.w];
      state.velocity = [linvel.x, linvel.y, linvel.z];

      this.evaluateCheckpoints(state, checkpoints);
    }

    this.world.step();
  }

  private evaluateCheckpoints(
    state: CarState,
    checkpoints: CheckpointLocation[],
  ): void {
    if (!checkpoints || checkpoints.length === 0) return;

    const nextIndex = state.lastCheckpointIndex + 1;
    if (nextIndex >= checkpoints.length) return;

    const target = checkpoints[nextIndex];
    if (!target) return;

    const dx = state.position[0] - target.position[0];
    const dy = state.position[1] - target.position[1];
    const dz = state.position[2] - target.position[2];
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq <= target.radius * target.radius) {
      state.lastCheckpointIndex = nextIndex;
      state.checkpointsCompleted = nextIndex + 1;
      state.lastCheckpointTime = Date.now();
      state.score =
        state.checkpointsCompleted * 1000 -
        Math.floor(state.lastCheckpointTime / 1000);
    }
  }

  public resetCarToCheckpoint(
    id: string,
    checkpoints: CheckpointLocation[],
    index: number,
  ): void {
    const body = this.carBodies.get(id);
    const state = this.carStates.get(id);
    if (!body || !state) return;

    let resetPos: [number, number, number] = [0, 4.5, 20];
    if (index >= 0 && index < checkpoints.length) {
      const cp = checkpoints[index];
      if (cp) {
        resetPos = [cp.position[0], cp.position[1] + 4.5, cp.position[2]];
      }
    }

    this.resetCarToPosition(id, resetPos);
  }

  private resetCarToPosition(
    id: string,
    resetPos: [number, number, number],
  ): void {
    const body = this.carBodies.get(id);
    const state = this.carStates.get(id);
    if (!body || !state) return;

    body.setTranslation({x: resetPos[0], y: resetPos[1], z: resetPos[2]}, true);
    body.setLinvel({x: 0, y: 0, z: 0}, true);
    body.setAngvel({x: 0, y: 0, z: 0}, true);
    body.setRotation({x: 0, y: 0, z: 0, w: 1}, true);

    state.position = resetPos;
    state.velocity = [0, 0, 0];
    state.rotation = [0, 0, 0, 1];
    state.isGrounded = false;
    this.carInputReceivedAt.set(id, Date.now());
  }
}
