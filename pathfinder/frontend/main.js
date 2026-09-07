import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.set(0, 15, 20); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// controls locked for tabletop look
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableRotate = true; // Turn rotation back on!
controls.maxPolarAngle = Math.PI / 2.2; // Prevents camera from going under the map
controls.minPolarAngle = Math.PI / 4;   // Prevents camera from going perfectly top-down

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 40, 20); // Simulates the sun
scene.add(dirLight);

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();

// Flat map generation

let mapCanvas, mapCtx, mapTexture, mapMesh;

// Game actors
let bearMesh, rabbitMesh;
let bearGridPos = { x: 0, y: 0 };
let rabbitGridPos = { x: 0, y: 0 };
let currentGridData;

async function loadMap() {
    const statusText = document.getElementById("status");
    statusText.innerText = "Fetching map data from Python...";

    try {
        // First delete the map if already there
        if (mapMesh) {
            scene.remove(mapMesh);
            mapMesh.geometry.dispose();
            mapMesh.material.dispose();
            mapTexture.dispose();
            
            // Reset points
            startPoint = null;
            endPoint = null;
        }

        const w = document.getElementById('ui-width').value;
        const h = document.getElementById('ui-height').value;
        const p = document.getElementById('ui-peaks').value;
        const l = document.getElementById('ui-lakes').value;

        const response = await fetch(`http://127.0.0.1:5000/api/map?width=${w}&height=${h}&peaks=${p}&lakes=${l}`);
        const data = await response.json();
        const grid = data.grid;
        currentGridData = grid;
        const width = data.width;
        const height = data.height;

        mapCanvas = document.createElement('canvas');
        mapCanvas.width = width;
        mapCanvas.height = height;
        mapCtx = mapCanvas.getContext('2d');

        // loop through the Python data and paint the canvas
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = grid[y][x];

                if (cell.type === 'water') {
                    mapCtx.fillStyle = '#0f5e9c';
                } else if (cell.type === 'land') {
                    const greenValue = Math.floor(180 - (cell.elevation));
                    mapCtx.fillStyle = `rgb(34, ${greenValue}, 34)`;
                } else if (cell.type === 'mountain') {
                    mapCtx.fillStyle = '#5c5c5c';
                } else if (cell.type === 'snow') {
                    mapCtx.fillStyle = '#e2e8f0';
                }

                mapCtx.fillRect(x, y, 1, 1);
            }
        }

        mapTexture = new THREE.CanvasTexture(mapCanvas);

        mapTexture.magFilter = THREE.NearestFilter;
        mapTexture.minFilter = THREE.NearestFilter;

        const tileSize = 0.25; 
        const physicalWidth = width * tileSize;
        const physicalHeight = height * tileSize;
        
        const geometry = new THREE.PlaneGeometry(physicalWidth, physicalHeight, width - 1, height - 1);
                
        // Extrude the squares based on the elevation to make it look 3d like
        const vertices = geometry.attributes.position.array;
        
        // Every vertex has 3 coordinates (x, y, z) so it loop by 3s
        for (let i = 0; i < vertices.length; i += 3) {
            const vertexIndex = i / 3;
            const gridX = vertexIndex % width;
            const gridY = Math.floor(vertexIndex / width);
            
            const cell = grid[gridY][gridX];
            
            if (cell.type !== 'water') {
                const elevationBoost = (cell.elevation / 100) * 3; 
                vertices[i + 2] = elevationBoost; // Modifying the Z axis
            }
        }
        
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({ 
            map: mapTexture,
            flatShading: true
        });

        mapMesh = new THREE.Mesh(geometry, material);
        
        // Lay the board flat like a table on the floor
        mapMesh.rotation.x = -Math.PI / 2;
        scene.add(mapMesh);

        spawnActors(width, height);

        statusText.innerText = "Map loaded! Click a start point.";

    } catch (error) {
        console.error("Error fetching map:", error);
        statusText.innerText = "Error loading map. Is the Flask server running?";
    }

}

loadMap();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let startPoint = null;
let endPoint = null;
const statusText = document.getElementById("status");

// distinguish click from drag
let mouseDownPosition = { x: 0, y: 0 };

window.addEventListener('mousedown', (event) => {
    // Record where the mouse was when pressed down
    mouseDownPosition.x = event.clientX;
    mouseDownPosition.y = event.clientY;
});

window.addEventListener('mouseup', (event) => {
    const deltaX = Math.abs(event.clientX - mouseDownPosition.x);
    const deltaY = Math.abs(event.clientY - mouseDownPosition.y);

    // if the mouse moved less than 5 pixels in any direction, it was a real click
    if (deltaX < 5 && deltaY < 5) {
        onMouseClick(event);
    }
});

document.getElementById('generate-btn').addEventListener('click', () => {
    loadMap();
});

document.getElementById('ui-peaks').addEventListener('input', (e) => {
    document.getElementById('peaks-val').innerText = e.target.value;
});

