import * as THREE from "https://esm.sh/three@0.136.0";
import { OrbitControls } from "https://esm.sh/three@0.136.0/examples/jsm/controls/OrbitControls.js";

const isMobile = window.innerWidth < 768;
const PARTICLE_COUNT = isMobile ? 30000 : 100000;
const CENTER_COUNT = Math.floor(PARTICLE_COUNT * 0.5);
const MODE = {
    GALAXY: 0,
    FIST: 1,
    IMAGES: 2
};

let currentMode = MODE.GALAXY;
let lerpFactor = 0;
let targetLerp = 0;
let targetRotationY = 0;
let currentRotationY = 0;
let autoRotationAngle = 0;

const imagePaths = [];
for (let i = 1; i <= 29; i++) {
    imagePaths.push(`style/img/Anh (${i}).jpg`);
}


let scene = new THREE.Scene();
scene.background = new THREE.Color('#160016');
let camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 3, isMobile ? 40 : 30);

let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

let gu = null;

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (gu && gu.uTargetSize) {
        gu.uTargetSize.value = Math.min(window.innerWidth, window.innerHeight) * 0.95;
    }
});

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.1;

let pts = [];
let sizes = [];
let shift = [];
let targetPositions = [];
let colors = [];
let particleData = [];

function initGalaxy() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        let p;
        if (i < CENTER_COUNT) {
            p = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.5 + 9.5);
        } else {
            let r = 5, R = 25;
            let rand = Math.pow(Math.random(), 1.5);
            let radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
            p = new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 2);
        }
        pts.push(p);
        particleData.push(p.clone());
        targetPositions.push(p.x, p.y, p.z);
        sizes.push(Math.random() * 1.5 + 0.5);
        shift.push(
            Math.random() * Math.PI,
            Math.random() * Math.PI * 2,
            (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
            Math.random() * 0.9 + 0.1
        );
    }
}
initGalaxy();

const atlasSize = 2048;
const atlasCanvas = document.createElement('canvas');
let loadedCount = 0;
atlasCanvas.width = atlasSize;
atlasCanvas.height = atlasSize;
const ctx = atlasCanvas.getContext('2d');
const imgSize = atlasSize / 4;

const textureIndices = new Float32Array(PARTICLE_COUNT);
const randomVals = new Float32Array(PARTICLE_COUNT);
const isCenter = new Float32Array(PARTICLE_COUNT);
const pIndices = new Float32Array(PARTICLE_COUNT);
const aspects = new Float32Array(PARTICLE_COUNT).fill(1.0);
const customRotations = new Float32Array(PARTICLE_COUNT);
const rotationSpeeds = new Float32Array(PARTICLE_COUNT);
const isGalaxyImage = new Float32Array(PARTICLE_COUNT);
const isStar = new Float32Array(PARTICLE_COUNT);
const imageParticleIndices = [];

for (let i = 0; i < PARTICLE_COUNT; i++) {
    textureIndices[i] = Math.floor(Math.random() * 18);
    randomVals[i] = Math.random();
    isCenter[i] = i < CENTER_COUNT ? 1.0 : 0.0;
    pIndices[i] = i;

    if (isCenter[i] < 0.5 && randomVals[i] < 0.005) {
        imageParticleIndices.push(i);
        customRotations[i] = (Math.random() - 0.5) * 0.8;
        rotationSpeeds[i] = Math.random() < 0.4 ? (Math.random() - 0.5) * 1.2 : 0.0;

        if (randomVals[i] < 0.001) {
            isGalaxyImage[i] = 1.0;
        }
    }

    if (Math.random() < 0.1) {
        isStar[i] = 1.0;

        const rangeX = 300;
        const rangeY = 150;
        const rangeZ = 120;

        const sx = (Math.random() - 0.5) * rangeX;
        const sy = (Math.random() - 0.5) * rangeY;
        const sz = (Math.random() - 0.5) * rangeZ - 20;

        pts[i].set(sx, sy, sz);
        particleData[i].set(sx, sy, sz);
        targetPositions[i * 3] = sx;
        targetPositions[i * 3 + 1] = sy;
        targetPositions[i * 3 + 2] = sz;
    }
}

