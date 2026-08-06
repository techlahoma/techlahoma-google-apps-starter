import RAPIER from '@dimforge/rapier3d-compat';
import {
  DOWNTOWN_BUILDINGS,
  ROOFTOP_RAMPS,
  type CheckpointLocation,
} from '../data/tulsa-map';

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
  mass: 1200,
  engineForce: 35000,
  brakeForce: 45000,
  steerAngleMax: 0.52,
  suspensionRestLength: 1.2,
  suspensionStiffness: 45000,
  suspensionDamping: 3500,
  boostImpulseUp: 18000,
  boostImpulseForward: 28000,
  boostCooldownTime: 3.5,
};

export class PhysicsEngine {
  public world!: RAPIER.World;
  private initialized = false;
  private carBodies: Map<string, RAPIER.RigidBody> = new Map();
  private carColliders: Map<string, RAPIER.Collider> = new Map();
  private carStates: Map<string, CarState> = new Map();
  private carInputs: Map<string, CarControlInput> = new Map();

  public async init(): Promise<void> {
    if (this.initialized) return;
    await RAPIER.init();

    const gravity = {x: 0.0, y: -11.8, z: 0.0};
    this.world = new RAPIER.World(gravity);

    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      0,
      -0.5,
      0,
    );
    const groundBody = this.world.createRigidBody(groundBodyDesc);
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(300, 0.5, 300);
    this.world.createCollider(groundColliderDesc, groundBody);

    this.buildMapColliders();

    this.initialized = true;
  }

  private buildMapColliders(): void {
    for (const bldg of DOWNTOWN_BUILDINGS) {
      const halfX = bldg.size[0] / 2;
      const halfZ = bldg.size[1] / 2;
      const halfY = bldg.height / 2;
      const posX = bldg.center[0];
      const posZ = bldg.center[1];
      const posY = halfY;

      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
        posX,
        posY,
        posZ,
      );
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ);
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
      .setAngularDamping(1.2)
      .setAdditionalMass(CAR_SPECS.mass);

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      CAR_SPECS.halfWidth,
      CAR_SPECS.halfHeight,
      CAR_SPECS.halfLength,
    )
      .setFriction(0.6)
      .setRestitution(0.1);

    const collider = this.world.createCollider(colliderDesc, body);

    this.carBodies.set(id, body);
    this.carColliders.set(id, collider);

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
      wheelPositions: [
        [
          -CAR_SPECS.halfWidth,
          -CAR_SPECS.halfHeight,
          CAR_SPECS.halfLength * 0.7,
        ],
        [
          CAR_SPECS.halfWidth,
          -CAR_SPECS.halfHeight,
          CAR_SPECS.halfLength * 0.7,
        ],
        [
          -CAR_SPECS.halfWidth,
          -CAR_SPECS.halfHeight,
          -CAR_SPECS.halfLength * 0.7,
        ],
        [
          CAR_SPECS.halfWidth,
          -CAR_SPECS.halfHeight,
          -CAR_SPECS.halfLength * 0.7,
        ],
      ],
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
  }

  public step(
    dt: number,
    checkpoints: CheckpointLocation[],
  ): Map<string, CarState> {
    if (!this.initialized) return this.carStates;

    const now = Date.now();

    for (const [id, body] of this.carBodies.entries()) {
      const input = this.carInputs.get(id) || {
        steering: 0,
        throttle: 0,
        brake: false,
        boost: false,
        sequence: 0,
        timestamp: now,
      };
      const state = this.carStates.get(id)!;

      const isStale = now - input.timestamp > 500;
      const activeThrottle = isStale ? 0 : input.throttle;
      const activeSteering = isStale ? 0 : input.steering;
      const activeBrake = isStale ? false : input.brake;
      const activeBoost = isStale ? false : input.boost;

      const pos = body.translation();
      const rot = body.rotation();
      const linvel = body.linvel();

      if (pos.y < -15) {
        this.resetCarToCheckpoint(id, checkpoints, state.lastCheckpointIndex);
        continue;
      }

      const isGrounded =
        pos.y <= 1.5 || (pos.y > 8.0 && Math.abs(linvel.y) < 1.5);
      state.isGrounded = isGrounded;

      const forwardX = 2 * (rot.x * rot.z + rot.w * rot.y);
      const forwardZ = 1 - 2 * (rot.x * rot.x + rot.y * rot.y);

      const rightX = 1 - 2 * (rot.y * rot.y + rot.z * rot.z);
      const rightZ = 2 * (rot.x * rot.y - rot.w * rot.z);

      if (Math.abs(activeSteering) > 0.05) {
        body.applyTorqueImpulse({x: 0, y: -activeSteering * 450, z: 0}, true);
      }

      if (activeThrottle !== 0) {
        const force =
          activeThrottle * CAR_SPECS.engineForce * (isGrounded ? 1.0 : 0.2);
        body.applyImpulse(
          {x: forwardX * force * dt, y: 0, z: forwardZ * force * dt},
          true,
        );
      }

      if (activeBrake) {
        body.setLinearDamping(2.5);
      } else {
        body.setLinearDamping(0.4);
      }

      const lateralVel = linvel.x * rightX + linvel.z * rightZ;
      body.applyImpulse(
        {x: -lateralVel * rightX * 12.0, y: 0, z: -lateralVel * rightZ * 12.0},
        true,
      );

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
    return this.carStates;
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

    let resetPos: [number, number, number] = [0, 2.5, 20];
    if (index >= 0 && index < checkpoints.length) {
      const cp = checkpoints[index];
      if (cp) {
        resetPos = [cp.position[0], cp.position[1] + 2.0, cp.position[2]];
      }
    }

    body.setTranslation({x: resetPos[0], y: resetPos[1], z: resetPos[2]}, true);
    body.setLinvel({x: 0, y: 0, z: 0}, true);
    body.setAngvel({x: 0, y: 0, z: 0}, true);
    body.setRotation({x: 0, y: 0, z: 0, w: 1}, true);

    state.position = resetPos;
    state.velocity = [0, 0, 0];
    state.rotation = [0, 0, 0, 1];
  }
}