document.getElementById('ui-lakes').addEventListener('input', (e) => {
    document.getElementById('lakes-val').innerText = e.target.value;
});

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (!mapMesh) return;

    const intersects = raycaster.intersectObject(mapMesh);

    if (intersects.length > 0) {
        const hit = intersects[0];
        const uv = hit.uv;

        const gridX = Math.min(Math.floor(uv.x * mapCanvas.width), mapCanvas.width - 1);
        const gridY = Math.min(Math.floor((1.0 - uv.y) * mapCanvas.height), mapCanvas.height - 1);

        // Start point or end point logic
        if (!startPoint) {
            repaintMap(); // Wipe the old red path away
            
            startPoint = { x: gridX, y: gridY };
            statusText.innerText = `Bear spawned. Click destination for the Rabbit!`;
            
            // This shows the Bear and snap him to the clicked tile
            bearMesh.visible = true;
            rabbitMesh.visible = false; // this hides the old rabbit
            const pos = get3DPosition(gridX, gridY, mapCanvas.width, mapCanvas.height);
            bearMesh.position.copy(pos);
            
        } else if (!endPoint) {
            endPoint = { x: gridX, y: gridY };
            statusText.innerText = `Calculating hunt path...`;
            
            // Show the Rabbit and snap him to the destination
            rabbitMesh.visible = true;
            const pos = get3DPosition(gridX, gridY, mapCanvas.width, mapCanvas.height);
            rabbitMesh.position.copy(pos);
            
            fetchPath(startPoint, endPoint);
        } else if (!endPoint) {
            endPoint = { x: gridX, y: gridY };
            statusText.innerText = `Calculating path from [${startPoint.x}, ${startPoint.y}] to [${endPoint.x}, ${endPoint.y}]...`;

            fetchPath(startPoint, endPoint);

            startPoint = null;
            endPoint = null;
        }
    }
}

async function fetchPath(start, end) {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/path', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start_x: start.x,
                start_y: start.y,
                end_x: end.x,
                end_y: end.y
            })
        });

        const data = await response.json();

        // Check if a valid spot was clicked
        if (data.error) {
            statusText.innerText = `Error: ${data.error}`;
            return;
        }

        statusText.innerText = `Success! Path found. Energy Cost: ${data.total_cost}`;
        drawPath(data.path);
        animateHunt(data.path);

    } catch (error) {
        console.error("Pathfinding error:", error);
        statusText.innerText = "Error calculating path. Check the Python terminal.";
    }
}

function drawPath(pathCoordinates) {
    mapCtx.fillStyle = '#ff4500';

    for (let i = 0; i < pathCoordinates.length; i++) {
        const x = pathCoordinates[i][0];
        const y = pathCoordinates[i][1];

        mapCtx.fillRect(x, y, 1, 1);
    }

    mapTexture.needsUpdate = true;
}


// Actor logic
function get3DPosition(gridX, gridY, width, height) {
    const tileSize = 0.25; 
    const localX = (gridX * tileSize) - ((width * tileSize) / 2) + (tileSize / 2);
    const localY = -((gridY * tileSize) - ((height * tileSize) / 2) + (tileSize / 2));
    
    const cell = currentGridData[gridY][gridX];
    let localZ = -0.2;
    
    if (cell.type !== 'water') {
        localZ = (cell.elevation / 100) * 3;
    }
    
    return new THREE.Vector3(localX, localY, localZ + 0.15); 
}

function spawnActors(width, height) {
    if (bearMesh) mapMesh.remove(bearMesh);
    if (rabbitMesh) mapMesh.remove(rabbitMesh);
    
    const bearGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const bearMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); 
    bearMesh = new THREE.Mesh(bearGeo, bearMat);
    
    const rabbitGeo = new THREE.SphereGeometry(0.15);
    const rabbitMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); 
    rabbitMesh = new THREE.Mesh(rabbitGeo, rabbitMat);
    
    bearMesh.visible = false;
    rabbitMesh.visible = false;
    
    mapMesh.add(bearMesh);
    mapMesh.add(rabbitMesh);
}

function repaintMap() {
    const width = mapCanvas.width;
    const height = mapCanvas.height;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = currentGridData[y][x];
            if (cell.type === 'water') mapCtx.fillStyle = '#0f5e9c';
            else if (cell.type === 'land') {
                const greenValue = Math.floor(180 - (cell.elevation));
                mapCtx.fillStyle = `rgb(34, ${greenValue}, 34)`;
            } else if (cell.type === 'mountain') mapCtx.fillStyle = '#5c5c5c';
            else if (cell.type === 'snow') mapCtx.fillStyle = '#e2e8f0';
            mapCtx.fillRect(x, y, 1, 1);
        }
    }
    mapTexture.needsUpdate = true;
}

// The hunting animation
function animateHunt(pathCoordinates) {
    if (!pathCoordinates || pathCoordinates.length === 0) return;
    
    let currentStep = 0;
    
    function moveToNextTile() {
        // Check if the bear reached the end
        if (currentStep >= pathCoordinates.length) {
            document.getElementById("status").innerText = "The Bear caught the Rabbit! Click anywhere to start a new hunt.";
            startPoint = null; // A new click resets the game
            endPoint = null;
            return;
        }
        
        const [gridX, gridY] = pathCoordinates[currentStep];
        const targetPos = get3DPosition(gridX, gridY, mapCanvas.width, mapCanvas.height);
        
        const startPos = bearMesh.position.clone();
        const stepDuration = 80; // Animation speed (milliseconds per tile)
        const startTime = performance.now();
        
        // Mini animation loop for a single step
        function stepAnimation(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / stepDuration, 1.0);
            
            bearMesh.position.lerpVectors(startPos, targetPos, progress);
            
            if (progress < 1.0) {
                requestAnimationFrame(stepAnimation);
            } else {
                currentStep++; // Move to next tile!
                moveToNextTile(); 
            }
        }
        
        requestAnimationFrame(stepAnimation);
    }
    
    moveToNextTile();
}