const atlasTexture = new THREE.CanvasTexture(atlasCanvas);
atlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
atlasTexture.magFilter = THREE.LinearFilter;
atlasTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
atlasTexture.generateMipmaps = true;

imagePaths.forEach((path, idx) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = path;
    img.onload = () => {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, col * 512, row * 512, 512, 512);
        atlasTexture.needsUpdate = true;

        const aspect = img.width / img.height;
        const aspectsArray = geo.attributes.aspect.array;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            if (textureIndices[i] === idx) {
                aspectsArray[i] = aspect;
            }
        }
        geo.attributes.aspect.needsUpdate = true;

        loadedCount++;
    };
});

const icons = ["🌺", "💗", "💝", "💖", "🌹", "🪷"];
icons.forEach((icon, idx) => {
    const actualIdx = 12 + idx;
    const col = actualIdx % 4;
    const row = Math.floor(actualIdx / 4);
    if (row >= 4) return;
    ctx.font = "400px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText(icon, col * 512 + 256, row * 512 + 256);
    atlasTexture.needsUpdate = true;
});

let geo = new THREE.BufferGeometry().setFromPoints(pts);
geo.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
geo.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));
geo.setAttribute("targetPos", new THREE.Float32BufferAttribute(targetPositions, 3));
geo.setAttribute("texIdx", new THREE.Float32BufferAttribute(textureIndices, 1));
geo.setAttribute("randomVal", new THREE.Float32BufferAttribute(randomVals, 1));
geo.setAttribute("isCenter", new THREE.Float32BufferAttribute(isCenter, 1));
geo.setAttribute("pIdx", new THREE.Float32BufferAttribute(pIndices, 1));
geo.setAttribute("aspect", new THREE.Float32BufferAttribute(aspects, 1));
geo.setAttribute("customRot", new THREE.Float32BufferAttribute(customRotations, 1));
geo.setAttribute("rotSpeed", new THREE.Float32BufferAttribute(rotationSpeeds, 1));
geo.setAttribute("isGalaxyImage", new THREE.Float32BufferAttribute(isGalaxyImage, 1));
geo.setAttribute("isStar", new THREE.Float32BufferAttribute(isStar, 1));

gu = {
    time: { value: 0 },
    lerp: { value: 0 },
    showImages: { value: 0 },
    scatter: { value: 0 },
    atlas: { value: atlasTexture },
    zoomIdx: { value: -1 },
    zoomFactor: { value: 0 },
    uTargetSize: { value: Math.min(window.innerWidth, window.innerHeight) * 0.85 }
};

