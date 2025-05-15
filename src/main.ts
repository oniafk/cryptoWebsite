import * as THREE from "three";
import {
  getBody,
  getMouseBall,
  getCenterSphere,
  PhysicsBody,
} from "./getBodies";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import getLayer from "./getLayer";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";

// Configuration object
const config = {
  numBodies: 20,
  mouseInfluence: 3.0, // Size multiplier for mouse physics ball
  mouseStrength: 12.0, // Strength of mouse interaction
  gravityStrength: 10, // Strength of the pull toward the center
  regenerateBodies: () => regenerateBodies(),
};

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
// scene.backgroundBlurriness = 0.1;
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 13;
const canvas = document.getElementById("spheres") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Set up PMREM generator for HDR environment map
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Load HDR environment map
const hdrPath = "./HDR/studio_small_08_2k.exr";
new EXRLoader().setDataType(THREE.HalfFloatType).load(hdrPath, (exrTexture) => {
  const envMap = pmremGenerator.fromEquirectangular(exrTexture).texture;
  scene.environment = envMap;

  // Update materials to reflect environment
  scene.traverse((child) => {
    if (
      child instanceof THREE.Mesh &&
      child.material instanceof THREE.MeshStandardMaterial
    ) {
      child.material.envMap = envMap;
      child.material.envMapIntensity = 0.3;
      child.material.needsUpdate = true;
    }
  });

  exrTexture.dispose();
  pmremGenerator.dispose();
});

const light1 = new THREE.SpotLight(undefined, Math.PI * 100);
light1.position.set(2.5, 6, 6);
light1.intensity = 500;
light1.angle = Math.PI / 3;
light1.penumbra = 0.5;
light1.castShadow = true;
light1.shadow.blurSamples = 15;
light1.shadow.radius = 5;
scene.add(light1);
// const lightHelper1 = new THREE.SpotLightHelper(light1, 0x00ff00);
// scene.add(lightHelper1);

const light2 = light1.clone();
light2.position.set(-2.5, 6, 6);
scene.add(light2);

const light3 = light1.clone();
light3.position.set(0, -8, 0);
scene.add(light3);

// const lightHelper2 = new THREE.SpotLightHelper(light2, 0x00ff00);
// scene.add(lightHelper2);

// const lightHelper3 = new THREE.SpotLightHelper(light3, 0x00ff00);
// scene.add(lightHelper3);

// Add directional light for enhanced metallic reflections
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.bias = -0.0001;
scene.add(directionalLight);

const ctrls = new OrbitControls(camera, renderer.domElement);
ctrls.enableDamping = true;

await RAPIER.init();
const gravity = { x: 0.0, y: 0, z: 0.0 };
const world = new RAPIER.World(gravity);

// Initialize the center sphere with physics
const centerSphere = getCenterSphere(RAPIER, world);
scene.add(centerSphere.mesh);

const numBodies = config.numBodies;
const bodies: PhysicsBody[] = [];
for (let i = 0; i < numBodies; i++) {
  const body = getBody(RAPIER, world);
  bodies.push(body);
  scene.add(body.mesh);
}

const mouseBall = getMouseBall(RAPIER, world);
scene.add(mouseBall.mesh);

const hemiLight = new THREE.HemisphereLight(0x00bbff, 0xaa00ff);
hemiLight.intensity = 0.5;
scene.add(hemiLight);

// Sprites BG
const gradientBackground = getLayer({
  hue: 0.6,
  numSprites: 8,
  opacity: 0.2,
  radius: 10,
  size: 24,
  z: -10.5,
});
scene.add(gradientBackground);

const pointsGeo = new THREE.BufferGeometry();
const pointsMat = new THREE.PointsMaterial({
  size: 0.035,
  vertexColors: true,
});
const points = new THREE.Points(pointsGeo, pointsMat);
scene.add(points);

// Comment out or remove the unused function
// function renderDebugView() {
//   const { vertices, colors } = world.debugRender();
//   pointsGeo.setAttribute(
//     "position",
//     new THREE.Float32BufferAttribute(vertices, 3)
//   );
//   pointsGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
// }

// Mouse Interactivity
const raycaster = new THREE.Raycaster();
const pointerPos = new THREE.Vector2(0, 0);
const mousePos = new THREE.Vector3(10, 10, 0); // Initial position
let hasMouseMoved = false; // Flag to track if mouse has moved yet

const mousePlaneGeo = new THREE.PlaneGeometry(48, 48, 48, 48);
const mousePlaneMat = new THREE.MeshBasicMaterial({
  wireframe: true,
  color: 0x00ff00,
  transparent: true,
  opacity: 0.0,
});
const mousePlane = new THREE.Mesh(mousePlaneGeo, mousePlaneMat);
mousePlane.position.set(0, 0, 0.2);
scene.add(mousePlane);

window.addEventListener("mousemove", (evt) => {
  hasMouseMoved = true;
  pointerPos.set(
    (evt.clientX / window.innerWidth) * 2 - 1,
    -(evt.clientY / window.innerHeight) * 2 + 1
  );
});

let cameraDirection = new THREE.Vector3();
function handleRaycast() {
  // Only perform raycasting if the mouse has moved
  if (hasMouseMoved) {
    // orient the mouse plane to the camera
    camera.getWorldDirection(cameraDirection);
    cameraDirection.multiplyScalar(-1);
    mousePlane.lookAt(cameraDirection);

    raycaster.setFromCamera(pointerPos, camera);
    const intersects = raycaster.intersectObjects([mousePlane], false);
    if (intersects.length > 0) {
      mousePos.copy(intersects[0].point);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  world.step();
  handleRaycast();

  // Only update the mouseBall position after mouse movement has occurred
  // This preserves the initial position until the user moves the mouse
  if (hasMouseMoved) {
    mouseBall.update(mousePos);
  }

  ctrls.update();
  bodies.forEach((b) => b.update(config.gravityStrength));
  renderer.render(scene, camera); // Use renderer instead of composer
}

animate();

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", handleWindowResize, false);

// Add this after the handleWindowResize function
function regenerateBodies() {
  // Remove existing bodies from scene and physics world
  bodies.forEach((body) => {
    scene.remove(body.mesh);
    world.removeRigidBody(body.rigid);
  });

  // Clear the bodies array
  bodies.length = 0;

  // Create new bodies based on the current config
  for (let i = 0; i < config.numBodies; i++) {
    const body = getBody(RAPIER, world);
    bodies.push(body);
    scene.add(body.mesh);
  }
}

// Setup the GUI
// const gui = new GUI();
// gui
//   .add(config, "numBodies", 10, 500)
//   .step(10)
//   .name("Number of Objects")
//   .onChange(regenerateBodies);
// gui
//   .add(config, "mouseInfluence", 1, 10)
//   .step(0.5)
//   .name("Mouse Influence Size")
//   .onChange(updateMouseInfluence);
// gui.add(config, "mouseStrength", 1, 20).step(1).name("Mouse Force Strength");
// gui
//   .add(config, "gravityStrength", 0.1, 3.0)
//   .step(0.1)
//   .name("Center Gravity Strength");
// gui.add(config, "regenerateBodies").name("Regenerate Objects");
