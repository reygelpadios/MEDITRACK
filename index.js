import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const root = document.getElementById('root');
const loginScreen = document.getElementById('login-screen');

if (root && loginScreen && getComputedStyle(loginScreen).display !== 'none') {
const getRootSize = () => {
  const rect = root.getBoundingClientRect();
  return {
    width: Math.max(1, Math.round(rect.width || 640)),
    height: Math.max(1, Math.round(rect.height || 520)),
  };
};
const initialSize = getRootSize();

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(initialSize.width, initialSize.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
root.replaceChildren(renderer.domElement);

// ─── Scene & Camera ──────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(42, initialSize.width / initialSize.height, 0.1, 100);
camera.position.set(0, 0.5, 8.8);

// ─── Controls ────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.rotateSpeed = 0.75;
controls.zoomSpeed = 1.1;
controls.minDistance = 4;
controls.maxDistance = 16;
controls.target.set(0, 0.2, 0);

// ─── Lights ──────────────────────────────────────────────────────────────────
// Main top-right key light
const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
keyLight.position.set(5, 8, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 40;
keyLight.shadow.camera.left = -7;
keyLight.shadow.camera.right = 7;
keyLight.shadow.camera.top = 7;
keyLight.shadow.camera.bottom = -7;
keyLight.shadow.bias = -0.001;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

// Soft fill from left
const fillLight = new THREE.DirectionalLight(0xddeeff, 1.1);
fillLight.position.set(-6, 3, 4);
scene.add(fillLight);

// Soft ambient
const ambientLight = new THREE.HemisphereLight(0xffffff, 0xcccccc, 1.0);
scene.add(ambientLight);

// Subtle bottom bounce
const bounceLight = new THREE.DirectionalLight(0xffeedd, 0.4);
bounceLight.position.set(0, -5, 3);
scene.add(bounceLight);

// Rim from behind
const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
rimLight.position.set(-2, 2, -8);
scene.add(rimLight);

// ─── Color Palette ───────────────────────────────────────────────────────────
const COL_RED        = 0xC0392B;   // deep realistic myocardium red
const COL_RED_DARK   = 0x96281B;   // darker red for atria / depth
const COL_RED_MID    = 0xAB2A20;   // mid tone for blending
const COL_RED_VESSEL = 0xE74C3C;   // bright arterial red (aorta)
const COL_BLUE       = 0x1A3A7A;   // deep venous blue (SVC, IVC, pulm artery)
const COL_BLUE_VEN   = 0x2255A4;   // coronary veins
const COL_RED_PULM   = 0xBE3A2A;   // pulmonary veins
const COL_FAT        = 0xF5E6C8;   // epicardial fat / connective tissue

// ─── Smooth material factory ─────────────────────────────────────────────────
function mat(color, roughness = 0.55, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// ─── Heart Group ─────────────────────────────────────────────────────────────
const heartGroup = new THREE.Group();
heartGroup.name = 'heartGroup';
scene.add(heartGroup);

// ─── Tube builder ────────────────────────────────────────────────────────────
function tube(points, radius, color, segs = 24, radSegs = 14, roughness = 0.4) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, segs, radius, radSegs, false);
  const mesh = new THREE.Mesh(geo, mat(color, roughness));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// End cap helper — sphere cap at tube endpoint
function cap(pos, radius, color, roughness = 0.4) {
  const geo = new THREE.SphereGeometry(radius, 16, 12);
  const mesh = new THREE.Mesh(geo, mat(color, roughness));
  mesh.position.copy(pos);
  mesh.castShadow = true;
  return mesh;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HEART BODY — anatomically proportioned ellipsoids
// ═══════════════════════════════════════════════════════════════════════════════

function ellipsoid(rx, ry, rz, px, py, pz, rotX = 0, rotY = 0, rotZ = 0, color = COL_RED, roughness = 0.55) {
  const geo = new THREE.SphereGeometry(1, 64, 56);
  const mesh = new THREE.Mesh(geo, mat(color, roughness));
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(px, py, pz);
  mesh.rotation.set(rotX, rotY, rotZ);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Left ventricle — dominant mass, elongated
const lvMain = ellipsoid(1.18, 1.60, 1.05, -0.20, -0.18, 0.0, 0, 0, 0.12, COL_RED, 0.55);
lvMain.name = 'lvMain';
heartGroup.add(lvMain);

// Right ventricle — anterior crescent wrap
const rvMain = ellipsoid(0.92, 1.22, 0.80, 0.70, -0.12, 0.24, 0, 0.18, -0.08, COL_RED_MID, 0.56);
rvMain.name = 'rvMain';
heartGroup.add(rvMain);

// Interventricular sulcus fill (smooth transition strip)
const ivsGeo = new THREE.SphereGeometry(1, 32, 28);
const ivsMesh = new THREE.Mesh(ivsGeo, mat(COL_RED_DARK, 0.60));
ivsMesh.name = 'ivs';
ivsMesh.scale.set(0.25, 1.30, 0.28);
ivsMesh.position.set(0.28, -0.25, 0.60);
ivsMesh.rotation.set(0, 0, 0.10);
ivsMesh.castShadow = true;
heartGroup.add(ivsMesh);

// Left atrium — upper posterior
const laMain = ellipsoid(0.88, 0.72, 0.76, -0.30, 1.00, -0.20, -0.10, 0, 0.05, COL_RED_DARK, 0.58);
laMain.name = 'laMain';
heartGroup.add(laMain);

// Right atrium — upper right
const raMain = ellipsoid(0.80, 0.74, 0.70, 0.74, 0.86, 0.12, -0.05, -0.10, -0.05, COL_RED_DARK, 0.58);
raMain.name = 'raMain';
heartGroup.add(raMain);

// Left auricle — small finger-like protrusion upper-left
const lAuricle = ellipsoid(0.28, 0.38, 0.26, -0.60, 1.04, 0.44, -0.20, 0.32, 0.12, COL_RED, 0.54);
lAuricle.name = 'leftAuricle';
heartGroup.add(lAuricle);

// Right auricle
const rAuricle = ellipsoid(0.26, 0.34, 0.24, 1.02, 0.92, 0.34, -0.10, -0.22, -0.10, COL_RED, 0.54);
rAuricle.name = 'rightAuricle';
heartGroup.add(rAuricle);

// Conus arteriosus / RV outflow tract
const conus = ellipsoid(0.40, 0.58, 0.36, 0.52, 0.70, 0.46, -0.20, 0, 0, COL_RED, 0.55);
conus.name = 'conus';
heartGroup.add(conus);

// Apex — blunt cone, tilted left-anterior
const apexGeo = new THREE.ConeGeometry(0.60, 1.15, 40);
const apexMesh = new THREE.Mesh(apexGeo, mat(COL_RED, 0.55));
apexMesh.name = 'apex';
apexMesh.position.set(-0.30, -1.50, 0.05);
apexMesh.rotation.z = 0.22;
apexMesh.rotation.x = 0.08;
apexMesh.castShadow = true;
apexMesh.receiveShadow = true;
heartGroup.add(apexMesh);

// Apex-body smooth join
const apexJoin = ellipsoid(0.68, 0.52, 0.64, -0.24, -1.12, 0.05, 0, 0, 0.15, COL_RED, 0.55);
apexJoin.name = 'apexJoin';
heartGroup.add(apexJoin);

// Atrioventricular groove fat pad (coronary sulcus) — yellow-cream strip
const avGroovePts = [
  new THREE.Vector3(0.80, 0.78, 0.32),
  new THREE.Vector3(0.52, 0.90, 0.56),
  new THREE.Vector3(0.18, 0.96, 0.64),
  new THREE.Vector3(-0.14, 0.94, 0.58),
  new THREE.Vector3(-0.42, 0.86, 0.46),
];
const avGroove = tube(avGroovePts, 0.08, COL_FAT, 20, 8, 0.70);
avGroove.name = 'avGroove';
heartGroup.add(avGroove);

// ═══════════════════════════════════════════════════════════════════════════════
//  SUPERIOR VENA CAVA (SVC) — deep blue, straight up from right atrium
// ═══════════════════════════════════════════════════════════════════════════════
const svcPts = [
  new THREE.Vector3(0.80, 0.90, 0.04),
  new THREE.Vector3(0.82, 1.30, 0.01),
  new THREE.Vector3(0.84, 1.72, -0.01),
  new THREE.Vector3(0.85, 2.18, -0.03),
];
const svc = tube(svcPts, 0.185, COL_BLUE, 22, 16, 0.42);
svc.name = 'SVC';
heartGroup.add(svc);
heartGroup.add(cap(new THREE.Vector3(0.85, 2.18, -0.03), 0.185, COL_BLUE));

// ═══════════════════════════════════════════════════════════════════════════════
//  PULMONARY TRUNK — deep blue, rises from RV conus
// ═══════════════════════════════════════════════════════════════════════════════
const ptPts = [
  new THREE.Vector3(0.52, 0.88, 0.52),
  new THREE.Vector3(0.32, 1.16, 0.44),
  new THREE.Vector3(0.06, 1.42, 0.30),
  new THREE.Vector3(-0.22, 1.56, 0.12),
];
const pulmTrunk = tube(ptPts, 0.205, COL_BLUE, 24, 16, 0.42);
pulmTrunk.name = 'pulmTrunk';
heartGroup.add(pulmTrunk);

// Left pulmonary artery
const lpaPts = [
  new THREE.Vector3(-0.22, 1.56, 0.12),
  new THREE.Vector3(-0.48, 1.64, -0.12),
  new THREE.Vector3(-0.75, 1.60, -0.32),
  new THREE.Vector3(-0.98, 1.48, -0.46),
];
const lpa = tube(lpaPts, 0.155, COL_BLUE, 20, 14, 0.42);
lpa.name = 'leftPulmArtery';
heartGroup.add(lpa);
heartGroup.add(cap(new THREE.Vector3(-0.98, 1.48, -0.46), 0.155, COL_BLUE));

// Right pulmonary artery
const rpaPts = [
  new THREE.Vector3(-0.22, 1.56, 0.12),
  new THREE.Vector3(0.04, 1.60, -0.12),
  new THREE.Vector3(0.34, 1.56, -0.30),
  new THREE.Vector3(0.60, 1.50, -0.44),
];
const rpa = tube(rpaPts, 0.140, COL_BLUE, 18, 14, 0.42);
rpa.name = 'rightPulmArtery';
heartGroup.add(rpa);
heartGroup.add(cap(new THREE.Vector3(0.60, 1.50, -0.44), 0.140, COL_BLUE));

// ═══════════════════════════════════════════════════════════════════════════════
//  AORTA — bright arterial red, full arch with branches
// ═══════════════════════════════════════════════════════════════════════════════

// Ascending aorta
const aortaAscPts = [
  new THREE.Vector3(0.12, 0.94, 0.20),
  new THREE.Vector3(0.12, 1.30, 0.12),
  new THREE.Vector3(0.14, 1.70, 0.03),
  new THREE.Vector3(0.16, 2.08, -0.06),
];
const aortaAsc = tube(aortaAscPts, 0.185, COL_RED_VESSEL, 24, 16, 0.40);
aortaAsc.name = 'aortaAscending';
heartGroup.add(aortaAsc);

// Aortic arch — sweeps up and posteriorly
const archPts = [
  new THREE.Vector3(0.16, 2.08, -0.06),
  new THREE.Vector3(0.14, 2.38, -0.06),
  new THREE.Vector3(0.02, 2.55, -0.16),
  new THREE.Vector3(-0.30, 2.52, -0.30),
  new THREE.Vector3(-0.58, 2.38, -0.40),
  new THREE.Vector3(-0.80, 2.08, -0.44),
  new THREE.Vector3(-0.94, 1.75, -0.44),
];
const aortaArch = tube(archPts, 0.175, COL_RED_VESSEL, 32, 16, 0.40);
aortaArch.name = 'aortaArch';
heartGroup.add(aortaArch);

// Descending aorta
const descPts = [
  new THREE.Vector3(-0.94, 1.75, -0.44),
  new THREE.Vector3(-0.97, 1.32, -0.46),
  new THREE.Vector3(-0.97, 0.88, -0.44),
  new THREE.Vector3(-0.95, 0.44, -0.42),
];
const aortaDesc = tube(descPts, 0.158, COL_RED_VESSEL, 18, 14, 0.42);
aortaDesc.name = 'aortaDesc';
heartGroup.add(aortaDesc);

// Brachiocephalic trunk
const brachPts = [
  new THREE.Vector3(0.12, 2.40, -0.09),
  new THREE.Vector3(0.30, 2.54, -0.05),
  new THREE.Vector3(0.52, 2.64, 0.00),
  new THREE.Vector3(0.70, 2.68, 0.06),
];
const brachio = tube(brachPts, 0.112, COL_RED_VESSEL, 16, 12, 0.42);
brachio.name = 'brachiocephalic';
heartGroup.add(brachio);
heartGroup.add(cap(new THREE.Vector3(0.70, 2.68, 0.06), 0.112, COL_RED_VESSEL));

// Left common carotid
const carotidPts = [
  new THREE.Vector3(-0.06, 2.54, -0.22),
  new THREE.Vector3(-0.09, 2.68, -0.24),
  new THREE.Vector3(-0.12, 2.84, -0.26),
];
const carotid = tube(carotidPts, 0.090, COL_RED_VESSEL, 12, 10, 0.42);
carotid.name = 'leftCarotid';
heartGroup.add(carotid);
heartGroup.add(cap(new THREE.Vector3(-0.12, 2.84, -0.26), 0.090, COL_RED_VESSEL));

// Left subclavian
const subclavPts = [
  new THREE.Vector3(-0.30, 2.52, -0.34),
  new THREE.Vector3(-0.58, 2.62, -0.30),
  new THREE.Vector3(-0.80, 2.64, -0.22),
];
const subclav = tube(subclavPts, 0.090, COL_RED_VESSEL, 12, 10, 0.42);
subclav.name = 'leftSubclavian';
heartGroup.add(subclav);
heartGroup.add(cap(new THREE.Vector3(-0.80, 2.64, -0.22), 0.090, COL_RED_VESSEL));

// ═══════════════════════════════════════════════════════════════════════════════
//  PULMONARY VEINS — 4 veins (2 per side) entering left atrium
// ═══════════════════════════════════════════════════════════════════════════════

// Right superior pulmonary vein
const rspvPts = [
  new THREE.Vector3(-0.24, 1.06, -0.24),
  new THREE.Vector3(0.14, 1.10, -0.46),
  new THREE.Vector3(0.54, 1.07, -0.62),
  new THREE.Vector3(0.84, 1.00, -0.72),
];
const rspv = tube(rspvPts, 0.115, COL_RED_PULM, 18, 12, 0.42);
rspv.name = 'rightSupPulmVein';
heartGroup.add(rspv);
heartGroup.add(cap(new THREE.Vector3(0.84, 1.00, -0.72), 0.115, COL_RED_PULM));

// Right inferior pulmonary vein
const ripvPts = [
  new THREE.Vector3(-0.24, 0.74, -0.24),
  new THREE.Vector3(0.12, 0.72, -0.48),
  new THREE.Vector3(0.46, 0.68, -0.62),
  new THREE.Vector3(0.76, 0.64, -0.72),
];
const ripv = tube(ripvPts, 0.100, COL_RED_PULM, 16, 12, 0.42);
ripv.name = 'rightInfPulmVein';
heartGroup.add(ripv);
heartGroup.add(cap(new THREE.Vector3(0.76, 0.64, -0.72), 0.100, COL_RED_PULM));

// Left superior pulmonary vein (posterior)
const lspvPts = [
  new THREE.Vector3(-0.30, 1.02, -0.24),
  new THREE.Vector3(-0.60, 1.00, -0.50),
  new THREE.Vector3(-0.88, 0.92, -0.64),
];
const lspv = tube(lspvPts, 0.100, COL_RED_PULM, 14, 12, 0.44);
lspv.name = 'leftSupPulmVein';
heartGroup.add(lspv);
heartGroup.add(cap(new THREE.Vector3(-0.88, 0.92, -0.64), 0.100, COL_RED_PULM));

// Left inferior pulmonary vein
const lipvPts = [
  new THREE.Vector3(-0.30, 0.84, -0.26),
  new THREE.Vector3(-0.58, 0.80, -0.52),
  new THREE.Vector3(-0.84, 0.72, -0.64),
];
const lipv = tube(lipvPts, 0.090, COL_RED_PULM, 14, 10, 0.44);
lipv.name = 'leftInfPulmVein';
heartGroup.add(lipv);
heartGroup.add(cap(new THREE.Vector3(-0.84, 0.72, -0.64), 0.090, COL_RED_PULM));

// ═══════════════════════════════════════════════════════════════════════════════
//  INFERIOR VENA CAVA
// ═══════════════════════════════════════════════════════════════════════════════
const ivcPts = [
  new THREE.Vector3(0.76, 0.76, 0.04),
  new THREE.Vector3(0.80, 0.40, 0.00),
  new THREE.Vector3(0.82, 0.00, -0.06),
  new THREE.Vector3(0.83, -0.38, -0.10),
];
const ivc = tube(ivcPts, 0.155, COL_BLUE, 20, 14, 0.42);
ivc.name = 'IVC';
heartGroup.add(ivc);
heartGroup.add(cap(new THREE.Vector3(0.83, -0.38, -0.10), 0.155, COL_BLUE));

// ═══════════════════════════════════════════════════════════════════════════════
//  CORONARY VESSELS — anterior interventricular + branches + RCA system
// ═══════════════════════════════════════════════════════════════════════════════

// LAD / Anterior interventricular artery — main trunk down the anterior sulcus
const ladPts = [
  new THREE.Vector3(0.14, 0.90, 0.64),
  new THREE.Vector3(0.07, 0.54, 0.80),
  new THREE.Vector3(0.00, 0.14, 0.84),
  new THREE.Vector3(-0.06, -0.26, 0.80),
  new THREE.Vector3(-0.14, -0.66, 0.72),
  new THREE.Vector3(-0.22, -1.04, 0.60),
  new THREE.Vector3(-0.30, -1.36, 0.46),
];
const lad = tube(ladPts, 0.065, COL_BLUE_VEN, 28, 12, 0.44);
lad.name = 'LAD';
heartGroup.add(lad);

// Diagonal branch 1 (D1) — upper-left off LAD
const d1Pts = [
  new THREE.Vector3(0.07, 0.54, 0.80),
  new THREE.Vector3(-0.16, 0.34, 0.76),
  new THREE.Vector3(-0.40, 0.10, 0.68),
  new THREE.Vector3(-0.62, -0.16, 0.58),
];
const d1 = tube(d1Pts, 0.044, COL_BLUE_VEN, 16, 10, 0.46);
d1.name = 'diagonal1';
heartGroup.add(d1);

// D1 sub-branch
const d1aPts = [
  new THREE.Vector3(-0.26, 0.22, 0.72),
  new THREE.Vector3(-0.46, 0.06, 0.62),
  new THREE.Vector3(-0.62, -0.10, 0.50),
];
const d1a = tube(d1aPts, 0.028, COL_BLUE_VEN, 12, 8, 0.48);
d1a.name = 'diagonal1a';
heartGroup.add(d1a);

// Diagonal branch 2 (D2)
const d2Pts = [
  new THREE.Vector3(0.00, 0.14, 0.84),
  new THREE.Vector3(-0.22, -0.06, 0.80),
  new THREE.Vector3(-0.46, -0.26, 0.70),
  new THREE.Vector3(-0.64, -0.48, 0.57),
];
const d2 = tube(d2Pts, 0.038, COL_BLUE_VEN, 14, 10, 0.46);
d2.name = 'diagonal2';
heartGroup.add(d2);

// D2 sub-branch
const d2aPts = [
  new THREE.Vector3(-0.34, -0.16, 0.74),
  new THREE.Vector3(-0.52, -0.30, 0.62),
  new THREE.Vector3(-0.66, -0.48, 0.50),
];
const d2a = tube(d2aPts, 0.026, COL_BLUE_VEN, 10, 8, 0.48);
d2a.name = 'diagonal2a';
heartGroup.add(d2a);

// Septal perforator branches (short, going into septum)
const sep1Pts = [
  new THREE.Vector3(-0.06, -0.26, 0.80),
  new THREE.Vector3(0.10, -0.36, 0.72),
  new THREE.Vector3(0.28, -0.48, 0.60),
];
const sep1 = tube(sep1Pts, 0.026, COL_BLUE_VEN, 10, 8, 0.48);
sep1.name = 'septal1';
heartGroup.add(sep1);

// Right marginal / apical branch
const br4Pts = [
  new THREE.Vector3(-0.14, -0.66, 0.72),
  new THREE.Vector3(-0.34, -0.80, 0.65),
  new THREE.Vector3(-0.56, -0.96, 0.54),
  new THREE.Vector3(-0.72, -1.14, 0.42),
];
const br4 = tube(br4Pts, 0.032, COL_BLUE_VEN, 14, 10, 0.46);
br4.name = 'apicalBranch';
heartGroup.add(br4);

const br4aPts = [
  new THREE.Vector3(-0.44, -0.88, 0.58),
  new THREE.Vector3(-0.62, -1.00, 0.48),
  new THREE.Vector3(-0.76, -1.16, 0.36),
];
const br4a = tube(br4aPts, 0.022, COL_BLUE_VEN, 10, 8, 0.48);
br4a.name = 'apicalBranch_a';
heartGroup.add(br4a);

// Lateral branch going right off LAD mid
const latPts = [
  new THREE.Vector3(-0.06, -0.26, 0.80),
  new THREE.Vector3(0.16, -0.40, 0.76),
  new THREE.Vector3(0.40, -0.56, 0.66),
  new THREE.Vector3(0.58, -0.76, 0.53),
];
const lat = tube(latPts, 0.036, COL_BLUE_VEN, 14, 10, 0.46);
lat.name = 'lateralBranch';
heartGroup.add(lat);

// Lateral sub-branch
const lataPts = [
  new THREE.Vector3(0.26, -0.48, 0.70),
  new THREE.Vector3(0.44, -0.62, 0.60),
  new THREE.Vector3(0.58, -0.78, 0.48),
];
const lata = tube(lataPts, 0.024, COL_BLUE_VEN, 10, 8, 0.48);
lata.name = 'lateralBranch_a';
heartGroup.add(lata);

// Terminal twigs
const twigData = [
  { from: new THREE.Vector3(-0.62, -0.16, 0.58), to: new THREE.Vector3(-0.74, -0.30, 0.47), r: 0.016 },
  { from: new THREE.Vector3(-0.72, -1.14, 0.42), to: new THREE.Vector3(-0.82, -1.27, 0.32), r: 0.015 },
  { from: new THREE.Vector3(0.58, -0.76, 0.53), to: new THREE.Vector3(0.68, -0.90, 0.41), r: 0.015 },
  { from: new THREE.Vector3(-0.64, -0.48, 0.57), to: new THREE.Vector3(-0.76, -0.60, 0.46), r: 0.014 },
  { from: new THREE.Vector3(-0.30, -1.36, 0.46), to: new THREE.Vector3(-0.40, -1.50, 0.34), r: 0.014 },
  { from: new THREE.Vector3(0.28, -0.48, 0.60), to: new THREE.Vector3(0.40, -0.62, 0.50), r: 0.013 },
];
twigData.forEach((t, i) => {
  const tw = tube([t.from, t.to], t.r, COL_BLUE_VEN, 6, 6, 0.50);
  tw.name = `twig_${i}`;
  heartGroup.add(tw);
});

// RCA — runs in the right atrioventricular groove
const rcaPts = [
  new THREE.Vector3(0.84, 0.84, 0.32),
  new THREE.Vector3(0.97, 0.56, 0.22),
  new THREE.Vector3(1.02, 0.22, 0.08),
  new THREE.Vector3(1.00, -0.18, -0.10),
  new THREE.Vector3(0.92, -0.56, -0.24),
  new THREE.Vector3(0.74, -0.86, -0.36),
  new THREE.Vector3(0.44, -1.06, -0.44),
];
const rca = tube(rcaPts, 0.052, COL_BLUE_VEN, 24, 12, 0.44);
rca.name = 'RCA';
heartGroup.add(rca);

// Acute marginal branch off RCA
const amPts = [
  new THREE.Vector3(1.00, -0.10, 0.02),
  new THREE.Vector3(0.90, -0.28, 0.28),
  new THREE.Vector3(0.74, -0.50, 0.48),
  new THREE.Vector3(0.56, -0.70, 0.60),
];
const am = tube(amPts, 0.032, COL_BLUE_VEN, 14, 10, 0.46);
am.name = 'acuteMarginal';
heartGroup.add(am);

// Acute marginal sub-branch
const am2Pts = [
  new THREE.Vector3(0.84, -0.38, 0.36),
  new THREE.Vector3(0.70, -0.52, 0.52),
  new THREE.Vector3(0.56, -0.68, 0.62),
];
const am2 = tube(am2Pts, 0.022, COL_BLUE_VEN, 10, 8, 0.48);
am2.name = 'acuteMarginal2';
heartGroup.add(am2);

// Posterior descending artery (PDA)
const pdaPts = [
  new THREE.Vector3(0.44, -1.06, -0.44),
  new THREE.Vector3(0.18, -1.22, -0.40),
  new THREE.Vector3(-0.10, -1.34, -0.30),
  new THREE.Vector3(-0.32, -1.44, -0.18),
];
const pda = tube(pdaPts, 0.028, COL_BLUE_VEN, 14, 8, 0.48);
pda.name = 'PDA';
heartGroup.add(pda);

// Left circumflex (LCx) — runs in left AV groove posteriorly
const lcxPts = [
  new THREE.Vector3(0.10, 0.90, 0.60),
  new THREE.Vector3(-0.10, 0.94, 0.44),
  new THREE.Vector3(-0.34, 0.92, 0.24),
  new THREE.Vector3(-0.58, 0.86, 0.02),
  new THREE.Vector3(-0.78, 0.76, -0.20),
  new THREE.Vector3(-0.92, 0.60, -0.38),
];
const lcx = tube(lcxPts, 0.042, COL_BLUE_VEN, 20, 10, 0.44);
lcx.name = 'LCx';
heartGroup.add(lcx);

// Obtuse marginal off LCx
const omPts = [
  new THREE.Vector3(-0.68, 0.82, -0.10),
  new THREE.Vector3(-0.82, 0.60, 0.10),
  new THREE.Vector3(-0.88, 0.32, 0.22),
  new THREE.Vector3(-0.88, 0.00, 0.26),
];
const om = tube(omPts, 0.030, COL_BLUE_VEN, 14, 8, 0.46);
om.name = 'obtuseMarginal';
heartGroup.add(om);

// ═══════════════════════════════════════════════════════════════════════════════
//  GROUND SHADOW — soft drop shadow beneath the heart
// ═══════════════════════════════════════════════════════════════════════════════
const shadowGeo = new THREE.CircleGeometry(2.8, 64);
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0xaaaaaa,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
});
const groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
groundShadow.name = 'groundShadow';
groundShadow.rotation.x = -Math.PI / 2;
groundShadow.position.y = -2.2;
scene.add(groundShadow);

// ─── Initial orientation — standard anterior anatomical view ─────────────────
heartGroup.rotation.y = 0.18;
heartGroup.rotation.x = 0.06;

// ─── Auto-rotate until user interacts ────────────────────────────────────────
let userInteracted = false;
renderer.domElement.addEventListener('pointerdown', () => { userInteracted = true; }, { once: true });
renderer.domElement.addEventListener('wheel', () => { userInteracted = true; }, { once: true });

// ─── ANIMATION LOOP ──────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  // Gentle auto-rotate until the user grabs it
  if (!userInteracted) {
    heartGroup.rotation.y = 0.15 + t * 0.22;
    heartGroup.rotation.x = 0.05 + Math.sin(t * 0.15) * 0.06;
  }

  // Subtle heartbeat pulse — systole/diastole feel
  const bpm = 72;
  const bps = bpm / 60;
  const phase = (t * bps) % 1.0;
  const beat = 1.0 + Math.pow(Math.max(0, Math.sin(phase * Math.PI)), 10) * 0.025;
  heartGroup.scale.setScalar(beat);

  controls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// ─── RESIZE ──────────────────────────────────────────────────────────────────
function resizeHeart() {
  const { width, height } = getRootSize();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resizeHeart) : null;
resizeObserver?.observe(root);
window.addEventListener('resize', resizeHeart);

window.addEventListener('meditrack:stop-heart', () => {
  renderer.setAnimationLoop(null);
  resizeObserver?.disconnect();
  window.removeEventListener('resize', resizeHeart);
  controls.dispose();
}, { once: true });
}
