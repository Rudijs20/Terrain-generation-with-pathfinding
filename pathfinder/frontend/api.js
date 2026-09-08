// frontend/api.js
const BASE_URL = 'http://127.0.0.1:5000/api';

// Fetches the newly generated world
export async function getMapData(width, height, peaks, lakes) {
    const response = await fetch(`${BASE_URL}/map?width=${width}&height=${height}&peaks=${peaks}&lakes=${lakes}`);
    return await response.json();
}

// Fetches the A* path between two points
export async function getPathData(startX, startY, endX, endY) {
    const response = await fetch(`${BASE_URL}/path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            start_x: startX, 
            start_y: startY, 
            end_x: endX, 
            end_y: endY 
        })
    });
    return await response.json();
}