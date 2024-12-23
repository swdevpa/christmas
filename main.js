import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Tween, Easing, update } from '@tweenjs/tween.js';

// Asset Manager für optimiertes Laden
class AssetManager {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.gltfLoader = new GLTFLoader();
        this.audioLoader = new THREE.AudioLoader();
        this.loadingManager = new THREE.LoadingManager();
        this.cache = new Map();
        this.setupLoadingManager();
    }

    setupLoadingManager() {
        this.loadingManager.onProgress = (url, loaded, total) => {
            const progress = (loaded / total) * 100;
            const progressBar = document.querySelector('.progress');
            if (progressBar) {
                progressBar.style.width = progress + '%';
            }
        };

        this.loadingManager.onLoad = () => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        };
    }

    loadTexture(url) {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        const texture = this.textureLoader.load(url);
        this.cache.set(url, texture);
        return texture;
    }

    loadModel(url) {
        if (this.cache.has(url)) {
            return this.cache.get(url).clone();
        }

        return new Promise((resolve, reject) => {
            this.gltfLoader.load(url,
                (gltf) => {
                    this.cache.set(url, gltf.scene);
                    resolve(gltf.scene.clone());
                },
                undefined,
                reject
            );
        });
    }

    loadAudio(url) {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        return new Promise((resolve, reject) => {
            this.audioLoader.load(url,
                (buffer) => {
                    this.cache.set(url, buffer);
                    resolve(buffer);
                },
                undefined,
                reject
            );
        });
    }
}

// Performance Monitor (vereinfachte Version ohne Stats.js)
class PerformanceMonitor {
    constructor() {
        this.lastTime = performance.now();
        this.frames = 0;
        this.fps = 0;
        this.fpsElement = document.createElement('div');
        this.fpsElement.style.position = 'absolute';
        this.fpsElement.style.top = '0';
        this.fpsElement.style.left = '0';
        this.fpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.fpsElement.style.color = 'white';
        this.fpsElement.style.padding = '5px';
        this.fpsElement.style.fontFamily = 'monospace';
        document.getElementById('performance-stats').appendChild(this.fpsElement);
    }

    beginFrame() {
        const currentTime = performance.now();
        this.frames++;

        if (currentTime > this.lastTime + 1000) {
            this.fps = Math.round((this.frames * 1000) / (currentTime - this.lastTime));
            this.lastTime = currentTime;
            this.frames = 0;
            this.fpsElement.textContent = `FPS: ${this.fps}`;
        }
    }

    endFrame() {
        // Nicht benötigt in dieser vereinfachten Version
    }
}

class ChristmasVillage {
    constructor() {
        // Warte auf DOMContentLoaded bevor die Initialisierung startet
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
        this.chimneySmoke = []; // Initialize chimneySmoke array
        
        // Material cache for reuse
        this.materialCache = new Map();
    }

    getMaterial(key, createMaterial) {
        if (!this.materialCache.has(key)) {
            this.materialCache.set(key, createMaterial());
        }
        return this.materialCache.get(key);
    }

    setup() {
        // Initialize renderer directly with WebGL
        this.initWebGL();
        /* WebGPU is still experimental
        if ('gpu' in navigator) {
            this.initWebGPU();
        } else {
            this.initWebGL();
        }
        */
    }

