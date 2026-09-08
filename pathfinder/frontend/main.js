import * as THREE from 'three';
import { createBunny, createBear } from './models.js';
import { getMapData, getPathData } from './api.js';
import { initEnvironment } from './environment.js';

// --- environment setup ---
const { scene, camera, renderer, controls } = initEnvironment();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- state variables ---
let mapCanvas, mapCtx, mapTexture, mapMesh, currentGridData;
let bearMesh, rabbitMesh;
let bearGridPos = { x: 0, y: 0 };
let rabbitGridPos = { x: 0, y: 0 };

let gameMode = 1;
let startPoint = null;
let endPoint = null;
const statusText = document.getElementById("status");

let isChasing = false;
let chaseInterval = null;
let rabbitPathData = [];
let bearPathData = [];


// --- core logic ---
async function loadMap() {
    statusText.innerText = "Fetching map data from Python...";

    try {
        // First delete the the old map if it exists
        if (mapMesh) {
            scene.remove(mapMesh);
            mapMesh.geometry.dispose();
            mapMesh.material.dispose();
            mapTexture.dispose();
            startPoint = null;
            endPoint = null;
        }

        const w = document.getElementById('ui-width').value;
        const h = document.getElementById('ui-height').value;
        const p = document.getElementById('ui-peaks').value;
        const l = document.getElementById('ui-lakes').value;

        const data = await getMapData(w, h, p, l);
        currentGridData = data.grid;
        
        mapCanvas = document.createElement('canvas');
        mapCanvas.width = data.width;
        mapCanvas.height = data.height;
        mapCtx = mapCanvas.getContext('2d');

        // Loop though the canvas and draw initial colors
        for (let y = 0; y < data.height; y++) {
            for (let x = 0; x < data.width; x++) {
                const cell = currentGridData[y][x];
                if (cell.type === 'water') mapCtx.fillStyle = '#0f5e9c';
                else if (cell.type === 'land') mapCtx.fillStyle = `rgb(34, ${Math.floor(180 - cell.elevation)}, 34)`;
                else if (cell.type === 'mountain') mapCtx.fillStyle = '#5c5c5c';
                else if (cell.type === 'snow') mapCtx.fillStyle = '#e2e8f0';
                mapCtx.fillRect(x, y, 1, 1);
            }
        }

        mapTexture = new THREE.CanvasTexture(mapCanvas);
        mapTexture.magFilter = THREE.NearestFilter;
        mapTexture.minFilter = THREE.NearestFilter;

        const tileSize = 0.25; 
        const geometry = new THREE.PlaneGeometry(data.width * tileSize, data.height * tileSize, data.width - 1, data.height - 1);
        
        // Extrude the vertices based on elevation data making it look 3d
        const vertices = geometry.attributes.position.array;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const gridX = (i / 3) % data.width;
            const gridY = Math.floor((i / 3) / data.width);
            const cell = currentGridData[gridY][gridX];
            
            if (cell.type !== 'water') {
                vertices[i + 2] = (cell.elevation / 100) * 3; 
            }
        }
        
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({ map: mapTexture, flatShading: true });
        mapMesh = new THREE.Mesh(geometry, material);
        
        // Lay the board flat like a table on the floor
        mapMesh.rotation.x = -Math.PI / 2;
        scene.add(mapMesh);

        spawnActors(data.width, data.height);
        statusText.innerText = "Map loaded! Click a start point.";

    } catch (error) {
        console.error(error);
        statusText.innerText = "Error loading map. Is Flask running?";
    }
}

function startGameLoop() {
    isChasing = true;
    rabbitPathData = [];
    bearPathData = [];
    
    if (chaseInterval) clearInterval(chaseInterval);
    fetchBearPath(bearGridPos, rabbitGridPos);
    
    chaseInterval = setInterval(() => {
        if (!isChasing) return;
        let rabbitMoved = false;
        
        if (rabbitPathData.length > 0) {
            const nextR = rabbitPathData.shift();
            rabbitGridPos = { x: nextR[0], y: nextR[1] };
            rabbitMesh.position.copy(get3DPosition(rabbitGridPos.x, rabbitGridPos.y, mapCanvas.width, mapCanvas.height));
            rabbitMoved = true;
        }
        
        if (bearPathData.length > 0) {
            const nextB = bearPathData.shift();
            bearGridPos = { x: nextB[0], y: nextB[1] };
            bearMesh.position.copy(get3DPosition(bearGridPos.x, bearGridPos.y, mapCanvas.width, mapCanvas.height));
        }
        
        if (bearGridPos.x === rabbitGridPos.x && bearGridPos.y === rabbitGridPos.y) {
            statusText.innerText = "GAME OVER! The Bear caught you! Click to reset.";
            clearInterval(chaseInterval);
            isChasing = false;
            startPoint = null; 
            return;
        }
        
        drawMode2Paths();
        if (rabbitMoved) fetchBearPath(bearGridPos, rabbitGridPos);
        
    }, 250); 
}

