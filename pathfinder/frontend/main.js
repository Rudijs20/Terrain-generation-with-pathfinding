import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 40;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// camera movement controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(50, 50, 50);
scene.add(sunLight);

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

// Globe generation

let mapCanvas, mapCtx, globeTexture;

async function loadGlobe() {
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

        globeTexture = new THREE.CanvasTexture(mapCanvas);
        
        globeTexture.magFilter = THREE.NearestFilter;
        globeTexture.minFilter = THREE.NearestFilter;

        // A 3D 15 radius sphere, with 64x32 segments for smoothness
        const geometry = new THREE.SphereGeometry(15, 64, 32);
        const material = new THREE.MeshStandardMaterial({ map: globeTexture });
        const globeMesh = new THREE.Mesh(geometry, material);
        
        scene.add(globeMesh);

        statusText.innerText = "Globe loaded! (Rotate with mouse)";

    } catch (error) {
        console.error("Error fetching map:", error);
        statusText.innerText = "Error loading map. Is the Flask server running?";
    }
}

loadGlobe();