    async initWebGPU() {
        try {
            // Request adapter
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                console.warn('WebGPU not supported, falling back to WebGL');
                this.initWebGL();
                return;
            }

            // Request device
            const device = await adapter.requestDevice();
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('webgpu');

            const format = navigator.gpu.getPreferredCanvasFormat();
            context.configure({
                device,
                format,
                alphaMode: 'premultiplied',
            });

            this.initScene(true); // true indicates WebGPU
        } catch (error) {
            console.warn('WebGPU initialization failed, falling back to WebGL:', error);
            this.initWebGL();
        }
    }

    initWebGL() {
        this.initScene(false); // false indicates WebGL
    }

    initScene(isWebGPU) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Always use WebGL for now as WebGPU is not ready
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: false,
            powerPreference: "high-performance",
            precision: "lowp",
            stencil: false,
            depth: true,
            logarithmicDepthBuffer: false,
            alpha: false
        });

        // Performance optimizations for the renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight, false);  // false prevents auto-updating of canvas style
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.renderer.setPixelRatio(1); // Force 1:1 pixel ratio
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.info.autoReset = false;  // Manually reset renderer info
        this.renderer.sortObjects = false;
        
        // Scene optimizations
        this.scene.matrixAutoUpdate = false;
        this.scene.autoUpdate = false;  // Manually update scene

        // Set up frustum culling
        this.camera.frustumCulled = true;
        
        const container = document.getElementById('scene-container');
        if (container) {
            container.appendChild(this.renderer.domElement);
            // Set canvas style manually for better performance
            this.renderer.domElement.style.width = '100%';
            this.renderer.domElement.style.height = '100%';
        }

        // Rest of the initialization
        this.clock = new THREE.Clock();
        this.textureLoader = new THREE.TextureLoader();
        
        // Initialize audio after user interaction
        const startAudioButton = document.createElement('button');
        startAudioButton.textContent = '🔇 Start Audio';
        startAudioButton.style.position = 'absolute';
        startAudioButton.style.top = '10px';
        startAudioButton.style.right = '10px';
        startAudioButton.style.zIndex = '1000';
        startAudioButton.style.padding = '8px';
        startAudioButton.style.borderRadius = '4px';
        startAudioButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        startAudioButton.style.color = 'white';
        startAudioButton.style.border = 'none';
        startAudioButton.style.cursor = 'pointer';
        
        startAudioButton.addEventListener('click', () => {
            this.audioListener = new THREE.AudioListener();
            this.camera.add(this.audioListener);
            this.audioSources = new Map();
            this.setupAudio();
            startAudioButton.textContent = '🔊';
        });
        
        document.body.appendChild(startAudioButton);
        
        this.performanceMonitor = new PerformanceMonitor();
        this.instancedMeshes = new Map();
        this.snowParticles = [];
        this.elves = [];
        this.houses = [];
        this.selectedHouse = null;
        
        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();

        // Show Loading Screen
        this.showLoadingScreen();
        
        // Start initialization
        this.init();
    }

    showLoadingScreen() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBar = document.querySelector('.progress');
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
        }
    }

    updateLoadingProgress(progress) {
        if (this.progressBar) {
            this.progressBar.style.width = `${progress}%`;
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            this.loadingScreen.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    async init() {
        try {
            // Initialisiere die Szene schrittweise mit Fortschrittsanzeige
            this.updateLoadingProgress(10);
            await this.setupCamera();
            
            this.updateLoadingProgress(20);
            await this.setupControls();
            
            this.updateLoadingProgress(30);
            await this.setupLighting();
            
            this.updateLoadingProgress(40);
            await this.createGround();
            
            this.updateLoadingProgress(50);
            await this.createSnow();
            
            this.updateLoadingProgress(60);
            await Promise.all([
                this.createDetailedHouses(),
                this.createDetailedTrees(),
                this.createDecorations()
            ]);
            
            this.updateLoadingProgress(70);
            await Promise.all([
                this.createElves(),
                this.createSanta(),
                this.createReindeers()
            ]);
            
            this.updateLoadingProgress(80);
            await Promise.all([
                this.createNorthernLights(),
                //this.createPaths(), // Remove paths creation
                this.createFences()
            ]);
            
            this.updateLoadingProgress(90);
            await Promise.all([
                //this.createGifts(),
                //this.createIcicles(),
                //this.createParticleSystems()
            ]);

            // Event Listeners
            window.addEventListener('resize', () => this.onWindowResize());
            
            // Reset Camera Button
            const resetButton = document.getElementById('reset-camera');
            if (resetButton) {
                resetButton.addEventListener('click', () => this.resetCamera());
            }

            // Setup Audio
            await this.setupAudio();
            
            this.updateLoadingProgress(100);
            
            // Verstecke Loading Screen und starte Animation
            setTimeout(() => {
                this.hideLoadingScreen();
                this.animate();
            }, 500);

        } catch (error) {
            console.error('Error initializing scene:', error);
            this.hideLoadingScreen();
            // Zeige Fehlermeldung
            alert('Failed to load Christmas Village. Please refresh the page.');
        }
    }

    setupCamera() {
        // Kamera-Position setzen
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);
        return this.camera;
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        // Erweiterte OrbitControls-Einstellungen
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.zoomSpeed = 0.8;
        this.controls.panSpeed = 0.8;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Verhindere Kamera unter dem Boden
        this.controls.minPolarAngle = Math.PI / 6;       // Minimaler Winkel von oben

        return this.controls;
    }

    setupLighting() {
        // Umgebungslicht - Intensität mit PI multiplizieren für neue Beleuchtung
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5 * Math.PI);
        this.scene.add(ambientLight);

        // Hauptlichtquelle (Mond) - Optimized shadows
        const moonLight = new THREE.DirectionalLight(0x6666ff, 0.8 * Math.PI);
        moonLight.position.set(50, 50, 50);
        moonLight.castShadow = true;
        
        // Optimize shadow map settings
        moonLight.shadow.mapSize.width = 1024;
        moonLight.shadow.mapSize.height = 1024;
        moonLight.shadow.camera.near = 1;
        moonLight.shadow.camera.far = 200;
        moonLight.shadow.camera.left = -30;
        moonLight.shadow.camera.right = 30;
        moonLight.shadow.camera.top = 30;
        moonLight.shadow.camera.bottom = -30;
        moonLight.shadow.bias = -0.001;
        
        this.scene.add(moonLight);

        // Zusätzliches warmes Licht von den Häusern - Angepasste Intensität für Point Light
        const warmLight = new THREE.PointLight(0xff9933, 100); // Deutlich höhere Intensität für Point Light
        warmLight.position.set(0, 5, 0);
        warmLight.castShadow = false;
        warmLight.decay = 2; // Physikalisch korrekter Lichtabfall
        this.scene.add(warmLight);

        return this.scene;
    }

    createGround() {
        // Erstelle den verschneiten Boden - Optimize ground mesh
        const groundGeometry = new THREE.CircleGeometry(50, 32);
        const snowTexture = this.textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg');
        snowTexture.wrapS = THREE.RepeatWrapping;
        snowTexture.wrapT = THREE.RepeatWrapping;
        snowTexture.repeat.set(5, 5);

        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: snowTexture,
            roughness: 0.8,
            metalness: 0.1
        });

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Initialize snow accumulation group
        this.snowAccumulationGroup = new THREE.Group();
        this.scene.add(this.snowAccumulationGroup);

        // Create initial snow drifts
        this.createInitialSnowDrifts();

        return this.scene;
    }

    createInitialSnowDrifts() {
        // Create more initial snow drifts for better coverage
        const numInitialDrifts = 100;  // Increased from 25 to 100 for better initial coverage
        
        for (let i = 0; i < numInitialDrifts; i++) {
            const radius = Math.random() * 2 + 1;
            const height = Math.random() * 0.3 + 0.1;  // Slightly lower initial height
            const segments = Math.floor(Math.random() * 6) + 6;
            
            const driftGeometry = new THREE.ConeGeometry(radius, height, segments);
            const driftMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.9,
                metalness: 0.1
            });
            
            const drift = new THREE.Mesh(driftGeometry, driftMaterial);
            drift.position.set(
                (Math.random() - 0.5) * 80,
                height / 2,
                (Math.random() - 0.5) * 80
            );
            drift.rotation.y = Math.random() * Math.PI;
            drift.castShadow = true;
            drift.receiveShadow = true;
            drift.userData.maxHeight = height * 2;  // Maximum height this drift can grow to
            drift.userData.growthRate = 0.0001 + Math.random() * 0.0001;  // Individual growth rate
            this.snowAccumulationGroup.add(drift);
        }
    }

    addToSnowCover(x, z) {
        // Find the nearest snow drift or create a new one
        const radius = 2;
        let foundExisting = false;
        let nearestDrift = null;
        let minDistance = Infinity;

        this.snowAccumulationGroup.children.forEach((drift) => {
            const distance = Math.sqrt(
                Math.pow(drift.position.x - x, 2) +
                Math.pow(drift.position.z - z, 2)
            );

            if (distance < radius) {
                foundExisting = true;
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestDrift = drift;
                }
            }
        });

        if (foundExisting && nearestDrift) {
            // Increase existing snow drift size if below max height
            if (nearestDrift.scale.y < nearestDrift.userData.maxHeight) {
                nearestDrift.scale.y += nearestDrift.userData.growthRate;
                nearestDrift.scale.x += nearestDrift.userData.growthRate * 0.5;
                nearestDrift.scale.z += nearestDrift.userData.growthRate * 0.5;
                nearestDrift.position.y = nearestDrift.geometry.parameters.height * nearestDrift.scale.y / 2;
            }
        } else if (Math.random() < 0.05) { // 5% chance to create new drift
            const height = 0.2 + Math.random() * 0.2;
            const driftGeometry = new THREE.ConeGeometry(0.5, height, 8);
            const driftMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.9,
                metalness: 0.1
            });
            
            const drift = new THREE.Mesh(driftGeometry, driftMaterial);
            drift.position.set(x, height / 2, z);
            drift.rotation.y = Math.random() * Math.PI;
            drift.castShadow = true;
            drift.receiveShadow = true;
            drift.userData.maxHeight = height * 2;
            drift.userData.growthRate = 0.0001 + Math.random() * 0.0001;
            this.snowAccumulationGroup.add(drift);
        }
    }

    createSnow() {
        const snowGeometry = new THREE.BufferGeometry();
        const snowMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,  // Increased size for better visibility
            transparent: true,
            opacity: 0.8,
            map: this.createSnowflakeTexture(),
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Increase number of snowflakes for better effect
        const positions = new Float32Array(3000 * 3);  // Increased from 2000 to 3000
        const velocities = new Float32Array(3000 * 3);

        for (let i = 0; i < positions.length; i += 3) {
            // Randomize starting positions more widely
            positions[i] = (Math.random() - 0.5) * 120;     // x (increased spread)
            positions[i + 1] = Math.random() * 80;          // y (increased height)
            positions[i + 2] = (Math.random() - 0.5) * 120; // z (increased spread)

            // Adjust velocities for more natural movement
            velocities[i] = (Math.random() - 0.5) * 0.2;    // x velocity (increased)
            velocities[i + 1] = -Math.random() * 0.3 - 0.2; // y velocity (adjusted)
            velocities[i + 2] = (Math.random() - 0.5) * 0.2;// z velocity (increased)
        }

        snowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const snow = new THREE.Points(snowGeometry, snowMaterial);
        snow.userData.velocities = velocities;
        snow.frustumCulled = false; // Prevent frustum culling for continuous snow
        this.scene.add(snow);
        this.snow = snow;

        return this.scene;
    }

    createSnowflakeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');

        context.fillStyle = 'white';
        context.beginPath();
        context.arc(16, 16, 8, 0, Math.PI * 2);
        context.fill();

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    createDetailedHouses() {
        const housePositions = [
            { x: -15, z: -15 },
            { x: -8, z: -8 },
            { x: 0, z: -12 },
            { x: 8, z: -8 },
            { x: 15, z: -15 },
            { x: -12, z: 0 },
            { x: 12, z: 0 },
            { x: -15, z: 15 },
            { x: -8, z: 8 },
            { x: 0, z: 12 },
            { x: 8, z: 8 },
            { x: 15, z: 15 }
        ];

        housePositions.forEach(pos => {
            const houseLOD = new THREE.LOD();
            
            // High detail model (used when close)
            const highDetailHouse = this.createHouse(true);
            houseLOD.addLevel(highDetailHouse, 0);
            
            // Medium detail model (used at medium distance)
            const mediumDetailHouse = this.createHouse(false);
            houseLOD.addLevel(mediumDetailHouse, 50);  // Increased from 20 to 50
            
            // Low detail model (used when far away)
            const lowDetailHouse = this.createSimpleHouse();
            houseLOD.addLevel(lowDetailHouse, 100);    // Increased from 50 to 100
            
            houseLOD.position.set(pos.x, 0, pos.z);
            houseLOD.rotation.y = Math.random() * Math.PI * 2;
            houseLOD.updateMatrix();
            houseLOD.matrixAutoUpdate = false;
            
            this.houses.push(houseLOD);
            this.scene.add(houseLOD);
        });

        return this.scene;
    }

    createHouse(isHighDetail = true) {
        const house = new THREE.Group();
        const segments = isHighDetail ? 8 : 4;

        // Reuse materials
        const buildingMaterial = this.getMaterial('building', () => 
            new THREE.MeshStandardMaterial({
                color: 0xcc8866,
                roughness: 0.7,
                metalness: 0.1,
                flatShading: !isHighDetail
            })
        );

        const roofMaterial = this.getMaterial('roof', () =>
            new THREE.MeshStandardMaterial({
                color: 0x883333,
                roughness: 0.6,
                metalness: 0.1,
                flatShading: !isHighDetail
            })
        );

        // Hauptgebäude mit angepasster Detailstufe
        const buildingGeometry = new THREE.BoxGeometry(3, 3, 3, segments, segments, segments);
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = 1.5;
        building.castShadow = isHighDetail;
        building.receiveShadow = isHighDetail;
        house.add(building);

        // Dach mit angepasster Detailstufe
        const roofGeometry = new THREE.ConeGeometry(2.5, 2, isHighDetail ? 4 : 3);
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 3.5;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = isHighDetail;
        house.add(roof);

        if (isHighDetail) {
            // Details nur für hohe Detailstufe
            this.addHouseDetails(house);
        }

        return house;
    }

    createSimpleHouse() {
        // Sehr einfaches Hausmodell für große Entfernungen
        const house = new THREE.Group();

        // Kombiniertes Gebäude und Dach als einfacher Block
        const simpleGeometry = new THREE.BoxGeometry(3, 4, 3, 2, 2, 2);
        const simpleMaterial = new THREE.MeshBasicMaterial({
            color: 0xcc8866
        });
        const simpleHouse = new THREE.Mesh(simpleGeometry, simpleMaterial);
        simpleHouse.position.y = 2;
        house.add(simpleHouse);

        return house;
    }

    addHouseDetails(house) {
        // Schornstein
        const chimneyGeometry = new THREE.BoxGeometry(0.4, 1.5, 0.4);
        const chimneyMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.8,
            metalness: 0.2
        });
        const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
        chimney.position.set(0.8, 4, 0.8);
        chimney.castShadow = true;
        house.add(chimney);

        // Fenster
        const windowGeometry = new THREE.PlaneGeometry(0.6, 0.8);
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 0.5,
            side: THREE.DoubleSide
        });

        // Vorderes Fenster
        const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow.position.set(0, 1.5, 1.51);
        house.add(frontWindow);

        // Seitenfenster
        const sideWindow1 = frontWindow.clone();
        sideWindow1.position.set(1.51, 1.5, 0);
        sideWindow1.rotation.y = Math.PI / 2;
        house.add(sideWindow1);

        const sideWindow2 = frontWindow.clone();
        sideWindow2.position.set(-1.51, 1.5, 0);
        sideWindow2.rotation.y = Math.PI / 2;
        house.add(sideWindow2);

        // Tür
        const doorGeometry = new THREE.PlaneGeometry(1, 2);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x4d2926,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1, 1.51);
        house.add(door);

        // Schnee auf dem Dach
        const roofSnowGeometry = new THREE.ConeGeometry(2.3, 0.3, 4);
        const snowMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.1
        });
        const roofSnow = new THREE.Mesh(roofSnowGeometry, snowMaterial);
        roofSnow.position.y = 4;
        roofSnow.rotation.y = Math.PI / 4;
        house.add(roofSnow);

        // Schneeüberhang
        const overhangGeometry = new THREE.CylinderGeometry(2.2, 2.2, 0.1, 4);
        const overhang = new THREE.Mesh(overhangGeometry, snowMaterial);
        overhang.position.y = 3.8;
        overhang.rotation.y = Math.PI / 4;
        house.add(overhang);

        // Eiszapfen
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const radius = 2;
            const icicleHeight = Math.random() * 0.3 + 0.2;
            
            const icicleGeometry = new THREE.ConeGeometry(0.05, icicleHeight, 4);
            const icicle = new THREE.Mesh(icicleGeometry, new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                roughness: 0.2,
                metalness: 0.8
            }));
            
            icicle.position.set(
                Math.cos(angle) * radius,
                3.7 - icicleHeight / 2,
                Math.sin(angle) * radius
            );
            house.add(icicle);
        }

        // Weihnachtsbeleuchtung
        const lightColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
        const lightGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        
        for (let i = 0; i < 20; i++) {
            const lightMaterial = new THREE.MeshStandardMaterial({
                color: lightColors[i % lightColors.length],
                emissive: lightColors[i % lightColors.length],
                emissiveIntensity: 0.5
            });
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            
            const angle = (i / 20) * Math.PI * 2;
            const radius = 2;
            light.position.set(
                Math.cos(angle) * radius,
                3.6,
                Math.sin(angle) * radius
            );
            house.add(light);
        }
    }

    createDetailedTrees() {
        const treePositions = [];
        const numTrees = 50;
        const minDistance = 5;

        // Generate tree positions
        for (let i = 0; i < numTrees; i++) {
            let validPosition = false;
            let x, z;

            while (!validPosition) {
                x = (Math.random() - 0.5) * 90;
                z = (Math.random() - 0.5) * 90;
                validPosition = true;

                // Check minimum distance to houses
                for (const house of this.houses) {
                    const dx = x - house.position.x;
                    const dz = z - house.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    if (distance < minDistance) {
                        validPosition = false;
                        break;
                    }
                }

                // Check minimum distance to other trees
                for (const pos of treePositions) {
                    const dx = x - pos.x;
                    const dz = z - pos.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    if (distance < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
            }

            treePositions.push({ x, z });
        }

        // Create trees with LOD
        treePositions.forEach(pos => {
            const treeLOD = new THREE.LOD();
            
            // High detail tree
            const highDetailTree = this.createTree(true);
            treeLOD.addLevel(highDetailTree, 0);
            
            // Medium detail tree
            const mediumDetailTree = this.createTree(false);
            treeLOD.addLevel(mediumDetailTree, 60);    // Increased from 30 to 60
            
            // Low detail tree
            const lowDetailTree = this.createSimpleTree();
            treeLOD.addLevel(lowDetailTree, 120);      // Increased from 60 to 120
            
            treeLOD.position.set(pos.x, 0, pos.z);
            treeLOD.rotation.y = Math.random() * Math.PI * 2;
            treeLOD.updateMatrix();
            treeLOD.matrixAutoUpdate = false;
            
            this.scene.add(treeLOD);
        });

        return this.scene;
    }

    createTree(isHighDetail = true) {
        const tree = new THREE.Group();
        const segments = isHighDetail ? 8 : 4;

        // Reuse materials
        const trunkMaterial = this.getMaterial('trunk', () =>
            new THREE.MeshStandardMaterial({
                color: 0x4d2926,
                roughness: 0.8,
                metalness: 0.1,
                flatShading: !isHighDetail
            })
        );

        const needlesMaterial = this.getMaterial('needles', () =>
            new THREE.MeshStandardMaterial({
                color: 0x0d3d0d,
                roughness: 0.8,
                metalness: 0.1,
                flatShading: !isHighDetail
            })
        );

        const snowMaterial = this.getMaterial('snow', () =>
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.9,
                metalness: 0.1,
                flatShading: !isHighDetail
            })
        );

        // Rest of the tree creation code...
        // Use the cached materials instead of creating new ones
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1, segments);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 0.5;
        trunk.castShadow = isHighDetail;
        tree.add(trunk);

        const layers = isHighDetail ? 5 : 3;

        for (let i = 0; i < layers; i++) {
            const radius = 1.5 * (1 - i / layers);
            const height = 0.8;
            const needlesGeometry = new THREE.ConeGeometry(radius, height, segments);
            const needles = new THREE.Mesh(needlesGeometry, needlesMaterial);
            needles.position.y = 1 + i * 0.5;
            needles.castShadow = isHighDetail;
            tree.add(needles);

            if (isHighDetail) {
                const snowGeometry = new THREE.ConeGeometry(radius * 0.9, height * 0.2, segments);
                const snow = new THREE.Mesh(snowGeometry, snowMaterial);
                snow.position.y = 1.1 + i * 0.5;
                snow.castShadow = true;
                tree.add(snow);
            }
        }

        return tree;
    }

    createSimpleTree() {
        // Sehr einfaches Baummodell für große Entfernungen
        const tree = new THREE.Group();

        // Vereinfachter Stamm
        const trunkGeometry = new THREE.BoxGeometry(0.4, 1, 0.4);
        const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x4d2926 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 0.5;
        tree.add(trunk);

        // Vereinfachte Krone
        const crownGeometry = new THREE.ConeGeometry(1.5, 3, 4);
        const crownMaterial = new THREE.MeshBasicMaterial({ color: 0x0d3d0d });
        const crown = new THREE.Mesh(crownGeometry, crownMaterial);
        crown.position.y = 2.5;
        tree.add(crown);

        return tree;
    }

    createDecorations() {
        // Erstelle Schneemänner
        const snowmanPositions = [
            { x: -10, z: 0 },
            { x: 10, z: 0 },
            { x: 0, z: -10 },
            { x: 0, z: 10 }
        ];

        snowmanPositions.forEach(pos => {
            const snowman = this.createSnowman();
            snowman.position.set(pos.x, 0, pos.z);
            snowman.rotation.y = Math.random() * Math.PI * 2;
            this.scene.add(snowman);
        });

        return this.scene;
    }

    createSnowman() {
        const snowman = new THREE.Group();

        // Unterer Ball
        const bottomGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const snowMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.1
        });
        const bottom = new THREE.Mesh(bottomGeometry, snowMaterial);
        bottom.position.y = 0.8;
        bottom.castShadow = true;
        snowman.add(bottom);

        // Mittlerer Ball
        const middleGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const middle = new THREE.Mesh(middleGeometry, snowMaterial);
        middle.position.y = 2;
        middle.castShadow = true;
        snowman.add(middle);

        // Kopf
        const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const head = new THREE.Mesh(headGeometry, snowMaterial);
        head.position.y = 2.9;
        head.castShadow = true;
        snowman.add(head);

        // Nase (Karotte)
        const noseGeometry = new THREE.ConeGeometry(0.08, 0.3, 8);
        const noseMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            roughness: 0.7,
            metalness: 0.1
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 2.9, 0.4);
        nose.rotation.x = Math.PI / 2;
        nose.castShadow = true;
        snowman.add(nose);

        // Augen
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.7,
            metalness: 0.1
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 3, 0.3);
        snowman.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 3, 0.3);
        snowman.add(rightEye);

        // Knöpfe
        const buttonGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const buttonMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.7,
            metalness: 0.1
        });

        for (let i = 0; i < 3; i++) {
            const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
            button.position.set(0, 2.2 - i * 0.3, 0.6);
            snowman.add(button);
        }

        // Arme
        const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0x4d2926,
            roughness: 0.8,
            metalness: 0.1
        });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.8, 2.1, 0);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        snowman.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.8, 2.1, 0);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.castShadow = true;
        snowman.add(rightArm);

        return snowman;
    }

    createReindeers() {
        // Erstelle 8 Rentiere, die im Kreis um das Dorf herum platziert sind
        const numReindeers = 8;
        this.reindeers = [];

        for (let i = 0; i < numReindeers; i++) {
            const reindeer = this.createReindeer();
            const angle = (i / numReindeers) * Math.PI * 2;
            const radius = 30;

            reindeer.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );

            reindeer.rotation.y = angle + Math.PI;
            reindeer.userData.originalY = reindeer.position.y;
            reindeer.userData.bobSpeed = 1 + Math.random() * 0.5;
            reindeer.userData.bobHeight = 0.2 + Math.random() * 0.3;
            reindeer.userData.rotationSpeed = 0.5 + Math.random() * 0.5;

            this.reindeers.push(reindeer);
            this.scene.add(reindeer);
        }

        return this.scene;
    }

    createReindeer() {
        const reindeer = new THREE.Group();

        // Körper
        const bodyGeometry = new THREE.CapsuleGeometry(0.4, 0.8, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.7,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.2;
        body.rotation.x = -Math.PI / 6;
        body.castShadow = true;
        reindeer.add(body);

        // Kopf
        const headGeometry = new THREE.CapsuleGeometry(0.25, 0.5, 4, 8);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 1.8, 0.4);
        head.rotation.x = Math.PI / 4;
        head.castShadow = true;
        reindeer.add(head);

        // Geweih
        const antlerMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.1
        });

        const createAntler = (isLeft) => {
            const antlerGroup = new THREE.Group();
            const mainStem = new THREE.CylinderGeometry(0.03, 0.02, 0.5, 5);
            const mainAntler = new THREE.Mesh(mainStem, antlerMaterial);
            mainAntler.rotation.z = isLeft ? Math.PI / 4 : -Math.PI / 4;
            antlerGroup.add(mainAntler);

            // Zweige
            for (let i = 0; i < 3; i++) {
                const branch = new THREE.CylinderGeometry(0.02, 0.01, 0.3, 5);
                const branchMesh = new THREE.Mesh(branch, antlerMaterial);
                branchMesh.position.y = 0.1 + i * 0.15;
                branchMesh.rotation.z = isLeft ? -Math.PI / 3 : Math.PI / 3;
                antlerGroup.add(branchMesh);
            }

            return antlerGroup;
        };

        const leftAntler = createAntler(true);
        leftAntler.position.set(-0.2, 2, 0.3);
        reindeer.add(leftAntler);

        const rightAntler = createAntler(false);
        rightAntler.position.set(0.2, 2, 0.3);
        reindeer.add(rightAntler);

        // Beine
        const legGeometry = new THREE.CylinderGeometry(0.08, 0.05, 1, 5);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.7,
            metalness: 0.1
        });

        const createLeg = (x, z) => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(x, 0.6, z);
            leg.castShadow = true;
            return leg;
        };

        reindeer.add(createLeg(-0.3, -0.3)); // Vorderes linkes Bein
        reindeer.add(createLeg(0.3, -0.3));  // Vorderes rechtes Bein
        reindeer.add(createLeg(-0.3, 0.3));  // Hinteres linkes Bein
        reindeer.add(createLeg(0.3, 0.3));   // Hinteres rechtes Bein

        // Schwanz
        const tailGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const tailMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.7,
            metalness: 0.1
        });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 1.2, -0.5);
        tail.castShadow = true;
        reindeer.add(tail);

        // Nase
        const noseGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const noseMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.7,
            metalness: 0.1
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 1.8, 0.8);
        nose.castShadow = true;
        reindeer.add(nose);

        // Augen
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.7,
            metalness: 0.1
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 1.9, 0.6);
        reindeer.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 1.9, 0.6);
        reindeer.add(rightEye);

        return reindeer;
    }

    createNorthernLights() {
        // Erstelle eine große Halbkugel für die Nordlichter
        const skyRadius = 100;
        const auroraGeometry = new THREE.SphereGeometry(skyRadius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        
        // Shader Material für die Nordlichter
        const auroraMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(0x00ff00) }, // Grün
                color2: { value: new THREE.Color(0x0000ff) }  // Blau
            },
            vertexShader: `
                varying vec2 vUv;
                varying float vElevation;
                
                void main() {
                    vUv = uv;
                    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                    vElevation = modelPosition.y;
                    gl_Position = projectionMatrix * viewMatrix * modelPosition;
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color1;
                uniform vec3 color2;
                varying vec2 vUv;
                varying float vElevation;
                
                void main() {
                    float strength = sin(vUv.x * 10.0 + time) * 0.5 + 0.5;
                    strength *= sin(vUv.y * 5.0 + time * 0.5) * 0.5 + 0.5;
                    strength = smoothstep(0.0, 1.0, strength);
                    
                    vec3 mixedColor = mix(color1, color2, strength);
                    float alpha = smoothstep(0.0, 20.0, vElevation) * 0.3 * strength;
                    
                    gl_FragColor = vec4(mixedColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const aurora = new THREE.Mesh(auroraGeometry, auroraMaterial);
        aurora.rotation.x = Math.PI;
        aurora.position.y = -10;
        
        this.aurora = aurora;
        this.scene.add(aurora);

        // Füge einen sanften Farbverlauf am Himmel hinzu
        const skyGeometry = new THREE.SphereGeometry(skyRadius - 1, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0a0a2a) },    // Dunkelblau
                bottomColor: { value: new THREE.Color(0x1a1a3a) }  // Helleres Blau
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * viewMatrix * worldPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                varying vec3 vWorldPosition;
                
                void main() {
                    float h = normalize(vWorldPosition).y;
                    vec3 sky = mix(bottomColor, topColor, max(0.0, h));
                    gl_FragColor = vec4(sky, 1.0);
                }
            `,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        // Füge Sterne hinzu
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 1000;
        const starsPositions = new Float32Array(starsCount * 3);
        const starsSizes = new Float32Array(starsCount);

        for (let i = 0; i < starsCount; i++) {
            const i3 = i * 3;
            const radius = skyRadius - 2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI / 2;

            starsPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            starsPositions[i3 + 1] = radius * Math.cos(phi);
            starsPositions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

            starsSizes[i] = Math.random() * 2;
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(starsSizes, 1));

        const starsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                varying float vSize;
                uniform float time;
                
                void main() {
                    vSize = size;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * (sin(time + position.x) * 0.2 + 0.8);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying float vSize;
                
                void main() {
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
                    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.stars);

        return this.scene;
    }

    createFences() {
        const fenceGroup = new THREE.Group();
        const radius = 45; // Radius des Grundstücks
        const segments = 64; // Anzahl der Zaunabschnitte
        const angleStep = (Math.PI * 2) / segments;

        // Material für den Zaun
        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x4d2926,
            roughness: 0.8,
            metalness: 0.1
        });

        // Erstelle den Zaun in Segmenten
        for (let i = 0; i < segments; i++) {
            const angle = i * angleStep;
            const nextAngle = (i + 1) * angleStep;

            // Position des aktuellen und nächsten Pfostens
            const x1 = Math.cos(angle) * radius;
            const z1 = Math.sin(angle) * radius;
            const x2 = Math.cos(nextAngle) * radius;
            const z2 = Math.sin(nextAngle) * radius;

            // Erstelle Zaunpfosten
            const post = this.createFencePost();
            post.position.set(x1, 0, z1);
            post.lookAt(new THREE.Vector3(0, 0, 0));
            fenceGroup.add(post);

            // Erstelle horizontale Latten zwischen den Pfosten
            const distance = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
            const railGeometry = new THREE.BoxGeometry(distance, 0.1, 0.05);
            
            // Obere Latte
            const upperRail = new THREE.Mesh(railGeometry, woodMaterial);
            upperRail.position.set((x1 + x2) / 2, 1.2, (z1 + z2) / 2);
            upperRail.lookAt(new THREE.Vector3(x2, 1.2, z2));
            upperRail.castShadow = true;
            fenceGroup.add(upperRail);

            // Untere Latte
            const lowerRail = new THREE.Mesh(railGeometry, woodMaterial);
            lowerRail.position.set((x1 + x2) / 2, 0.7, (z1 + z2) / 2);
            lowerRail.lookAt(new THREE.Vector3(x2, 0.7, z2));
            lowerRail.castShadow = true;
            fenceGroup.add(lowerRail);

            // Vertikale Latten
            const numSlats = Math.floor(distance / 0.4); // Eine Latte alle 40cm
            for (let j = 1; j < numSlats; j++) {
                const t = j / numSlats;
                const slatX = x1 + (x2 - x1) * t;
                const slatZ = z1 + (z2 - z1) * t;

                const slat = this.createFenceSlat();
                slat.position.set(slatX, 0, slatZ);
                slat.lookAt(new THREE.Vector3(0, 0, 0));
                fenceGroup.add(slat);
            }

            // Füge Schnee auf den oberen Latten hinzu
            const snowGeometry = new THREE.BoxGeometry(distance, 0.05, 0.08);
            const snowMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.9,
                metalness: 0.1
            });
            const snow = new THREE.Mesh(snowGeometry, snowMaterial);
            snow.position.set((x1 + x2) / 2, 1.25, (z1 + z2) / 2);
            snow.lookAt(new THREE.Vector3(x2, 1.25, z2));
            snow.castShadow = true;
            fenceGroup.add(snow);
        }

        this.scene.add(fenceGroup);

        return this.scene;
    }

    createFencePost() {
        const post = new THREE.Group();

        // Hauptpfosten
        const postGeometry = new THREE.BoxGeometry(0.15, 1.5, 0.15);
        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x4d2926,
            roughness: 0.8,
            metalness: 0.1
        });
        const mainPost = new THREE.Mesh(postGeometry, woodMaterial);
        mainPost.position.y = 0.75;
        mainPost.castShadow = true;
        post.add(mainPost);

        // Spitze des Pfostens
        const capGeometry = new THREE.ConeGeometry(0.1, 0.2, 4);
        const cap = new THREE.Mesh(capGeometry, woodMaterial);
        cap.position.y = 1.6;
        cap.rotation.y = Math.PI / 4;
        cap.castShadow = true;
        post.add(cap);

        // Schnee auf der Spitze
        const snowGeometry = new THREE.ConeGeometry(0.08, 0.1, 4);
        const snowMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.1
        });
        const snow = new THREE.Mesh(snowGeometry, snowMaterial);
        snow.position.y = 1.65;
        snow.rotation.y = Math.PI / 4;
        snow.castShadow = true;
        post.add(snow);

        return post;
    }

    createFenceSlat() {
        const slat = new THREE.Group();

        // Hauptlatte
        const slatGeometry = new THREE.BoxGeometry(0.05, 1, 0.05);
        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x4d2926,
            roughness: 0.8,
            metalness: 0.1
        });
        const mainSlat = new THREE.Mesh(slatGeometry, woodMaterial);
        mainSlat.position.y = 0.95;
        mainSlat.castShadow = true;
        slat.add(mainSlat);

        // Spitze der Latte
        const tipGeometry = new THREE.ConeGeometry(0.04, 0.1, 4);
        const tip = new THREE.Mesh(tipGeometry, woodMaterial);
        tip.position.y = 1.5;
        tip.rotation.y = Math.PI / 4;
        tip.castShadow = true;
        slat.add(tip);

        // Schnee auf der Spitze
        const snowGeometry = new THREE.ConeGeometry(0.03, 0.05, 4);
        const snowMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.1
        });
        const snow = new THREE.Mesh(snowGeometry, snowMaterial);
        snow.position.y = 1.53;
        snow.rotation.y = Math.PI / 4;
        snow.castShadow = true;
        slat.add(snow);

        return slat;
    }

    createGifts() {
        // Erstelle Geschenke unter den Bäumen und um die Häuser herum
        const giftGroup = new THREE.Group();
        const giftPositions = [];

        // Sammle mögliche Positionen für Geschenke
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const position = object.position;
                const distance = Math.sqrt(position.x * position.x + position.z * position.z);
                
                // Platziere Geschenke in der Nähe von Objekten, aber nicht zu weit vom Zentrum entfernt
                if (distance < 40) {
                    const numGifts = Math.floor(Math.random() * 3) + 1; // 1-3 Geschenke pro Position
                    
                    for (let i = 0; i < numGifts; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const radius = Math.random() * 2 + 1;
                        
                        giftPositions.push({
                            x: position.x + Math.cos(angle) * radius,
                            z: position.z + Math.sin(angle) * radius
                        });
                    }
                }
            }
        });

        // Erstelle Geschenke an den gesammelten Positionen
        giftPositions.forEach(pos => {
            const gift = this.createGift();
            gift.position.set(pos.x, 0.2, pos.z);
            gift.rotation.y = Math.random() * Math.PI * 2;
            giftGroup.add(gift);
        });

        this.scene.add(giftGroup);

        return this.scene;
    }

    createGift() {
        const gift = new THREE.Group();

        // Zufällige Größe und Farbe für das Geschenk
        const size = {
            width: 0.3 + Math.random() * 0.4,
            height: 0.3 + Math.random() * 0.4,
            depth: 0.3 + Math.random() * 0.4
        };

        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xffff00, 0x00ffff];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Geschenkbox
        const boxGeometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
        const boxMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.5,
            metalness: 0.1
        });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.castShadow = true;
        gift.add(box);

        // Geschenkband (vertikal)
        const ribbonWidth = 0.05;
        const verticalRibbonGeometry = new THREE.BoxGeometry(
            ribbonWidth,
            size.height + 0.02,
            size.depth + 0.02
        );
        const ribbonMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.3
        });
        const verticalRibbon = new THREE.Mesh(verticalRibbonGeometry, ribbonMaterial);
        verticalRibbon.castShadow = true;
        gift.add(verticalRibbon);

        // Geschenkband (horizontal)
        const horizontalRibbonGeometry = new THREE.BoxGeometry(
            size.width + 0.02,
            size.height + 0.02,
            ribbonWidth
        );
        const horizontalRibbon = new THREE.Mesh(horizontalRibbonGeometry, ribbonMaterial);
        horizontalRibbon.castShadow = true;
        gift.add(horizontalRibbon);

        // Schleife oben
        const bowSize = 0.15;
        const bowGeometry = new THREE.TorusGeometry(bowSize, bowSize / 4, 8, 12);
        const bowMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.3
        });

        // Erste Schleife
        const bow1 = new THREE.Mesh(bowGeometry, bowMaterial);
        bow1.position.y = size.height / 2 + bowSize;
        bow1.rotation.x = Math.PI / 2;
        bow1.castShadow = true;
        gift.add(bow1);

        // Zweite Schleife (90 Grad gedreht)
        const bow2 = bow1.clone();
        bow2.rotation.y = Math.PI / 2;
        gift.add(bow2);

        // Mittelpunkt der Schleife
        const bowCenterGeometry = new THREE.SphereGeometry(bowSize / 2, 8, 8);
        const bowCenter = new THREE.Mesh(bowCenterGeometry, bowMaterial);
        bowCenter.position.y = size.height / 2 + bowSize;
        bowCenter.castShadow = true;
        gift.add(bowCenter);

        // Füge zufällige Rotation und Animation hinzu
        gift.userData.originalY = gift.position.y;
        gift.userData.bobSpeed = 0.5 + Math.random() * 0.5;
        gift.userData.bobHeight = 0.05 + Math.random() * 0.05;
        gift.userData.rotationSpeed = 0.2 + Math.random() * 0.3;

        return gift;
    }

    createIcicles() {
        // Erstelle Eiszapfen an den Häusern und am Zaun
        this.scene.traverse((object) => {
            // Füge Eiszapfen an horizontalen Kanten hinzu
            if (object instanceof THREE.Mesh) {
                let isValidObject = false;
                
                // Prüfe, ob das Objekt ein gültiges Material und eine Farbe hat
                if (object.material) {
                    if (object.name === 'roof' || object.name === 'upperRail') {
                        isValidObject = true;
                    } else if (object.material.color) {
                        const color = object.material.color.getHex();
                        isValidObject = (color === 0x883333 || color === 0x4d2926);
                    }
                }

                if (isValidObject) {
                    const boundingBox = new THREE.Box3().setFromObject(object);
                    const width = boundingBox.max.x - boundingBox.min.x;
                    const depth = boundingBox.max.z - boundingBox.min.z;
                    const bottom = boundingBox.min.y;

                    // Erstelle Eiszapfen entlang der Kanten
                    const numIcicles = Math.floor((width + depth) / 0.2); // Ein Eiszapfen alle 20cm
                    for (let i = 0; i < numIcicles; i++) {
                        const icicle = this.createIcicle();
                        
                        // Positioniere Eiszapfen zufällig entlang der Kanten
                        let x, z;
                        if (Math.random() < width / (width + depth)) {
                            // Platziere auf der X-Achse
                            x = boundingBox.min.x + Math.random() * width;
                            z = Math.random() < 0.5 ? boundingBox.min.z : boundingBox.max.z;
                        } else {
                            // Platziere auf der Z-Achse
                            x = Math.random() < 0.5 ? boundingBox.min.x : boundingBox.max.x;
                            z = boundingBox.min.z + Math.random() * depth;
                        }

                        icicle.position.set(x, bottom, z);
                        this.scene.add(icicle);
                    }
                }
            }
        });

        return this.scene;
    }

    createIcicle() {
        const icicle = new THREE.Group();

        // Zufällige Größe für den Eiszapfen
        const height = 0.2 + Math.random() * 0.3;
        const radius = 0.03 + Math.random() * 0.02;

        // Hauptkörper des Eiszapfens
        const icicleGeometry = new THREE.ConeGeometry(radius, height, 8);
        const icicleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            roughness: 0.2,
            metalness: 0.8
        });
        const icicleMesh = new THREE.Mesh(icicleGeometry, icicleMaterial);
        icicleMesh.rotation.x = Math.PI; // Drehe den Eiszapfen um
        icicleMesh.position.y = -height / 2;
        icicleMesh.castShadow = true;

        // Füge inneren Glanz hinzu
        const innerGeometry = new THREE.ConeGeometry(radius * 0.6, height * 0.9, 8);
        const innerMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            roughness: 0.1,
            metalness: 0.9
        });
        const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
        innerMesh.rotation.x = Math.PI;
        innerMesh.position.y = -height / 2;

        // Füge Spitzeneffekt hinzu
        const tipGeometry = new THREE.ConeGeometry(radius * 0.2, height * 0.1, 8);
        const tipMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95,
            roughness: 0.1,
            metalness: 1.0
        });
        const tipMesh = new THREE.Mesh(tipGeometry, tipMaterial);
        tipMesh.rotation.x = Math.PI;
        tipMesh.position.y = -height;

        icicle.add(icicleMesh);
        icicle.add(innerMesh);
        icicle.add(tipMesh);

        // Füge leichte Rotation hinzu
        icicle.rotation.y = Math.random() * Math.PI * 2;
        icicle.rotation.z = (Math.random() - 0.5) * 0.2; // Leichte Neigung

        // Füge Animation hinzu
        icicle.userData.meltSpeed = 0.1 + Math.random() * 0.2;
        icicle.userData.originalScale = 1;
        icicle.userData.minScale = 0.8 + Math.random() * 0.1;

        return icicle;
    }

    createParticleSystems() {
        // Reduziere die Anzahl der Partikel im Rauch
        this.chimneySmoke = [];
        this.scene.traverse((object) => {
            if (object.name === 'chimneySnow') {
                const smokeSystem = this.createSmokeSystem();
                smokeSystem.position.copy(object.position);
                smokeSystem.position.y -= 0.2;
                this.chimneySmoke.push(smokeSystem);
                this.scene.add(smokeSystem);
            }
        });

        // Reduziere die Anzahl der Glühwürmchen
        this.createFireflies();

        // Reduziere die Dichte des Bodennebels
        this.createGroundMist();

        return this.scene;
    }

    createSmokeSystem() {
        // Reduziere die Anzahl der Rauchpartikel von 50 auf 20
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const lifetimes = new Float32Array(particleCount);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.1;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

            velocities[i * 3] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 1] = Math.random() * 0.05 + 0.05;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

            lifetimes[i] = Math.random();
            sizes[i] = Math.random() * 0.5 + 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: 0x888888,
            size: 0.2,
            transparent: true,
            opacity: 0.4,
            map: this.createSmokeTexture(),
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const particles = new THREE.Points(geometry, material);
        particles.userData.velocities = velocities;
        particles.userData.lifetimes = lifetimes;

        return particles;
    }

    createSmokeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');

        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    createFireflies() {
        // Reduce number of fireflies from 50 to 20
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        const color = new THREE.Color(0xffeb3b);

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 30;
            const height = Math.random() * 5 + 1;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            color.toArray(colors, i * 3);
            sizes[i] = Math.random() * 0.2 + 0.1;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.fireflies = new THREE.Points(geometry, material);
        this.scene.add(this.fireflies);
    }

    createGroundMist() {
        // Reduce number of mist particles from 200 to 100
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 40;
            const height = Math.random() * 0.5;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            velocities[i * 3] = (Math.random() - 0.5) * 0.01;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.001;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

            sizes[i] = Math.random() * 2 + 1;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 1,
            transparent: true,
            opacity: 0.3,
            color: 0xcccccc,
            map: this.createSmokeTexture(),
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.groundMist = new THREE.Points(geometry, material);
        this.scene.add(this.groundMist);
    }

    updateParticleSystems(deltaTime) {
        // Update Chimney Smoke
        if (this.chimneySmoke && this.chimneySmoke.length > 0) {
            this.chimneySmoke.forEach(smoke => {
                const positions = smoke.geometry.attributes.position.array;
                const velocities = smoke.userData.velocities;
                const lifetimes = smoke.userData.lifetimes;

                for (let i = 0; i < positions.length; i += 3) {
                    const idx = i / 3;
                    lifetimes[idx] += deltaTime;

                    if (lifetimes[idx] >= 1) {
                        positions[i] = (Math.random() - 0.5) * 0.1;
                        positions[i + 1] = 0;
                        positions[i + 2] = (Math.random() - 0.5) * 0.1;
                        lifetimes[idx] = 0;
                    } else {
                        positions[i] += velocities[i] * deltaTime;
                        positions[i + 1] += velocities[i + 1] * deltaTime;
                        positions[i + 2] += velocities[i + 2] * deltaTime;
                    }
                }

                smoke.geometry.attributes.position.needsUpdate = true;
            });
        }

        // Update Fireflies
        if (this.fireflies) {
            const positions = this.fireflies.geometry.attributes.position.array;
            const sizes = this.fireflies.geometry.attributes.size.array;
            const time = this.clock.getElapsedTime();

            for (let i = 0; i < positions.length; i += 3) {
                const idx = i / 3;
                // Flackernde Größe
                sizes[idx] = (Math.sin(time * 2 + idx) * 0.1 + 0.2) * (Math.random() * 0.2 + 0.9);
                // Leichte Bewegung
                positions[i + 1] += Math.sin(time + idx) * 0.002;
            }

            this.fireflies.geometry.attributes.size.needsUpdate = true;
            this.fireflies.geometry.attributes.position.needsUpdate = true;
        }

        // Update Ground Mist
        if (this.groundMist) {
            const positions = this.groundMist.geometry.attributes.position.array;
            const velocities = this.groundMist.geometry.attributes.velocity.array;
            const time = this.clock.getElapsedTime();

            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i];
                positions[i + 1] += Math.sin(time + i) * 0.001;
                positions[i + 2] += velocities[i + 2];

                // Halte die Nebelschwaden im Bereich
                const radius = Math.sqrt(positions[i] * positions[i] + positions[i + 2] * positions[i + 2]);
                if (radius > 40) {
                    const angle = Math.atan2(positions[i + 2], positions[i]);
                    positions[i] = Math.cos(angle) * 40;
                    positions[i + 2] = Math.sin(angle) * 40;
                }
            }

            this.groundMist.geometry.attributes.position.needsUpdate = true;
        }
    }

    setupAudio() {
        try {
            // Erstelle einen Button für die Audio-Initialisierung
            const audioInitButton = document.createElement('button');
            audioInitButton.textContent = '🔇 Start Audio';
            audioInitButton.style.position = 'absolute';
            audioInitButton.style.top = '10px';
            audioInitButton.style.right = '10px';
            audioInitButton.style.padding = '8px';
            audioInitButton.style.borderRadius = '4px';
            audioInitButton.style.border = 'none';
            audioInitButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            audioInitButton.style.color = 'white';
            audioInitButton.style.cursor = 'pointer';
            document.body.appendChild(audioInitButton);

            audioInitButton.addEventListener('click', () => {
                // Initialisiere Audio nach Benutzerinteraktion
                this.initializeAudio();
                audioInitButton.textContent = '🔊';
            });
        } catch (error) {
            console.error('Error setting up audio:', error);
        }
    }

    initializeAudio() {
        const audioLoader = new THREE.AudioLoader();

        // Hintergrundmusik
        const bgMusic = new THREE.Audio(this.audioListener);
        audioLoader.load('https://cdn.freesound.org/previews/573/573660_5674468-lq.mp3', (buffer) => {
            bgMusic.setBuffer(buffer);
            bgMusic.setLoop(true);
            bgMusic.setVolume(0.3);
            this.audioSources.set('background', bgMusic);
            bgMusic.play();
        });

        // Windgeräusche
        const windSound = new THREE.Audio(this.audioListener);
        audioLoader.load('https://cdn.freesound.org/previews/231/231438_3908940-lq.mp3', (buffer) => {
            windSound.setBuffer(buffer);
            windSound.setLoop(true);
            windSound.setVolume(0.2);
            this.audioSources.set('wind', windSound);
            windSound.play();
        });

        // Glockengeläut
        const bellSound = new THREE.PositionalAudio(this.audioListener);
        audioLoader.load('https://cdn.freesound.org/previews/378/378290_7094838-lq.mp3', (buffer) => {
            bellSound.setBuffer(buffer);
            bellSound.setRefDistance(20);
            bellSound.setLoop(true);
            bellSound.setVolume(0.5);
            this.audioSources.set('bells', bellSound);
            bellSound.play();
        });

        // Wichtel-Geräusche
        const elfSound = new THREE.PositionalAudio(this.audioListener);
        audioLoader.load('https://cdn.freesound.org/previews/411/411090_5121236-lq.mp3', (buffer) => {
            elfSound.setBuffer(buffer);
            elfSound.setRefDistance(5);
            elfSound.setVolume(0.4);
            this.audioSources.set('elves', elfSound);
        });
    }

    toggleAudio() {
        const button = document.getElementById('toggle-audio');
        if (!button) return;

        const isMuted = this.audioListener.getMasterVolume() === 0;

        if (isMuted) {
            this.audioListener.setMasterVolume(this.lastVolume || 1);
            button.textContent = '🔊';
        } else {
            this.lastVolume = this.audioListener.getMasterVolume();
            this.audioListener.setMasterVolume(0);
            button.textContent = '🔇';
        }
    }

    updateVolume(value) {
        const volume = value / 100;
        this.audioListener.setMasterVolume(volume);
        
        const button = document.getElementById('toggle-audio');
        if (button) {
            button.textContent = volume === 0 ? '🔇' : '🔊';
        }
    }

    playRandomElfSound() {
        if (Math.random() < 0.01) { // 1% Chance pro Frame
            const elfSound = this.audioSources.get('elves');
            if (elfSound && !elfSound.isPlaying) {
                elfSound.play();
            }
        }
    }

    updateAudio() {
        // Passe Windgeräusch-Lautstärke basierend auf Kamerahöhe an
        const windSound = this.audioSources.get('wind');
        if (windSound) {
            const height = this.camera.position.y;
            const maxHeight = 50;
            const volume = Math.min(height / maxHeight, 1) * 0.3;
            windSound.setVolume(volume);
        }

        // Spiele zufällige Wichtel-Geräusche
        this.playRandomElfSound();

        // Aktualisiere die Position der Glocken
        const bellSound = this.audioSources.get('bells');
        if (bellSound && this.houses.length > 0) {
            const centerHouse = this.houses[Math.floor(this.houses.length / 2)];
            bellSound.position.copy(centerHouse.position);
        }
    }

    animate() {
        this.performanceMonitor.beginFrame();

        const deltaTime = this.clock.getDelta();
        const time = this.clock.getElapsedTime();
        
        // Use RAF with proper timing and frame limiting
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Target 60 FPS (16.67ms per frame)
        const targetFPS = 60;
        const frameTime = 1000 / targetFPS;
        const currentTime = performance.now();
        
        if (!this.lastFrameTime || currentTime - this.lastFrameTime >= frameTime) {
            this.lastFrameTime = currentTime;
            
            // Update Tween Animationen
            update();

            // Always animate snow (removed from frame skipping)
            this.animateSnow();

            // Update scene matrix only when needed
            if (this.scene.matrixWorldNeedsUpdate) {
                this.scene.updateMatrixWorld();
            }

            // Update LOD based on camera position - only if camera moved
            if (this.camera.matrixWorldNeedsUpdate) {
                THREE.LOD.updateMatrix = false;
                
                // Batch LOD updates
                const lodObjects = [];
                this.scene.traverse((object) => {
                    if (object instanceof THREE.LOD) {
                        lodObjects.push(object);
                    }
                });
                
                // Update LODs in batch
                lodObjects.forEach(object => {
                    object.update(this.camera);
                });

                this.camera.updateMatrixWorld();
                this.camera.matrixWorldNeedsUpdate = false;
            }

            // Optimize updates by using frame skipping for less important animations
            const frameSkip = time % 2 < deltaTime; // Only update every other frame

            if (frameSkip) {
                // Batch update particle systems and less important animations
                Promise.resolve().then(() => {
                    this.updateParticleSystems(deltaTime * 2);
                    this.updateSnow();
                    if (this.audioListener) {
                        this.updateAudio();
                    }
                });
            }

            // Always update important animations
            this.controls.update();
            this.animateCharacters();
            
            // Update scene before rendering
            this.scene.updateMatrixWorld();
            
            // Render Scene
            this.renderer.render(this.scene, this.camera);
            
            // Reset renderer info
            this.renderer.info.reset();
        }
        
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        this.performanceMonitor.endFrame();
    }

    updateObject(object, deltaTime, time) {
        // Optimierte Objekt-Updates
        if (object.userData.swayOffset !== undefined) {
            object.rotation.z = Math.sin(time * object.userData.swaySpeed + object.userData.swayOffset) * 0.05;
        }
        
        if (object.userData.bobSpeed !== undefined) {
            object.position.y = object.userData.originalY + 
                Math.sin(time * object.userData.bobSpeed) * object.userData.bobHeight;
            if (object.userData.rotationSpeed !== undefined) {
                object.rotation.y += deltaTime * object.userData.rotationSpeed;
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animateSnow() {
        if (this.snow) {
            const positions = this.snow.geometry.attributes.position.array;
            const velocities = this.snow.userData.velocities;
            const time = this.clock.getElapsedTime();

            for (let i = 0; i < positions.length; i += 3) {
                // Add some wind effect
                const windX = Math.sin(time * 0.5) * 0.1;
                const windZ = Math.cos(time * 0.3) * 0.1;

                // Update positions with wind effect
                positions[i] += velocities[i] + windX;
                positions[i + 1] += velocities[i + 1];
                positions[i + 2] += velocities[i + 2] + windZ;

                // Reset snowflake if it falls below ground
                if (positions[i + 1] < 0) {
                    positions[i] = (Math.random() - 0.5) * 120;  // Reset to random x
                    positions[i + 1] = 80;                       // Reset to max height
                    positions[i + 2] = (Math.random() - 0.5) * 120;  // Reset to random z
                    
                    // Reset velocities for variety
                    velocities[i] = (Math.random() - 0.5) * 0.2;
                    velocities[i + 1] = -Math.random() * 0.3 - 0.2;
                    velocities[i + 2] = (Math.random() - 0.5) * 0.2;
                }

                // Wrap around edges with larger bounds
                if (positions[i] > 60) positions[i] = -60;
                if (positions[i] < -60) positions[i] = 60;
                if (positions[i + 2] > 60) positions[i + 2] = -60;
                if (positions[i + 2] < -60) positions[i + 2] = 60;
            }

            this.snow.geometry.attributes.position.needsUpdate = true;
        }
    }

    animateCharacters() {
        const time = this.clock.getElapsedTime();

        // Animiere Wichtel
        this.elves.forEach(elf => {
            const path = elf.userData.path;
            let pathIndex = elf.userData.pathIndex;
            const moveSpeed = elf.userData.moveSpeed;

            const currentPoint = path[pathIndex];
            const nextPoint = path[(pathIndex + 1) % path.length];

            // Bewege zum nächsten Punkt
            const direction = nextPoint.clone().sub(currentPoint);
            const distance = direction.length();
            direction.normalize();

            elf.position.add(direction.multiplyScalar(moveSpeed));

            // Drehe in Bewegungsrichtung
            elf.lookAt(nextPoint);

            // Animiere Arme und Beine
            const leftArm = elf.children[3];
            const rightArm = elf.children[4];
            const leftLeg = elf.children[5];
            const rightLeg = elf.children[6];

            leftArm.rotation.x = Math.sin(time * 5) * 0.5;
            rightArm.rotation.x = -Math.sin(time * 5) * 0.5;
            leftLeg.rotation.x = -Math.sin(time * 5) * 0.5;
            rightLeg.rotation.x = Math.sin(time * 5) * 0.5;

            // Prüfe, ob der nächste Punkt erreicht wurde
            if (elf.position.distanceTo(nextPoint) < 0.1) {
                elf.userData.pathIndex = (pathIndex + 1) % path.length;
            }
        });

        // Animiere Weihnachtsmann
        if (this.santa) {
            const path = this.santa.userData.path;
            let pathIndex = this.santa.userData.pathIndex;
            const moveSpeed = this.santa.userData.moveSpeed;

            const currentPoint = path[pathIndex];
            const nextPoint = path[(pathIndex + 1) % path.length];

            // Bewege zum nächsten Punkt
            const direction = nextPoint.clone().sub(currentPoint);
            const distance = direction.length();
            direction.normalize();

            this.santa.position.add(direction.multiplyScalar(moveSpeed));

            // Drehe in Bewegungsrichtung
            this.santa.lookAt(nextPoint);

            // Animiere Arme und Beine
            const leftArm = this.santa.children[6];
            const rightArm = this.santa.children[7];
            const leftLeg = this.santa.children[8];
            const rightLeg = this.santa.children[9];

            leftArm.rotation.x = Math.sin(time * 4) * 0.3;
            rightArm.rotation.x = -Math.sin(time * 4) * 0.3;
            leftLeg.rotation.x = -Math.sin(time * 4) * 0.3;
            rightLeg.rotation.x = Math.sin(time * 4) * 0.3;

            // Prüfe, ob der nächste Punkt erreicht wurde
            if (this.santa.position.distanceTo(nextPoint) < 0.1) {
                this.santa.userData.pathIndex = (pathIndex + 1) % path.length;
            }
        }
    }

    resetCamera() {
        // Animiere die Kamera zurück zur Ausgangsposition
        const currentPosition = this.camera.position.clone();
        const currentTarget = new THREE.Vector3();
        this.controls.target.clone(currentTarget);

        const targetPosition = new THREE.Vector3(20, 20, 20);
        const targetTarget = new THREE.Vector3(0, 0, 0);

        new Tween(currentPosition)
            .to(targetPosition, 1000)
            .easing(Easing.Quadratic.InOut)
            .onUpdate(() => {
                this.camera.position.copy(currentPosition);
            })
            .start();

        new Tween(currentTarget)
            .to(targetTarget, 1000)
            .easing(Easing.Quadratic.InOut)
            .onUpdate(() => {
                this.controls.target.copy(currentTarget);
            })
            .start();
    }

    createElves() {
        // Erstelle 8 Wichtel mit individuellen Pfaden
        for (let i = 0; i < 8; i++) {
            const elf = this.createElf();
            const radius = 15 + Math.random() * 10;
            const startAngle = (i / 8) * Math.PI * 2;
            
            elf.position.set(
                Math.cos(startAngle) * radius,
                0,
                Math.sin(startAngle) * radius
            );
            
            elf.userData.path = this.generateRandomPath();
            elf.userData.pathIndex = 0;
            elf.userData.moveSpeed = 0.02 + Math.random() * 0.02;
            
            this.elves.push(elf);
            this.scene.add(elf);
        }

        return this.scene;
    }

    createElf() {
        const elf = new THREE.Group();

        // Körper
        const bodyGeometry = new THREE.CapsuleGeometry(0.2, 0.4, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x22cc22,
            roughness: 0.7,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        elf.add(body);

        // Kopf
        const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xffccaa,
            roughness: 0.7,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1;
        head.castShadow = true;
        elf.add(head);

        // Mütze
        const hatGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
        const hatMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            roughness: 0.7,
            metalness: 0.1
        });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.y = 1.3;
        hat.castShadow = true;
        elf.add(hat);

        // Arme
        const armGeometry = new THREE.CapsuleGeometry(0.05, 0.3, 4, 8);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0x22cc22,
            roughness: 0.7,
            metalness: 0.1
        });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.25, 0.7, 0);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        elf.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.25, 0.7, 0);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.castShadow = true;
        elf.add(rightArm);

        // Beine
        const legGeometry = new THREE.CapsuleGeometry(0.05, 0.3, 4, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x22cc22,
            roughness: 0.7,
            metalness: 0.1
        });

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.1, 0.2, 0);
        leftLeg.castShadow = true;
        elf.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.1, 0.2, 0);
        rightLeg.castShadow = true;
        elf.add(rightLeg);

        return elf;
    }

    createSanta() {
        const santa = new THREE.Group();

        // Körper
        const bodyGeometry = new THREE.CapsuleGeometry(0.4, 0.8, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            roughness: 0.7,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.8;
        body.castShadow = true;
        santa.add(body);

        // Kopf
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xffccaa,
            roughness: 0.7,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.7;
        head.castShadow = true;
        santa.add(head);

        // Bart
        const beardGeometry = new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const beardMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.1
        });
        const beard = new THREE.Mesh(beardGeometry, beardMaterial);
        beard.position.y = 1.6;
        beard.position.z = 0.1;
        beard.castShadow = true;
        santa.add(beard);

        // Mütze
        const hatGeometry = new THREE.ConeGeometry(0.3, 0.6, 8);
        const hatMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            roughness: 0.7,
            metalness: 0.1
        });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.y = 2.1;
        hat.castShadow = true;
        santa.add(hat);

        // Bommel
        const pomPomGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const pomPomMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.1
        });
        const pomPom = new THREE.Mesh(pomPomGeometry, pomPomMaterial);
        pomPom.position.y = 2.4;
        pomPom.castShadow = true;
        santa.add(pomPom);

        // Arme
        const armGeometry = new THREE.CapsuleGeometry(0.1, 0.6, 4, 8);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            roughness: 0.7,
            metalness: 0.1
        });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.5, 1.2, 0);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        santa.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.5, 1.2, 0);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.castShadow = true;
        santa.add(rightArm);

        // Beine
        const legGeometry = new THREE.CapsuleGeometry(0.1, 0.6, 4, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.7,
            metalness: 0.1
        });

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, 0.3, 0);
        leftLeg.castShadow = true;
        santa.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, 0.3, 0);
        rightLeg.castShadow = true;
        santa.add(rightLeg);

        // Gürtel
        const beltGeometry = new THREE.TorusGeometry(0.4, 0.05, 8, 16);
        const beltMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.7,
            metalness: 0.1
        });
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        belt.position.y = 0.8;
        belt.rotation.x = Math.PI / 2;
        belt.castShadow = true;
        santa.add(belt);

        // Schnalle
        const buckleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.05);
        const buckleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            roughness: 0.3,
            metalness: 0.8
        });
        const buckle = new THREE.Mesh(buckleGeometry, buckleMaterial);
        buckle.position.set(0, 0.8, 0.4);
        buckle.castShadow = true;
        santa.add(buckle);

        // Sack
        const bagGeometry = new THREE.SphereGeometry(0.4, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.7);
        const bagMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.1
        });
        const bag = new THREE.Mesh(bagGeometry, bagMaterial);
        bag.position.set(-0.5, 1.2, -0.2);
        bag.rotation.z = Math.PI / 6;
        bag.castShadow = true;
        santa.add(bag);

        // Initialisiere den Pfad
        santa.userData.path = this.generateRandomPath();
        santa.userData.pathIndex = 0;
        santa.userData.moveSpeed = 0.03;

        this.santa = santa;
        this.scene.add(santa);

        return this.scene;
    }

    generateRandomPath() {
        const path = [];
        const numPoints = 10;
        const radius = 20;

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const x = Math.cos(angle) * radius * (0.8 + Math.random() * 0.4);
            const z = Math.sin(angle) * radius * (0.8 + Math.random() * 0.4);
            path.push(new THREE.Vector3(x, 0, z));
        }

        // Schließe den Pfad
        path.push(path[0].clone());

        return path;
    }

    updateSnow() {
        // Update existing snow accumulation
        this.snowAccumulationGroup.children.forEach((drift) => {
            // Occasionally grow existing drifts
            if (Math.random() < 0.01) { // 1% chance per frame
                if (drift.scale.y < drift.userData.maxHeight) {
                    drift.scale.y += drift.userData.growthRate;
                    drift.scale.x += drift.userData.growthRate * 0.5;
                    drift.scale.z += drift.userData.growthRate * 0.5;
                    drift.position.y = drift.geometry.parameters.height * drift.scale.y / 2;
                }
            }
        });

        // Update falling snow
        if (this.snow) {
            const positions = this.snow.geometry.attributes.position.array;
            const velocities = this.snow.userData.velocities;

            for (let i = 0; i < positions.length; i += 3) {
                if (positions[i + 1] <= 0) {
                    // Add to snow cover when hitting ground
                    this.addToSnowCover(positions[i], positions[i + 2]);
                    
                    // Reset snowflake position
                    positions[i] = (Math.random() - 0.5) * 100;
                    positions[i + 1] = 50;
                    positions[i + 2] = (Math.random() - 0.5) * 100;
                    
                    // Reset velocities
                    velocities[i] = (Math.random() - 0.5) * 0.1;
                    velocities[i + 1] = -Math.random() * 0.5 - 0.1;
                    velocities[i + 2] = (Math.random() - 0.5) * 0.1;
                }
            }

            this.snow.geometry.attributes.position.needsUpdate = true;
        }
    }
}

// Initialisiere die Anwendung
const christmasVillage = new ChristmasVillage(); 