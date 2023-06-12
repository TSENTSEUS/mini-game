import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'


/**
 * Debug
 */
let tower;
let towerElements = []
let defaultMaterial = null;
let lastCallTime = performance.now()
const objects = [];
const objectsToUpdate = [];
const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
};
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let burger;


/*
    TextureLoader
 */
const gltfLoader = new GLTFLoader()


gltfLoader.load('/hamburger.glb', (gltf) => {
    burger = gltf.scene
    burger.scale.set(.07, .07, .07);

})

/**
 * Physics
 */
const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)
world.allowSleep = true
world.broadphase = new CANNON.SAPBroadphase(world)
// Default material
defaultMaterial = new CANNON.Material('default')
const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    {
        friction: 1000,
        restitution: .2
    }
)
world.addContactMaterial(defaultContactMaterial)
world.defaultContactMaterial = defaultContactMaterial


/*
    Player collision
 */

const radius = 1.2;
const sphereShape = new CANNON.Sphere(radius)
const sphereBody = new CANNON.Body({ mass: 2, material: defaultMaterial })
sphereBody.addShape(sphereShape);
world.addBody(sphereBody)


/*
  Controls
 */
const onKeyDown = function (event) {
    switch (event.code) {
        case 'KeyW':
            movement.forward = true;
            break
        case 'KeyA':
            movement.left = true;
            break
        case 'KeyS':
            movement.backward = true;
            break
        case 'KeyD':
            movement.right = true;
            break
        case 'Space':
            if (movement.jump === true) velocity.y += 150
            movement.jump = false
            break
    }
};
const onKeyUp = function ( event ) {
    switch ( event.code ) {
        case 'KeyW':
            movement.forward = false;
            break
        case 'KeyA':
            movement.left = false;
            break
        case 'KeyS':
            movement.backward = false;
            break
        case 'KeyD':
            movement.right = false;
            break
    }

};
document.addEventListener( 'keydown', onKeyDown );
document.addEventListener( 'keyup', onKeyUp );

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Floor
const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body({
    mass: 0,
    material: defaultMaterial,
    shape: floorShape
})
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(- 1, 0, 0), Math.PI * 0.5)
world.addBody(floorBody)


// Material
const material = new THREE.MeshStandardMaterial();

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({
        color: '#777777',
    })
)
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

floor.receiveShadow = true; // Для пола
/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 30
directionalLight.position.set(15, 12, 4)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
window.addEventListener('click', () =>
{
    controls.isLocked === true && shootHandler();
})
window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 3, 1, 3)
scene.add(camera)

// Controls
const controls = new PointerLockControls(camera, canvas)
controls.enableDamping = true
scene.add(controls.getObject())

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


// Shoot handler

const balls = []
const ballMeshes = []
const shootVelocity = 15
const ballShape = new CANNON.Sphere(0.2)
const ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32)
function getShootDirection() {
    const vector = new THREE.Vector3(0, 0, 1)
    vector.unproject(camera)
    const ray = new THREE.Ray(sphereBody.position, vector.sub(sphereBody.position).normalize())
    return ray.direction
}

const shootHandler = () => {
    burger = burger.clone()
    const ballBody = new CANNON.Body({ mass: 1 })
    ballBody.addShape(ballShape)

    burger.castShadow = true
    burger.receiveShadow = true

    world.addBody(ballBody)
    scene.add(burger)
    balls.push(ballBody)
    ballMeshes.push(burger)

    const shootDirection = getShootDirection()
    ballBody.velocity.set(
        shootDirection.x * shootVelocity,
        shootDirection.y * shootVelocity,
        shootDirection.z * shootVelocity
    )

    const x = sphereBody.position.x + shootDirection.x * (sphereShape.radius * 1.02 + ballShape.radius)
    const y = sphereBody.position.y + shootDirection.y * (sphereShape.radius * 1.02 + ballShape.radius)
    const z = sphereBody.position.z + shootDirection.z * (sphereShape.radius * 1.02 + ballShape.radius)
    ballBody.position.set(x, y, z)
    burger.position.copy(ballBody.position)
}


/**
 * Animate
 */
const blocker = document.getElementById( 'blocker' );
const instructions = document.getElementById( 'instructions' );

instructions.addEventListener( 'click', function () {
    controls.lock();

} );

controls.addEventListener( 'lock', function () {

    instructions.style.display = 'none';
    blocker.style.display = 'none';

} );

controls.addEventListener( 'unlock', function () {

    blocker.style.display = 'block';
    instructions.style.display = '';

} );
const cubeGeometry = new THREE.BoxGeometry(1,1,1);

const buildTower = (height) => {
    if (tower) {
        scene.remove(tower)
    }

    if (towerElements.length) {
        towerElements.forEach(el => {
            world.removeBody(el.body)
            scene.remove(el.mesh)
        })
        towerElements = []
    }

    tower = new THREE.Group()

    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < height; y++) {
            for (let z = 0; z < 3; z++) {
                const cubeMaterial = material.clone();
                let cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
                cube.castShadow = true
                cube.receiveShadow = true;
                cube.material.color.setRGB(
                    (Math.random() - .5),
                    (Math.random() - .5),
                    .8 + (Math.random() - .5),
                )

                let cubeBody = new CANNON.Body({
                    mass: .3,
                    material: defaultMaterial,
                    shape: new CANNON.Box(new CANNON.Vec3(.5, .5, .5)),
                    position: new CANNON.Vec3(x - 1, y + .5, z - 5)
                })
                cube.position.copy(cubeBody.position)
                tower.add(cube)
                world.addBody(cubeBody)
                objectsToUpdate.push({ mesh: cube, body: cubeBody })
            }
        }
    }
    scene.add(tower)
}

buildTower(5)

const tick = () =>
{
    const time = performance.now() / 1000
    const delta = time - lastCallTime;
    lastCallTime = time

    if (controls.isLocked === true) {

        sphereBody.position.copy(controls.getObject().position);

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= (9.8 * 70.0 * delta);

        direction.z = Number( movement.forward ) - Number( movement.backward );
        direction.x = Number( movement.right ) - Number( movement.left );
        direction.normalize(); // this ensures consistent movements in all directions

        if ( movement.forward || movement.backward ) velocity.z -= direction.z * 100.0 * delta;
        if ( movement.left || movement.right ) velocity.x -= direction.x * 100.0 * delta;




    controls.moveRight( - velocity.x * delta );
    controls.moveForward( - velocity.z * delta );


    // Update physics
    world.step(1 / 60, delta)

    for(const object of objectsToUpdate)
    {
        object.mesh.position.copy(object.body.position)
        object.mesh.quaternion.copy(object.body.quaternion)
    }

        // Update bullets

        for (let i = 0; i < balls.length; i++) {
            ballMeshes[i].position.copy(balls[i].position)
            ballMeshes[i].quaternion.copy(balls[i].quaternion)
        }

    }

    // Render
    renderer.render(scene, camera);

    window.requestAnimationFrame(tick)
}

tick()