function animateHunt(pathCoordinates) {
    if (!pathCoordinates || pathCoordinates.length === 0) return;
    let currentStep = 0;
    
    function moveToNextTile() {
        if (currentStep >= pathCoordinates.length) {
            statusText.innerText = "The Bear caught the Rabbit! Click anywhere to start a new hunt.";
            startPoint = null; 
            endPoint = null;
            return;
        }
        
        const [gridX, gridY] = pathCoordinates[currentStep];
        const targetPos = get3DPosition(gridX, gridY, mapCanvas.width, mapCanvas.height);
        const startPos = bearMesh.position.clone();
        const startTime = performance.now();
        
        function stepAnimation(currentTime) {
            const progress = Math.min((currentTime - startTime) / 80, 1.0);
            bearMesh.position.lerpVectors(startPos, targetPos, progress);
            
            if (progress < 1.0) requestAnimationFrame(stepAnimation);
            else {
                currentStep++;
                moveToNextTile(); 
            }
        }
        requestAnimationFrame(stepAnimation);
    }
    moveToNextTile();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}


// --- user input ---
let mouseDownPosition = { x: 0, y: 0 };

window.addEventListener('mousedown', (e) => {
    mouseDownPosition = { x: e.clientX, y: e.clientY };
});

// if the mouse moved less than 5 pixels in any direction, it was a real click
window.addEventListener('mouseup', (e) => {
    if (Math.abs(e.clientX - mouseDownPosition.x) < 5 && Math.abs(e.clientY - mouseDownPosition.y) < 5) {
        onMouseClick(e);
    }
});

document.getElementById('generate-btn').addEventListener('click', loadMap);
document.getElementById('ui-peaks').addEventListener('input', (e) => document.getElementById('peaks-val').innerText = e.target.value);
document.getElementById('ui-lakes').addEventListener('input', (e) => document.getElementById('lakes-val').innerText = e.target.value);

document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        gameMode = parseInt(e.target.value);
        if (chaseInterval) clearInterval(chaseInterval);
        isChasing = false;
        rabbitPathData = [];
        bearPathData = [];
        startPoint = null;
        endPoint = null;
        bearMesh.visible = false;
        rabbitMesh.visible = false;
        repaintMap();
        statusText.innerText = `Mode ${gameMode} Active. Click to spawn the Bear!`;
    });
});

// Handles all user clicks on the 3D map using raycasting
function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (!mapMesh) return;
    const intersects = raycaster.intersectObject(mapMesh);
    if (intersects.length === 0) return;

    const hit = intersects[0];
    const gridX = Math.min(Math.floor(hit.uv.x * mapCanvas.width), mapCanvas.width - 1);
    const gridY = Math.min(Math.floor((1.0 - hit.uv.y) * mapCanvas.height), mapCanvas.height - 1);

    if (gameMode === 1) {
        // Mode 1: first click sets bear, second click sets rabbit and triggers animation
        if (!startPoint) {
            repaintMap(); 
            startPoint = { x: gridX, y: gridY };
            statusText.innerText = `Bear spawned. Click destination for the Rabbit!`;
            bearMesh.visible = true;
            rabbitMesh.visible = false; 
            bearMesh.position.copy(get3DPosition(gridX, gridY, mapCanvas.width, mapCanvas.height));
        } else {
            endPoint = { x: gridX, y: gridY };
            statusText.innerText = `Calculating hunt path...`;
            rabbitMesh.visible = true;
            rabbitMesh.position.copy(get3DPosition(gridX, gridY, mapCanvas.width, mapCanvas.height));
            fetchPath(startPoint, endPoint); 
            startPoint = null; 
        }
    } else if (gameMode === 2) {
        // Mode 2: first click bear, second rabbit, and then subsequent clicks move the rabbit
        if (!startPoint) {
            repaintMap();
            startPoint = { x: gridX, y: gridY };
            bearGridPos = { x: gridX, y: gridY };
            bearMesh.visible = true;
            rabbitMesh.visible = false;
            bearMesh.position.copy(get3DPosition(gridX, gridY, mapCanvas.width, mapCanvas.height));
            statusText.innerText = "Bear spawned. Click to spawn Rabbit and START!";
        } else if (!isChasing) {
            endPoint = { x: gridX, y: gridY };
            rabbitGridPos = { x: gridX, y: gridY };
            rabbitMesh.visible = true;
            rabbitMesh.position.copy(get3DPosition(gridX, gridY, mapCanvas.width, mapCanvas.height));
            statusText.innerText = "CHASE STARTED! Click anywhere to move the Rabbit.";
            startGameLoop(); 
        } else {
            fetchRabbitPath(rabbitGridPos, { x: gridX, y: gridY });
        }
    }
}


