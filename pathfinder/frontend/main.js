import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 20;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// camera movement controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableRotate = false;

function animate() {
    requestAnimationFrame(animate);

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

// Flat map generation

let mapCanvas, mapCtx, mapTexture, mapMesh;

async function loadMap() {
    const statusText = document.getElementById("status");
    statusText.innerText = "Fetching map data from Python...";

    try {
        const response = await fetch('http://127.0.0.1:5000/api/map?width=128&height=64');
        const data = await response.json();

        const grid = data.grid;
        const width = data.width;
        const height = data.height;

        mapCanvas = document.createElement('canvas');
        mapCanvas.width = width;
        mapCanvas.height = height;
        mapCtx = mapCanvas.getContext('2d');

        // This loops through the Python data and paint the canvas
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


        const geometry = new THREE.PlaneGeometry(30, 15);
        const material = new THREE.MeshBasicMaterial({ map: mapTexture });
        mapMesh = new THREE.Mesh(geometry, material);

        scene.add(mapMesh);

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
            startPoint = { x: gridX, y: gridY };
            statusText.innerText = `Start Point set at [${gridX}, ${gridY}]. Click destination!`;
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
