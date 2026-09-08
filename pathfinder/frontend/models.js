// frontend/models.js
import * as THREE from 'three';

export function createBunny() {
    const group = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: '#f7f4eb', flatShading: true });
    
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 5), white);
    body.scale.set(0.9, 0.85, 1.2);
    body.position.y = 0.34;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 5), white);
    head.position.set(0, 0.65, -0.24);
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);
    
    for (const x of [-0.1, 0.1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 6), white);
        ear.position.set(x, 0.96, -0.24);
        ear.castShadow = true;
        group.add(ear);
    }
    
    group.scale.setScalar(0.4);
    return group;
}

export function createBear() {
    const group = new THREE.Group();
    const brown = new THREE.MeshStandardMaterial({ color: '#79543a', flatShading: true });
    
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.43, 7, 5), brown);
    body.scale.set(1, 1, 1.15);
    body.position.y = 0.43;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 5), brown);
    head.position.set(0, 0.82, -0.27);
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);
    
    for (const x of [-0.23, 0.23]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), brown);
        ear.position.set(x, 1.04, -0.27);
        ear.castShadow = true;
        group.add(ear);
    }
    
    group.scale.setScalar(0.45);
    return group;
}