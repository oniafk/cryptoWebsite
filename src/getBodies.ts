import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";

// Define interface for physics body objects
export interface PhysicsBody {
  mesh: THREE.Mesh;
  rigid: RAPIER.RigidBody;
  update: (gravityStrength?: number) => void;
}

export interface MouseBall {
  mesh: THREE.Mesh;
  rigid: RAPIER.RigidBody;
  update: (mousePos: THREE.Vector3) => void;
}

// Update interface for the static central sphere to include rigid body
export interface CenterSphere {
  mesh: THREE.Mesh;
  rigid: RAPIER.RigidBody;
  update: () => void;
}

const sceneMiddle = new THREE.Vector3(0, 0, 0);
const colorPallete = [0x177e89, 0x4e99ce];

// Replace all geometry types with spheres of different sizes
const sphereSizes = [0.6, 0.8, 1.0];
const geometries: THREE.BufferGeometry[] = sphereSizes.map(
  (size) => new THREE.SphereGeometry(size, 32, 32)
);

function getGeometry(size: number): THREE.BufferGeometry {
  const randomGeo = geometries[Math.floor(Math.random() * geometries.length)];
  const geo = randomGeo.clone();
  // Use the size parameter for additional scaling
  const randomScale = 0.6 + size * 0.8; // Scale based on size parameter
  geo.scale(randomScale, randomScale, randomScale);
  return geo;
}

function getBody(
  RAPIER: typeof import("@dimforge/rapier3d-compat"),
  world: RAPIER.World
): PhysicsBody {
  const size = 0.5; // 0.1 + Math.random() * 0.25;
  const range = 15;
  const density = size * 1.0;
  let x = Math.random() * range - range * 0.5;
  let y = Math.random() * range - range * 0.5 + 3;
  let z = Math.random() * range - range * 0.5;

  let color = colorPallete[Math.floor(Math.random() * colorPallete.length)];
  const geometry = getGeometry(size);
  const prob = Math.random();

  // Replace MeshPhysicalMaterial with MeshStandardMaterial for metal effect
  const options =
    prob < 0.33
      ? {
          color,
          metalness: 1.0, // full metal
          roughness: 0.2, // adjust for how shiny vs. matte
          clearcoatRoughness: 0.1,
          envMapIntensity: 0.5,
        }
      : prob < 0.66
      ? {
          color,
          metalness: 1.0, // full metal
          roughness: 0.2, // adjust for how shiny vs. matte
          clearcoatRoughness: 0.1,
          envMapIntensity: 0.5,
        }
      : {
          color,
          metalness: 1.0, // full metal
          roughness: 0.2, // adjust for how shiny vs. matte
          envMapIntensity: 0.5,
          emissive: color,
          emissiveIntensity: 0.2,
        };
  const material = new THREE.MeshStandardMaterial(options);
  const mesh = new THREE.Mesh(geometry, material);

  // physics
  let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z);
  // .setLinearDamping(1)
  // .setAngularDamping(1);
  let rigid = world.createRigidBody(rigidBodyDesc);

  // Ensure points is a Float32Array for the convexHull function
  const positionAttribute = geometry.attributes.position;
  if (positionAttribute) {
    // Convert to Float32Array if needed
    const points = new Float32Array(positionAttribute.array);
    let colliderDesc =
      RAPIER.ColliderDesc.convexHull(points)?.setDensity(density);
    if (colliderDesc) {
      world.createCollider(colliderDesc, rigid);
    }
  }

  function update(gravityStrength: number = DEFAULT_GRAVITY_STRENGTH) {
    rigid.resetForces(true);
    let { x, y, z } = rigid.translation();
    let pos = new THREE.Vector3(x, y, z);
    let dir = pos.clone().sub(sceneMiddle).normalize();
    let q = rigid.rotation();
    let rote = new THREE.Quaternion(q.x, q.y, q.z, q.w);
    mesh.rotation.setFromQuaternion(rote);
    rigid.addForce(dir.multiplyScalar(-gravityStrength), true);
    mesh.position.set(x, y, z);
  }
  return { mesh, rigid, update };
}

function getMouseBall(
  RAPIER: typeof import("@dimforge/rapier3d-compat"),
  world: RAPIER.World
): MouseBall {
  const mouseSize = 2.3;
  const geometry = new THREE.IcosahedronGeometry(mouseSize, 8);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
  });
  const mouseMesh = new THREE.Mesh(geometry, material);

  // Set initial mesh position
  mouseMesh.position.set(15, 15, 0);

  // RIGID BODY with initial position at (10, 10, 0)
  let bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
    10,
    10,
    0
  );
  let mouseRigid = world.createRigidBody(bodyDesc);
  let dynamicCollider = RAPIER.ColliderDesc.ball(mouseSize * 2);
  world.createCollider(dynamicCollider, mouseRigid);

  function update(mousePos: THREE.Vector3) {
    mouseRigid.setTranslation(
      { x: mousePos.x, y: mousePos.y, z: mousePos.z },
      true
    );
    let { x, y, z } = mouseRigid.translation();
    mouseMesh.position.set(x, y, z);
  }
  return { mesh: mouseMesh, rigid: mouseRigid, update };
}

function getCenterSphere(
  RAPIER: typeof import("@dimforge/rapier3d-compat"),
  world: RAPIER.World
): CenterSphere {
  // Create a black sphere in the middle of the scene
  const sphereSize = 2.2; // Larger size for the central sphere
  const geometry = new THREE.SphereGeometry(sphereSize, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0x000000, // Black color
    roughness: 0.2,
    metalness: 1,
    envMapIntensity: 0.3,
    aoMapIntensity: 0.5,
  });
  const mesh = new THREE.Mesh(geometry, material);

  // Position at scene middle
  mesh.position.copy(sceneMiddle);

  // Create a fixed (static) rigid body that won't move
  let rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
    sceneMiddle.x,
    sceneMiddle.y,
    sceneMiddle.z
  );
  let rigid = world.createRigidBody(rigidBodyDesc);

  // Add a sphere collider so other objects can interact with it
  let colliderDesc = RAPIER.ColliderDesc.ball(sphereSize);
  world.createCollider(colliderDesc, rigid);

  // Update function for consistency with other bodies
  function update() {
    // No update needed since it's a static body, but function is required by interface
    // This ensures the mesh position always matches the rigid body position
    let { x, y, z } = rigid.translation();
    mesh.position.set(x, y, z);
  }

  return { mesh, rigid, update };
}

const DEFAULT_GRAVITY_STRENGTH = 0.5;

export { getBody, getMouseBall, getCenterSphere };
