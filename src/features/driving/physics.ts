import RAPIER from '@dimforge/rapier3d-compat';
import type { Vector } from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { barriers, onRoad, track } from './track';
import type { DriveGear, Telemetry } from '../../stores/driving-store';
let initialized: Promise<void> | undefined;
export const initializePhysics = () => initialized ??= RAPIER.init();
export interface WheelSpec { x: number; y: number; z: number; radius: number; front: boolean }
export interface DriverCommand { throttle: number; brake: number; steer: number; engine: boolean; direction: DriveGear }
export const bodyHeight = 0.6, restLength = 0.24, fixedStep = 1 / 120;
export function createDrivingPhysics(wheels: readonly WheelSpec[]) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }); world.timestep = fixedStep;
  world.createCollider(RAPIER.ColliderDesc.cuboid(track.ground, 0.2, track.ground).setTranslation(0, -0.2, 0).setFriction(0.9));
  for (const barrier of barriers) world.createCollider(RAPIER.ColliderDesc.cuboid(0.28, 0.5, barrier.length / 2).setTranslation(barrier.x, 0.5, barrier.z).setRotation({ x: 0, y: Math.sin(barrier.yaw / 2), z: 0, w: Math.cos(barrier.yaw / 2) }).setFriction(0.3).setRestitution(0.08));
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(track.spawn.x, track.spawn.y, track.spawn.z).setLinearDamping(0.08).setAngularDamping(1.6).setCanSleep(false).setCcdEnabled(true));
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.88, 0.28, 2.05).setTranslation(0, 0.12, 0).setMass(1350).setFriction(0.3).setRestitution(0.04), body);
  const vehicle = world.createVehicleController(body); vehicle.indexUpAxis = 1; vehicle.setIndexForwardAxis = 2;
  wheels.forEach((wheel, i) => {
    vehicle.addWheel({ x: wheel.x, y: wheel.y - bodyHeight + restLength, z: wheel.z }, { x: 0, y: -1, z: 0 }, { x: 1, y: 0, z: 0 }, restLength, wheel.radius);
    vehicle.setWheelSuspensionStiffness(i, 48); vehicle.setWheelSuspensionCompression(i, 4.4); vehicle.setWheelSuspensionRelaxation(i, 5.2);
    vehicle.setWheelMaxSuspensionTravel(i, 0.16); vehicle.setWheelMaxSuspensionForce(i, 18000); vehicle.setWheelFrictionSlip(i, 2.2); vehicle.setWheelSideFrictionStiffness(i, 1);
  });
  // Populate the query pipeline before the first suspension ray cast.
  world.step();
  const q = new Quaternion(), forward = new Vector3(), velocity = new Vector3();
  let accumulator = 0, steering = 0, distance = 0, gear = 1, shiftRemaining = 0, rpm = 0, braking = true, offRoad = false, disposed = false;
  const speed = () => { const rotation = body.rotation(); q.set(rotation.x, rotation.y, rotation.z, rotation.w); forward.set(0, 0, -1).applyQuaternion(q); const v = body.linvel(); return velocity.set(v.x, v.y, v.z).dot(forward); };
  function step(command: DriverCommand) {
    const v = speed(), position = body.translation(); offRoad = !onRoad(position.x, position.z);
    steering += (command.steer * (0.48 / (1 + Math.abs(v) * 0.055)) - steering) * (1 - Math.exp(-fixedStep * 7));
    const previousGear = gear;
    if (command.direction === 'R') gear = -1;
    else {
      if (gear < 1) gear = 1;
      if (gear < 4 && Math.abs(v) > [0, 10, 18, 22][gear]) gear++;
      else if (gear > 1 && Math.abs(v) < [0, 0, 8, 15, 20][gear]) gear--;
    }
    if (gear !== previousGear) shiftRemaining = .16;
    shiftRemaining = Math.max(0, shiftRemaining - fixedStep);
    rpm = command.engine ? Math.min(7600, 900 + Math.abs(v) * 410 / Math.max(1, Math.abs(gear)) + command.throttle * 850) : 0;
    const opposite = command.direction === 'D' ? v < -0.5 : v > 0.5;
    const parking = !command.engine && Math.abs(v) < .5;
    braking = command.brake > 0 || parking || opposite;
    const maxSpeed = command.direction === 'R' ? 7 : 28;
    const force = command.engine && !opposite && !command.brake && shiftRemaining === 0 ? command.throttle * 4100 * (command.direction === 'R' ? -1 : 1) * Math.max(0, 1 - Math.abs(v) / maxSpeed) * (offRoad ? 0.45 : 1) / (1 + .1 * Math.max(0, gear - 1)) : 0;
    body.resetForces(true);
    const drag = (offRoad ? 350 : 25) + (offRoad ? 1.5 : .6) * Math.abs(v);
    body.addForce({ x: -forward.x * v * drag, y: -(Math.abs(v) ** 2) * 2, z: -forward.z * v * drag }, true);
    wheels.forEach((wheel, i) => {
      vehicle.setWheelSteering(i, wheel.front ? steering : 0);
      vehicle.setWheelEngineForce(i, wheel.front ? 0 : force);
      vehicle.setWheelBrake(i, braking ? 120 * Math.max(command.brake, parking || opposite ? 0.65 : 0) : 0.4);
      vehicle.setWheelFrictionSlip(i, offRoad ? 1.2 : 2.2);
    });
    vehicle.updateVehicle(fixedStep, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, collider => collider.parent()?.handle !== body.handle);
    world.step(); distance += Math.abs(speed()) * fixedStep;
  }
  return {
    world, body, vehicle, wheels,
    advance(delta: number, command: DriverCommand) {
      if (disposed || !Number.isFinite(delta) || delta <= 0) return;
      // Bound catch-up work after a stalled/background frame, keeping the integration step fixed.
      accumulator += Math.min(delta, 0.1); let count = 0;
      while (accumulator >= fixedStep && count++ < 12) { step(command); accumulator -= fixedStep; }
    },
    telemetry(): Telemetry { return { speed: speed(), rpm, gear: rpm ? gear : 0, distance, contacts: wheels.filter((_, i) => vehicle.wheelIsInContact(i)).length, braking, offRoad }; },
    resolveCamera(desired: Vector3, target: Vector3) {
      const direction = desired.clone().sub(target), distance = direction.length(); direction.normalize();
      const ray = new RAPIER.Ray(target, direction);
      const hit = world.castRay(ray, distance, true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, body);
      if (hit) desired.copy(target).addScaledVector(direction, Math.max(0.5, hit.timeOfImpact - 0.3));
      return desired;
    },
    reset() { body.setTranslation(track.spawn, true); body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true); body.setLinvel({ x: 0, y: 0, z: 0 }, true); body.setAngvel({ x: 0, y: 0, z: 0 }, true); body.resetForces(true); body.resetTorques(true); accumulator = 0; steering = 0; distance = 0; rpm = 0; gear = 1; shiftRemaining = 0; },
    dispose() { if (!disposed) { disposed = true; world.free(); } },
  };
}
export type DrivingPhysics = ReturnType<typeof createDrivingPhysics>;
export function vectorTuple(vector: Vector): [number, number, number] { return [vector.x, vector.y, vector.z]; }