// --- network requests ---

// Fetches the A* path for Mode 1 and triggers the single-run visual animation
async function fetchPath(start, end) {
    try {
        const data = await getPathData(start.x, start.y, end.x, end.y);
        if (data.error) return statusText.innerText = `Error: ${data.error}`;
        statusText.innerText = `Success! Path found. Energy Cost: ${data.total_cost}`;
        drawPath(data.path);
        animateHunt(data.path);
    } catch (error) { console.error(error); }
}

async function fetchRabbitPath(start, end) {
    try {
        const data = await getPathData(start.x, start.y, end.x, end.y);
        if (!data.error) rabbitPathData = data.path;
    } catch (err) { console.error(err); }
}

async function fetchBearPath(start, end) {
    try {
        const data = await getPathData(start.x, start.y, end.x, end.y);
        if (!data.error) bearPathData = data.path;
    } catch (err) { console.error(err); }
}


// --- rendering helpers ---

// Takes the 2D grid coordinates and returns the coordinates with Z axis added (3D position)
function get3DPosition(gridX, gridY, width, height) {
    const tileSize = 0.25; 
    const localX = (gridX * tileSize) - ((width * tileSize) / 2) + (tileSize / 2);
    const localY = -((gridY * tileSize) - ((height * tileSize) / 2) + (tileSize / 2));
    const cell = currentGridData[gridY][gridX];
    const localZ = cell.type !== 'water' ? (cell.elevation / 100) * 3 : -0.2;
    return new THREE.Vector3(localX, localY, localZ + 0.15); // slight offset so the model doens't clip the ground 
}

// Clears old actors, rebuilds the models, and stages them invisibly on the map
function spawnActors(width, height) {
    if (bearMesh) mapMesh.remove(bearMesh);
    if (rabbitMesh) mapMesh.remove(rabbitMesh);
    bearMesh = createBear();
    rabbitMesh = createBunny();
    bearMesh.rotation.x = Math.PI / 2;
    rabbitMesh.rotation.x = Math.PI / 2;
    bearMesh.visible = false;
    rabbitMesh.visible = false;
    mapMesh.add(bearMesh);
    mapMesh.add(rabbitMesh);
}

// This wipes the painted paths by redrawing the base terrain colors onto the 2D canvas texture 
// (could be made more efficient by only redrawing the path pixels, but this is simpler and works fine for small to medium maps)
function repaintMap() {
    for (let y = 0; y < mapCanvas.height; y++) {
        for (let x = 0; x < mapCanvas.width; x++) {
            const cell = currentGridData[y][x];
            if (cell.type === 'water') mapCtx.fillStyle = '#0f5e9c';
            else if (cell.type === 'land') mapCtx.fillStyle = `rgb(34, ${Math.floor(180 - cell.elevation)}, 34)`;
            else if (cell.type === 'mountain') mapCtx.fillStyle = '#5c5c5c';
            else if (cell.type === 'snow') mapCtx.fillStyle = '#e2e8f0';
            mapCtx.fillRect(x, y, 1, 1);
        }
    }
    mapTexture.needsUpdate = true;
}

// Paints the single orange tracking line for the Mode 1 Tech Demo
function drawPath(pathCoordinates) {
    mapCtx.fillStyle = '#ff4500';
    pathCoordinates.forEach(([x, y]) => mapCtx.fillRect(x, y, 1, 1));
    mapTexture.needsUpdate = true;
}

// Clears the map, then draws the red (bear) and green (rabbit) live paths for Mode 2
function drawMode2Paths() {
    repaintMap(); 
    mapCtx.fillStyle = '#ff0000';
    bearPathData.forEach(([x, y]) => mapCtx.fillRect(x, y, 1, 1));
    mapCtx.fillStyle = '#00ff00';
    rabbitPathData.forEach(([x, y]) => mapCtx.fillRect(x, y, 1, 1));
    mapTexture.needsUpdate = true;
}

loadMap();
animate();