let mat = new THREE.PointsMaterial({
    size: 0.12,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    onBeforeCompile: shader => {
        shader.uniforms.time = gu.time;
        shader.uniforms.lerp = gu.lerp;
        shader.uniforms.showImages = gu.showImages;
        shader.uniforms.scatter = gu.scatter;
        shader.uniforms.atlas = gu.atlas;
        shader.uniforms.zoomIdx = gu.zoomIdx;
        shader.uniforms.zoomFactor = gu.zoomFactor;
        shader.uniforms.uTargetSize = gu.uTargetSize;
        shader.vertexShader = `
                    uniform float time;
                    uniform float lerp;
                    uniform float showImages;
                    uniform float scatter;
                    uniform float zoomIdx;
                    uniform float zoomFactor;
                    uniform float uTargetSize;
                    attribute float sizes;
                    attribute vec4 shift;
                    attribute vec3 targetPos;
                    attribute float texIdx;
                    attribute float randomVal;
                    attribute float isCenter;
                    attribute float pIdx;
                    attribute float aspect;
                    attribute float customRot;
                    attribute float rotSpeed;
                    attribute float isGalaxyImage;
                    attribute float isStar;
                    varying vec3 vColor;
                    varying float vTexIdx;
                    varying float vVisible;
                    varying float vIsCenter;
                    varying float vIsZoomed;
                    varying float vAspect;
                    varying float vRotation;
                    varying float vIsGalImg;
                    varying float vIsStar;
                    ${shader.vertexShader}
                `.replace(
            `gl_PointSize = size;`,
            `
                    float isSelect = step(randomVal, 0.005); 
                    
                    float visibleInGalaxy = 1.0;
                    float visibleInPhoto = max(mix(isSelect, 1.0, isCenter), isStar); 
                    vVisible = mix(visibleInGalaxy, visibleInPhoto, showImages);
                    
                    float isIcon = step(11.5, texIdx);
                    float baseScale = mix(20.0, 8.0, isIcon); 
                    vIsZoomed = step(abs(pIdx - zoomIdx), 0.5) * (1.0 - isIcon);

                    float zSmooth = zoomFactor * zoomFactor * (3.0 - 2.0 * zoomFactor);
                    
                    float angle = (customRot + time * rotSpeed * 0.2);
                    vRotation = angle * (1.0 - vIsZoomed * zSmooth) * showImages;

                    float scaleDelta = (baseScale - 1.0) * isSelect * (1.0 - isCenter);
                    float finalScale = 1.0 + scaleDelta * showImages;
                    
                    float galaxyImgScale = mix(1.0, 12.0, isGalaxyImage * (1.0 - showImages));
                    
                    float rotScale = 1.0 + abs(sin(vRotation * 2.0)) * 0.414;
                    float starScale = mix(1.0, 6.0, isStar * step(0.1, zoomFactor));
                    gl_PointSize = size * sizes * finalScale * rotScale * galaxyImgScale * starScale;

                    if (vIsZoomed < 0.5) {
                        gl_PointSize *= mix(1.0, 0.5, zSmooth * showImages);
                    }
                    `
        ).replace(
            `#include <project_vertex>`,
            `
                    #include <project_vertex>
                    if (vIsZoomed > 0.5) {
                        float zSmooth = zoomFactor * zoomFactor * (3.0 - 2.0 * zoomFactor);
                        float totalZoom = zSmooth * showImages;
                        gl_Position.xy = mix(gl_Position.xy, vec2(0.0), totalZoom);
                        gl_Position.z = mix(gl_Position.z, -0.5 * gl_Position.w, totalZoom);
                    }
                    `
        ).replace(
            `#include <color_vertex>`,
            `
                    float d = length(abs(position) / vec3(40., 10., 40));
                    d = clamp(d, 0., 1.);
                    vColor = mix(vec3(42,40,154), vec3(209,124,196), d) / 255.;
                    vTexIdx = texIdx;
                    vIsCenter = isCenter;
                    vAspect = aspect;
                    vIsGalImg = isGalaxyImage;
                    vIsStar = isStar;
                    `
        ).replace(
            `#include <begin_vertex>`,
            `
                    float t = time;
                    float moveT = mod(shift.x + shift.z * t, PI2);
                    float moveS = mod(shift.y + shift.z * t, PI2);
                    vec3 noise = vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.a;
                    
                    vec3 finalNoise = noise * (1.0 - showImages);
                    
                    vec3 transformed = mix(position + finalNoise, targetPos, lerp);
                    
                    transformed += finalNoise * scatter * 100.0;
                    `
        ).replace(
            `#include <fog_vertex>`,
            `#include <fog_vertex>
                    if (vIsZoomed > 0.5) {
                        float zSmooth = zoomFactor * zoomFactor * (3.0 - 2.0 * zoomFactor);
                        gl_PointSize = mix(gl_PointSize, uTargetSize, zSmooth * showImages);
                    }
                    `
        );

        shader.fragmentShader = `
                    varying vec3 vColor;
                    varying float vTexIdx;
                    varying float vVisible;
                    varying float vIsCenter;
                    varying float vIsZoomed;
                    varying float vAspect;
                    varying float vRotation;
                    varying float vIsGalImg;
                    varying float vIsStar;
                    uniform float time;
                    uniform float showImages;
                    uniform float zoomFactor;
                    uniform sampler2D atlas;
                    ${shader.fragmentShader}
                `.replace(
            `#include <clipping_planes_fragment>`,
            `#include <clipping_planes_fragment>
                    if (vVisible < 0.1) discard;
                    float d = length(gl_PointCoord.xy - 0.5);
                    if (showImages < 0.1 && vIsGalImg < 0.5 && d > 0.5) discard;
                    `
        ).replace(
            `vec4 diffuseColor = vec4( diffuse, opacity );`,
            `
                    vec4 diffuseColor;
                    
                    float zSmooth = zoomFactor * zoomFactor * (3.0 - 2.0 * zoomFactor);
                    float blurSmooth = pow(zSmooth, 0.05); 
                    float blurFade = mix(1.0, 0.09, blurSmooth * (1.0 - vIsZoomed) * showImages);

                    if ((showImages > 0.1 || vIsGalImg > 0.5) && vIsCenter < 0.5 && vIsStar < 0.5) {
                        vec2 uv = gl_PointCoord.xy;
                        
                        float currentRot = mix(0.0, vRotation, mix(1.0, showImages, vIsGalImg));
                        if (abs(currentRot) > 0.001) {
                            vec2 p_rot = uv - 0.5;
                            float cosR = cos(currentRot);
                            float sinR = sin(currentRot);
                            uv.x = p_rot.x * cosR - p_rot.y * sinR + 0.5;
                            uv.y = p_rot.x * sinR + p_rot.y * cosR + 0.5;
                            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
                        }

                        if (vAspect > 1.0) { 
                            uv.y = (uv.y - 0.5) * vAspect + 0.5;
                            if (uv.y < 0.0 || uv.y > 1.0) discard;
                        } else { 
                            uv.x = (uv.x - 0.5) / vAspect + 0.5;
                            if (uv.x < 0.0 || uv.x > 1.0) discard;
                        }

                        vec2 p = uv - 0.5;
                        float rad = 0.05; 
                        
                        vec2 cornerP = abs(p) - (0.5 - rad);
                        float dist = length(max(cornerP, 0.0)) - rad;
                        if (dist > 0.0) discard;
                        
                        float col = mod(vTexIdx, 4.0);
                        float row = floor(vTexIdx / 4.0);
                        
                        vec2 uvInPart = vec2(uv.x, 1.0 - uv.y);
                        vec2 finalUV = vec2((uvInPart.x * 0.248 + 0.001) + (col * 0.25), (uvInPart.y * 0.248 + 0.001) + ((3.0 - row) * 0.25));
                        
                        vec4 texColor = texture2D(atlas, finalUV);
                        if(texColor.a < 0.3) discard;
                        
                        float finalAlpha = mix(texColor.a * 0.7, texColor.a, showImages);
                        diffuseColor = vec4(texColor.rgb, finalAlpha);
                        
                        diffuseColor.a *= blurFade;
                    } else {
                        vec2 uv = gl_PointCoord.xy - 0.5;
                        float d = length(uv);
                        
                        float dotAlpha = 0.0;
                        if (d <= 0.5) {
                            dotAlpha = smoothstep(0.5, 0.1, d) * (1.0 - showImages);
                            dotAlpha *= blurFade;
                        }

                        float starAlpha = 0.0;
                        if (vIsStar > 0.5 && zoomFactor > 0.1 && showImages > 0.5) {
                             float cX = smoothstep(0.04, 0.0, abs(uv.x)) * smoothstep(0.5, 0.0, abs(uv.y));
                             float cY = smoothstep(0.04, 0.0, abs(uv.y)) * smoothstep(0.5, 0.0, abs(uv.x));
                             float cross = clamp(cX + cY, 0.0, 1.0);
                             cross *= smoothstep(0.5, 0.2, d);
                             
                             float sparkle = 0.5 + 0.5 * sin(time * 5.0 + vTexIdx * 50.0);
                             starAlpha = cross * sparkle * smoothstep(0.1, 0.8, zoomFactor);
                        }

                        float finalAlpha = max(dotAlpha, starAlpha);
                        if (finalAlpha < 0.001) discard;
                        
                        vec3 finalColor = mix(vColor, vec3(1.0), starAlpha > dotAlpha ? 1.0 : 0.0);
                        diffuseColor = vec4(finalColor, finalAlpha);
                    }
                    `
        );
    }
});

