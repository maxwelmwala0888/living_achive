import {
  World,
  SessionMode,
  OneHandGrabbable,
  SceneUnderstandingSystem,
  XRPlane,
  createSystem,
  AudioSource,
  PanelUI,
  RayInteractable,
  PokeInteractable,
  ScreenSpace,
  PanelDocument,
  UIKitDocument,
} from '@iwsdk/core';
import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  HemisphereLight,
  DirectionalLight,
  GridHelper,
  Color,
  Vector3,
  Points,
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  AdditiveBlending,
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
  Vector2,
} from 'three';

// ------------------------------------------------------------
// 1. PARTICLE SYSTEM (simple GPU-friendly points)
// ------------------------------------------------------------
class ParticleBurst {
  constructor(scene, position, color = 0x88ccff, count = 40) {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities.push(new Vector3(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.5 + 0.1,
        (Math.random() - 0.5) * 0.3
      ));
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const material = new PointsMaterial({
      color,
      size: 0.008,
      transparent: true,
      opacity: 1.0,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    const points = new Points(geometry, material);
    scene.add(points);

    this.points = points;
    this.velocities = velocities;
    this.life = 1.0;
    this.maxLife = 1.0;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) return false;

    const positions = this.points.geometry.attributes.position.array;
    for (let i = 0; i < this.velocities.length; i++) {
      this.velocities[i].y -= 0.5 * dt; // gravity
      positions[i * 3] += this.velocities[i].x * dt;
      positions[i * 3 + 1] += this.velocities[i].y * dt;
      positions[i * 3 + 2] += this.velocities[i].z * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.opacity = this.life / this.maxLife;
    return true;
  }

  dispose(scene) {
    scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}

// ------------------------------------------------------------
// 2. INTENT PARSER (unchanged)
// ------------------------------------------------------------
function parseIntent(text) {
  const t = text.toLowerCase();
  if (t.includes('rain')) {
    return { action: 'rain', color: 0x3399ff, narration: 'The archive remembers water.' };
  }
  if (t.includes('blue')) {
    return { action: 'recolor', color: 0x3366ff, narration: 'A cool blue spreads through the archive.' };
  }
  if (t.includes('red') || t.includes('warm')) {
    return { action: 'recolor', color: 0xff5533, narration: 'The archive glows with warmth.' };
  }
  if (t.includes('grow') || t.includes('taller')) {
    return { action: 'grow', intensity: 2.0, narration: 'The archive reaches upward.' };
  }
  if (t.includes('new') || t.includes('reset')) {
    return { action: 'reset', narration: 'A new seed takes root.' };
  }
  return { action: 'narrate', narration: 'The archive listens.' };
}

// ------------------------------------------------------------
// 3. SPEECH HELPERS (unchanged)
// ------------------------------------------------------------
function createRecognizer(onResult, onError) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { console.warn('SpeechRecognition unavailable.'); return null; }
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = false;
  r.continuous = false;
  r.onresult = (e) => onResult(e.results[0][0].transcript);
  r.onerror = (e) => onError?.(e.error);
  return r;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0; u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}

// ------------------------------------------------------------
// 4. MAIN BOOT
// ------------------------------------------------------------
(async () => {
  try {
    const container = document.getElementById('app');
    if (!(container instanceof HTMLDivElement)) throw new Error('Missing #app');

    const assets = {
      'control-panel': {
        type: 'uikitml',
        url: '/ui/control-panel.uikitml',
      },
    };

    const world = await World.create(container, {
      assets,
      xr: {
        sessionMode: SessionMode.ImmersiveAR,
        features: { planeDetection: true, meshDetection: true, anchors: true },
        offer: 'once',
      },
      features: {
        grabbing: true,
        locomotion: false,
        spatialUI: true,
      },
    });

    world
      .registerSystem(SceneUnderstandingSystem)
      .registerComponent(XRPlane)
      .registerComponent(AudioSource)
      .registerComponent(PanelUI)
      .registerComponent(RayInteractable)
      .registerComponent(PokeInteractable)
      .registerComponent(ScreenSpace);

    // ---- LIGHTING & BACKGROUND ----
    world.scene.background = new Color(0x05060a);
    world.scene.add(new HemisphereLight(0x88ccff, 0x05060a, 0.8));
    const key = new DirectionalLight(0xffffff, 1.8);
    key.position.set(0.5, 1.5, 0.5);
    world.scene.add(key);
    world.scene.add(new GridHelper(2, 20, 0x224488, 0x112244));

    // ---- POST-PROCESSING (BLOOM) ----
    const composer = new EffectComposer(world.renderer);
    composer.addPass(new RenderPass(world.scene, world.camera));
    const bloom = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      1.2,   // strength
      0.4,   // radius
      0.85   // threshold
    );
    composer.addPass(bloom);
    world.setPostProcessing(composer);

    // ---- SEED MESH ----
    const seed = new Mesh(
      new BoxGeometry(0.08, 0.08, 0.08),
      new MeshStandardMaterial({
        color: 0x88ccff,
        emissive: 0x44aaff,
        emissiveIntensity: 2.0,
        metalness: 0.3,
        roughness: 0.2,
      })
    );
    seed.visible = false;

    const seedEntity = world.createTransformEntity(seed);
    seedEntity.addComponent(OneHandGrabbable, { rotate: true, translate: true });

    // ---- SPATIAL AUDIO SOURCES ON THE SEED ----
    seedEntity.addComponent(AudioSource, {
      src: '/assets/audio/grow.mp3',
      positional: true,
      refDistance: 0.2,
      volume: 0.9,
      loop: false,
    });

    // ---- STATE ----
    let currentSeedPos = new Vector3(0, 0.08, -0.4);
    let isListening = false;
    let recognizer = null;
    const activeParticles = [];

    // ---- EXECUTE INTENT WITH AUDIO + PARTICLES ----
    function executeIntent(intent) {
      console.log('🤖 Intent:', intent);

      // 1. Play spatial grow sound at the seed position
      const audio = seedEntity.getComponent(AudioSource);
      if (audio) audio.play?.();

      // 2. Spawn particle burst at the seed
      if (intent.action === 'grow') {
        activeParticles.push(new ParticleBurst(
          world.scene,
          seed.position.clone(),
          intent.color || 0x88ccff,
          60
        ));
      }

      if (intent.action === 'rain') {
        activeParticles.push(new ParticleBurst(
          world.scene,
          seed.position.clone().add(new Vector3(0, 0.3, 0)),
          0x3399ff,
          120
        ));
      }

      // 3. Narrate
      if (intent.narration) speak(intent.narration);

      // 4. Apply world change
      if (intent.action === 'grow') {
        seed.scale.multiplyScalar(1.15 * (intent.intensity || 1));
      } else if (intent.action === 'recolor' && intent.color) {
        seed.material.color.setHex(intent.color);
        seed.material.emissive.setHex(intent.color);
      } else if (intent.action === 'rain') {
        seed.material.emissive.setHex(0x3399ff);
      } else if (intent.action === 'reset') {
        seed.scale.set(1, 1, 1);
        seed.material.color.setHex(0x88ccff);
        seed.material.emissive.setHex(0x44aaff);
        seed.position.copy(currentSeedPos);
      }
    }

    // ---- PLANE DETECTION ----
    class PlaneAnchorSystem extends createSystem({
      planeEntities: { required: [XRPlane] },
    }) {
      init() {
        this.queries.planeEntities.subscribe('qualify', (entity) => {
          const plane = entity.getComponent(XRPlane);
          if (!plane || plane.orientation !== 'horizontal') return;

          const pos = entity.object3D.position;
          currentSeedPos.copy(pos);
          currentSeedPos.y += 0.04;

          seed.position.copy(currentSeedPos);
          seed.visible = true;

          console.log('🌱 Seed anchored. Use the panel to talk to the archive.');
          speak('The archive is ready. Press the button to speak to it.');

          this.queries.planeEntities.unsubscribe('qualify');
        });
      }
    }

    world.registerSystem(PlaneAnchorSystem);

    // ---- SPATIAL UI SYSTEM ----
    class SpatialUISystem extends createSystem({
      controlPanels: {
        required: [PanelUI, PanelDocument],
        where: [eq(PanelUI, 'config', '/ui/control-panel.uikitml')],
      },
    }) {
      init() {
        this.queries.controlPanels.subscribe('qualify', (entity) => {
          const document = PanelDocument.data.document[entity.index] as UIKitDocument;
          if (!document) return;

          const talkButton = document.getElementById('talk-button') as any;
          const newSeedButton = document.getElementById('new-seed-button') as any;

          if (talkButton) {
            talkButton.addEventListener('click', () => {
              if (isListening) return;
              if (!recognizer) { console.warn('Speech recognition unavailable.'); return; }
              isListening = true;
              console.log('🎤 Listening...');
              speak('Listening.');
              recognizer.start();
            });
          }

          if (newSeedButton) {
            newSeedButton.addEventListener('click', () => {
              console.log('🌱 New Seed pressed.');
              executeIntent({ action: 'reset', narration: 'A new seed takes root.' });
            });
          }
        });
      }
    }

    world.registerSystem(SpatialUISystem);

    // ---- PANEL ----
    const panel = await world.assets.instantiate<UIKitMLAsset>('control-panel');
    const panelEntity = world.createTransformEntity(panel);
    panelEntity.object3D.position.set(0, 1.4, -1.2);
    panelEntity.object3D.scale.setScalar(0.35);
    panelEntity
      .addComponent(RayInteractable)
      .addComponent(PokeInteractable)
      .addComponent(ScreenSpace, {
        width: '280px', height: 'auto',
        bottom: '24px', right: '24px', zOffset: 0.25,
      });

    // ---- SPEECH RECOGNIZER ----
    recognizer = createRecognizer(
      (transcript) => {
        isListening = false;
        console.log('🎤 Heard:', transcript);
        const intent = parseIntent(transcript);
        executeIntent(intent);
      },
      (err) => { isListening = false; console.warn('Speech error:', err); }
    );

    // ---- PARTICLE UPDATE LOOP ----
    world.onUpdate?.((dt) => {
      for (let i = activeParticles.length - 1; i >= 0; i--) {
        const alive = activeParticles[i].update(dt);
        if (!alive) {
          activeParticles[i].dispose(world.scene);
          activeParticles.splice(i, 1);
        }
      }
    });

    // ---- PERFORMANCE SAFEGUARDS ----
    try {
      const session = world.session;
      if (session && 'fixedFoveatedRendering' in session) {
        session.fixedFoveatedRendering.level = 'medium';
        console.log('✅ FFR set to medium');
      }
    } catch (e) { /* FFR not available in emulator */ }

    try {
      if (navigator.xr && 'enableSpaceWarp' in navigator.xr) {
        navigator.xr.enableSpaceWarp(true);
        console.log('✅ SpaceWarp enabled');
      }
    } catch (e) { /* SpaceWarp not available */ }

    console.log('🌍 Waiting for a horizontal plane...');
    console.log('🎤 Press the "Talk to the Archive" button in the panel.');
  } catch (err) {
    console.error('BOOT FAILURE:', err);
  }
})();