mat.alphaTest = 0.1;

let points = new THREE.Points(geo, mat);
points.rotation.order = "ZYX";
points.rotation.z = 0.2;
scene.add(points);

let showImagesTarget = 0;

function toggleImages(visible) {
    showImagesTarget = visible ? 1.0 : 0.0;
}

function updateTargetPositions(modeId) {
    const targets = geo.attributes.targetPos.array;
    if (modeId === MODE.GALAXY || modeId === MODE.FIST) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const origin = particleData[i];
            targets[i * 3] = origin.x;
            targets[i * 3 + 1] = origin.y;
            targets[i * 3 + 2] = origin.z;
        }
    }
    geo.attributes.targetPos.needsUpdate = true;
}


const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingEl = document.getElementById('loading');

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
            drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });

            if (zoomTarget < 0.1) {
                const handX = landmarks[9].x;
                targetRotationY = (handX - 0.5) * -Math.PI * 1.5;
            }

            const gesture = detectGesture(landmarks);
            handleGesture(gesture);
        }
    } else {
        if (currentMode !== MODE.GALAXY || gu.showImages.value > 0.01) {
            handleGesture("RESTORE_GALAXY");
        }
        targetRotationY = 0;
        lastGesture = "";
        zoomTarget = 0;
    }
    canvasCtx.restore();
}

function detectGesture(landmarks) {
    const tipIndices = [8, 12, 16, 20];
    let openFingers = 0;

    tipIndices.forEach(idx => {
        if (landmarks[idx].y < landmarks[idx - 2].y) openFingers++;
    });

    const dx = landmarks[8].x - landmarks[4].x;
    const dy = landmarks[8].y - landmarks[4].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.08) return "PINCH";
    if (openFingers >= 3) return "OPEN";
    if (openFingers <= 2) return "FIST";

    return "UNKNOWN";
}

let lastGesture = "";
let scatterPulse = 0;
let zoomTarget = 0;
let letterOverlayShown = false;

const letterOverlayEl = document.getElementById("letter-overlay");
const letterCloseBtn = document.getElementById("letter-close");

function showLetterOverlay() {
    if (letterOverlayShown || !letterOverlayEl) return;
    letterOverlayShown = true;
    letterOverlayEl.classList.remove("letter-overlay--open");
    letterOverlayEl.classList.add("letter-overlay--visible");
    letterOverlayEl.setAttribute("aria-hidden", "false");
}

function hideLetterOverlay() {
    if (!letterOverlayEl) return;
    letterOverlayEl.classList.remove("letter-overlay--open", "letter-overlay--visible");
    letterOverlayEl.setAttribute("aria-hidden", "true");
    letterOverlayShown = false;
    zoomTarget = 0;
    gu.zoomFactor.value = 0;
    gu.zoomIdx.value = -1;
}

if (letterCloseBtn) {
    letterCloseBtn.addEventListener("click", hideLetterOverlay);
}

const letterEnvelopeClosed = document.getElementById("letter-envelope-closed");
if (letterEnvelopeClosed) {
    letterEnvelopeClosed.addEventListener("click", () => {
        if (letterOverlayEl) letterOverlayEl.classList.add("letter-overlay--open");
    });
    letterEnvelopeClosed.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (letterOverlayEl) letterOverlayEl.classList.add("letter-overlay--open");
        }
    });
}

const btnOpenLetter = document.getElementById("btn-open-letter");
if (btnOpenLetter) {
    btnOpenLetter.addEventListener("click", () => showLetterOverlay());
}

function handleGesture(gesture) {
    if (gesture === "UNKNOWN") return;
    if (gesture === "OPEN" && zoomTarget > 0.5) {
    } else if (gesture !== "PINCH") {
        zoomTarget = 0;
    }

    if (gesture === lastGesture && gesture !== "PINCH" && gesture !== "FIST" && gesture !== "RESTORE_GALAXY") return;
    lastGesture = gesture;

    switch (gesture) {
        case "FIST":
        case "RESTORE_GALAXY":
            currentMode = MODE.GALAXY;
            targetLerp = 0.0;
            showImagesTarget = 0.0;
            zoomTarget = 0.0;
            updateTargetPositions(MODE.GALAXY);
            break;
        case "OPEN":
            if (currentMode !== MODE.IMAGES) {
                scatterPulse = 1.0;
                currentMode = MODE.IMAGES;
                targetLerp = 0.0;
                toggleImages(true);
            }
            break;
        case "PINCH":
            if (currentMode === MODE.IMAGES) {
                if (zoomTarget < 0.1) {
                    let minDist = Infinity;
                    let closestIdx = -1;
                    const posAttr = geo.attributes.position.array;
                    const tempVec = new THREE.Vector3();
                    points.updateMatrixWorld();

                    for (let i = 0; i < imageParticleIndices.length; i++) {
                        let pIdx = imageParticleIndices[i];
                        if (geo.attributes.texIdx.array[pIdx] >= 11.5) continue;
                        tempVec.set(posAttr[pIdx * 3], posAttr[pIdx * 3 + 1], posAttr[pIdx * 3 + 2]);
                        tempVec.applyMatrix4(points.matrixWorld);
                        tempVec.project(camera);
                        let d = tempVec.x * tempVec.x + tempVec.y * tempVec.y;
                        if (tempVec.z > 0 && tempVec.z < 1) {
                            if (d < minDist) {
                                minDist = d;
                                closestIdx = pIdx;
                            }
                        }
                    }
                    gu.zoomIdx.value = closestIdx;
                }
                zoomTarget = 1.0;
            }
            break;
    }
}

const hideLoading = () => {
    if (loadingEl.style.display === 'none') return;
    loadingEl.style.opacity = '0';
    setTimeout(() => {
        loadingEl.style.display = 'none';
        const audio = new Audio('style/nhac.mp3');
        audio.loop = true;
        audio.play().catch(e => console.log("Audio play failed:", e));
    }, 1000);
};

// Safety timeout: Hide loading after 15 seconds if nothing happens
setTimeout(() => {
    if (loadingEl.style.display !== 'none') {
        console.warn("Camera initialization timed out.");
        hideLoading();
    }
}, 15000);

if (typeof Hands === 'undefined' || typeof Camera === 'undefined') {
    console.error("MediaPipe libraries not loaded.");
    setTimeout(hideLoading, 2000);
} else {
    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);

    const camera_mp = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 640,
        height: 480
    });

    camera_mp.start()
        .then(() => {
            console.log("Camera started successfully");
            hideLoading();
        })
        .catch(err => {
            console.error("Camera failed to start:", err);
            if (window.location.protocol === 'file:') {
                alert("Lỗi: Không thể truy cập camera khi mở file trực tiếp (file://). Vui lòng sử dụng máy chủ local (như Live Server) hoặc HTTPS.");
            } else {
                alert("Không thể kết nối camera. Vui lòng kiểm tra quyền truy cập camera.");
            }
            hideLoading();
        });
}

let clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    controls.update();
    let delta = clock.getDelta();
    let t = clock.getElapsedTime() * 0.2;
    gu.time.value = t * Math.PI;
    lerpFactor += (targetLerp - lerpFactor) * 0.05;
    gu.lerp.value = lerpFactor;
    gu.showImages.value += (showImagesTarget - gu.showImages.value) * 0.05;
    scatterPulse *= 0.92;
    gu.scatter.value = scatterPulse;
    if (gu.showImages.value > 0.5) {
        if (mat.blending !== THREE.NormalBlending) {
            mat.blending = THREE.NormalBlending;
            mat.depthTest = true;
            mat.depthWrite = true;
            mat.needsUpdate = true;
        }
    } else {
        if (mat.blending !== THREE.AdditiveBlending) {
            mat.blending = THREE.AdditiveBlending;
            mat.depthTest = false;
            mat.depthWrite = false;
            mat.needsUpdate = true;
        }
    }
    let zSmooth = gu.zoomFactor.value * gu.zoomFactor.value * (3.0 - 2.0 * gu.zoomFactor.value);
    controls.autoRotate = gu.showImages.value < 0.01 && gu.zoomFactor.value < 0.01;
    controls.enabled = gu.zoomFactor.value < 0.01;
    if (gu.showImages.value < 0.1) {
        autoRotationAngle += delta * 0.1 * (1.0 - zSmooth);
    }
    let rotSymmetry = 1.0 - zSmooth;
    currentRotationY += (targetRotationY - currentRotationY) * 0.1 * rotSymmetry;
    points.rotation.y = autoRotationAngle + currentRotationY;
    points.rotation.z = 0.2 * (1.0 - gu.showImages.value);
    points.rotation.x = 0.0;
    let zSpeed = (zoomTarget > 0.5) ? 0.1 : 0.15;
    gu.zoomFactor.value += (zoomTarget - gu.zoomFactor.value) * zSpeed;
    if (gu.zoomFactor.value < 0.01) {
        gu.zoomIdx.value = -1;
    }
    if (lastGesture !== "PINCH") {
        zoomTarget = 0.0;
    }

    renderer.render(scene, camera);
});
