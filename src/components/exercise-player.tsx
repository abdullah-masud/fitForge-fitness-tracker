"use client";
import { useEffect, useRef, useState } from "react";
import type { Exercise } from "@/lib/types";
import { motionRig, movementHint, type V3, type Rig } from "@/lib/motion-rig";
import { Play, Pause, RotateCcw, ZoomIn } from "lucide-react";
import { Button } from "./ui/button";
import { ExerciseAnimation as Fallback } from "./exercise-art";
type View = "angled" | "front" | "side";
type PlayerApi = { view: (v: View, close: boolean) => void };
export function ExerciseAnimation({ exercise }: { exercise: Exercise }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<PlayerApi | null>(null);
  const phaseRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [phase, setPhase] = useState(0);
  const [view, setView] = useState<View>("angled");
  const [close, setClose] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    setPlaying(!media.matches);
    const onChange = () => {
      if (media.matches) setPlaying(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    const container = host.current;
    if (!container) return;
    async function init() {
      try {
        const T = await import("three");
        const { OrbitControls } =
          await import("three/addons/controls/OrbitControls.js");
        if (disposed) return;
        const renderer = new T.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
        renderer.setClearColor("#142035");
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.domElement.setAttribute(
          "aria-label",
          `${exercise.name} rotatable 3D demonstration`,
        );
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.dataset.renderer = "true-3d";
        container!.appendChild(renderer.domElement);
        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(38, 1, 0.05, 30);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.minDistance = 1.1;
        controls.maxDistance = 6;
        controls.maxPolarAngle = Math.PI * 0.85;
        scene.add(new T.HemisphereLight("#d9eaff", "#172033", 2.4));
        const key = new T.DirectionalLight("#ffffff", 3.3);
        key.position.set(-2, 4, 3);
        scene.add(key);
        const rim = new T.DirectionalLight("#569cff", 2.4);
        rim.position.set(2, 2, -3);
        scene.add(rim);
        const skin = new T.MeshStandardMaterial({
          color: "#e4b48e",
          roughness: 0.68,
        });
        const shirt = new T.MeshStandardMaterial({
          color: "#3278df",
          roughness: 0.72,
        });
        const shorts = new T.MeshStandardMaterial({
          color: "#263b59",
          roughness: 0.75,
        });
        const shoe = new T.MeshStandardMaterial({
          color: "#d9e8fa",
          roughness: 0.5,
        });
        const metal = new T.MeshStandardMaterial({
          color: "#476181",
          metalness: 0.55,
          roughness: 0.35,
        });
        const left = new T.MeshStandardMaterial({
          color: "#43dfce",
          roughness: 0.6,
        });
        const right = new T.MeshStandardMaterial({
          color: "#ffaf60",
          roughness: 0.6,
        });
        const sphere = new T.SphereGeometry(1, 18, 12),
          cylinder = new T.CylinderGeometry(1, 1, 1, 14),
          box = new T.BoxGeometry(1, 1, 1);
        const up = new T.Vector3(0, 1, 0);
        const a = new T.Vector3(),
          b = new T.Vector3();
        const mesh = (
          geometry: typeof sphere | typeof cylinder | typeof box,
          material: typeof skin,
        ) => {
          const m = new T.Mesh(geometry, material);
          scene.add(m);
          return m;
        };
        const ball = (material: typeof skin) => mesh(sphere, material);
        const head = ball(skin),
          nose = ball(skin),
          torso = ball(shirt),
          pelvis = ball(shorts);
        const neck = mesh(cylinder, skin);
        const shoulderJoints = [ball(shirt), ball(shirt)];
        const collars = [mesh(cylinder, shirt), mesh(cylinder, shirt)];
        const eyeMaterial = new T.MeshStandardMaterial({
          color: "#2b2730",
          roughness: 0.8,
        });
        const eyes = [ball(eyeMaterial), ball(eyeMaterial)];
        const limbs = Array.from({ length: 8 }, (_, i) =>
          mesh(cylinder, i >= 4 && i % 2 === 0 ? shorts : skin),
        );
        const joints = Array.from({ length: 8 }, () => ball(skin));
        const palms = [ball(skin), ball(skin)];
        const fingers = Array.from({ length: 10 }, () => mesh(cylinder, skin));
        const bands = [ball(left), ball(right)];
        const shoes = [mesh(box, shoe), mesh(box, shoe)];
        const toes = [ball(shoe), ball(shoe)];
        const weights = Array.from({ length: 2 }, () => {
          const group = new T.Group();
          const bar = new T.Mesh(cylinder, metal);
          bar.scale.set(0.018, 0.23, 0.018);
          bar.rotation.z = Math.PI / 2;
          group.add(bar);
          for (const x of [-0.115, 0.115]) {
            const end = new T.Mesh(cylinder, metal);
            end.scale.set(0.075, 0.055, 0.075);
            end.rotation.z = Math.PI / 2;
            end.position.x = x;
            group.add(end);
          }
          scene.add(group);
          return group;
        });
        const kb = ball(metal);
        const kbHandle = new T.Mesh(
          new T.TorusGeometry(0.065, 0.014, 8, 16),
          metal,
        );
        scene.add(kbHandle);
        const bench = mesh(box, shorts);
        const supports = [mesh(box, metal), mesh(box, metal)];
        const mat = mesh(
          box,
          new T.MeshStandardMaterial({ color: "#253c58", roughness: 1 }),
        );
        mat.position.set(0, 0.01, 0);
        mat.scale.set(1.1, 0.02, 2.2);
        const grid = new T.GridHelper(5, 20, "#3b577b", "#243750");
        grid.position.y = -0.005;
        scene.add(grid);
        const tubeMaterial = new T.LineBasicMaterial({ color: "#f6c668" });
        const tubes = Array.from({ length: 2 }, () => {
          const g = new T.BufferGeometry().setFromPoints([
            new T.Vector3(),
            new T.Vector3(),
          ]);
          const l = new T.Line(g, tubeMaterial);
          scene.add(l);
          return l;
        });
        const position = (m: typeof head, v: V3, scale: V3) => {
          m.position.set(...v);
          m.scale.set(...scale);
        };
        const bone = (m: typeof neck, from: V3, to: V3, radius: number) => {
          a.set(...from);
          b.set(...to);
          m.position.copy(a).add(b).multiplyScalar(0.5);
          const length = a.distanceTo(b);
          m.scale.set(radius, length, radius);
          m.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
        };
        const setView = (v: View, focus: boolean) => {
          const p = motionRig(
            exercise,
            (1 - Math.cos(phaseRef.current * 2 * Math.PI)) / 2,
          );
          const ground =
            p.floor || ["bench", "incline", "row"].includes(exercise.pose);
          const target = focus
            ? new T.Vector3(...p.lh)
                .add(new T.Vector3(...p.rh))
                .multiplyScalar(0.5)
            : new T.Vector3(0, ground ? 0.54 : 0.98, 0);
          controls.target.copy(target);
          const radius = focus ? 1.65 : ground ? 3.65 : 3.7;
          const angle =
            v === "front" ? 0 : v === "side" ? Math.PI / 2 : Math.PI / 5;
          camera.position.set(
            target.x + Math.sin(angle) * radius,
            target.y + (focus ? 0.28 : 0.55),
            target.z + Math.cos(angle) * radius,
          );
          camera.lookAt(target);
          controls.update();
        };
        api.current = { view: setView };
        setView("angled", false);
        const resize = () => {
          const w = container!.clientWidth,
            h = container!.clientHeight;
          renderer.setSize(w, h, false);
          camera.aspect = w / Math.max(h, 1);
          camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(container!);
        resize();
        let previous = 0,
          lastUI = 0;
        const draw = (now: number) => {
          if (disposed) return;
          if (
            previous &&
            playingRef.current &&
            document.visibilityState === "visible"
          )
            phaseRef.current =
              (phaseRef.current +
                (Math.min(now - previous, 60) * speedRef.current) / 6500) %
              1;
          previous = now;
          const t =
            exercise.id === "plank"
              ? 0
              : (1 - Math.cos(phaseRef.current * 2 * Math.PI)) / 2;
          const p = motionRig(exercise, t);
          if (now - lastUI > 90) {
            setPhase(phaseRef.current);
            lastUI = now;
          }
          position(head, p.head, [0.105, 0.137, 0.105]);
          const lying = [
            "bench",
            "incline",
            "floor",
            "crunch",
            "deadbug",
          ].includes(exercise.pose);
          const prone = [
            "pushup",
            "inclinepush",
            "plank",
            "mobility",
            "row",
          ].includes(exercise.pose);
          position(
            nose,
            [
              p.head[0],
              p.head[1] + (lying ? 0.095 : prone ? -0.085 : 0),
              p.head[2] + (lying ? 0 : prone ? -0.05 : 0.1),
            ],
            [0.025, 0.03, 0.027],
          );
          bone(neck, p.chest, p.head, 0.045);
          [p.ls, p.rs].forEach((s, i) => {
            position(shoulderJoints[i], s, [0.077, 0.075, 0.08]);
            bone(collars[i], p.chest, s, 0.075);
            position(
              eyes[i],
              [
                p.head[0] + (i ? 1 : -1) * 0.035,
                p.head[1] + (lying ? 0.105 : prone ? -0.09 : 0.032),
                p.head[2] + (lying ? -0.03 : prone ? -0.035 : 0.095),
              ],
              [0.009, 0.009, 0.009],
            );
          });
          position(
            torso,
            [
              (p.chest[0] + p.hip[0]) / 2,
              (p.chest[1] + p.hip[1]) / 2,
              (p.chest[2] + p.hip[2]) / 2,
            ],
            [0.225, 0.29, 0.135],
          );
          a.set(...p.hip);
          b.set(...p.chest);
          torso.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
          position(pelvis, p.hip, [0.2, 0.125, 0.13]);
          pelvis.quaternion.copy(torso.quaternion);
          const pairs: [keyof Rig, keyof Rig][] = [
            ["ls", "le"],
            ["le", "lh"],
            ["rs", "re"],
            ["re", "rh"],
            ["hip", "lk"],
            ["lk", "lf"],
            ["hip", "rk"],
            ["rk", "rf"],
          ];
          pairs.forEach(([from, to], i) => {
            const start = [...(p[from] as V3)] as V3;
            if (from === "hip") start[0] = i === 4 ? -0.12 : 0.12;
            bone(
              limbs[i],
              start,
              p[to] as V3,
              i >= 4
                ? i % 2 === 0
                  ? 0.085
                  : 0.06
                : i % 2 === 0
                  ? 0.06
                  : 0.045,
            );
            position(joints[i], p[to] as V3, [
              i >= 4 ? 0.062 : 0.045,
              i >= 4 ? 0.062 : 0.045,
              i >= 4 ? 0.062 : 0.045,
            ]);
          });
          for (let i = 0; i < 2; i++) {
            const hand = i === 0 ? p.lh : p.rh;
            const elbow = i === 0 ? p.le : p.re;
            position(palms[i], hand, [0.045, 0.065, 0.027]);
            a.set(...elbow);
            b.set(...hand);
            palms[i].quaternion.setFromUnitVectors(up, b.sub(a).normalize());
            position(bands[i], hand, [0.052, 0.025, 0.036]);
            bands[i].quaternion.copy(palms[i].quaternion);
            for (let j = 0; j < 5; j++) {
              const f = fingers[i * 5 + j];
              f.position.set(
                hand[0] + (j - 2) * 0.015,
                hand[1] - 0.045,
                hand[2] + 0.025,
              );
              f.scale.set(0.008, 0.045, 0.008);
              f.quaternion.copy(palms[i].quaternion);
            }
            const foot = i === 0 ? p.lf : p.rf;
            position(
              shoes[i],
              [foot[0], foot[1] - 0.03, foot[2] + 0.06],
              [0.115, 0.075, 0.2],
            );
            position(
              toes[i],
              [foot[0], foot[1] - 0.03, foot[2] + 0.15],
              [0.058, 0.038, 0.065],
            );
            shoes[i].rotation.x = exercise.pose === "calf" ? -t * 0.35 : 0;
            weights[i].visible =
              exercise.load === "dumbbell" &&
              (exercise.count === 2 || i === (exercise.unilateral ? 1 : 0));
            weights[i].position.set(...hand);
            weights[i].rotation.z = ["hammer", "bandhammer"].includes(
              exercise.pose,
            )
              ? Math.PI / 2
              : 0;
            if (exercise.count === 1 && !exercise.unilateral)
              weights[i].position.set(
                (p.lh[0] + p.rh[0]) / 2,
                (p.lh[1] + p.rh[1]) / 2,
                (p.lh[2] + p.rh[2]) / 2,
              );
            const line = tubes[i];
            line.visible = exercise.load === "band";
            const anchor: V3 =
              exercise.pose === "pulldown"
                ? [0, 2.2, 0.15]
                : exercise.pose === "bandrow"
                  ? [0, 1.25, 1.1]
                  : [foot[0], 0.02, foot[2]];
            const attr = line.geometry.getAttribute("position");
            attr.setXYZ(0, ...anchor);
            attr.setXYZ(1, ...hand);
            attr.needsUpdate = true;
            line.geometry.computeBoundingSphere();
          }
          kb.visible = kbHandle.visible = exercise.load === "kettlebell";
          position(kb, [0, p.lh[1] - 0.1, p.lh[2]], [0.095, 0.1, 0.095]);
          kbHandle.position.set(0, p.lh[1] - 0.01, p.lh[2]);
          bench.visible = p.bench;
          supports.forEach((m) => (m.visible = p.bench));
          bench.position.set(
            0,
            0.57,
            exercise.pose === "inclinepush" ? -0.48 : 0,
          );
          bench.scale.set(
            0.46,
            0.13,
            exercise.pose === "inclinepush" ? 0.6 : 1.3,
          );
          bench.rotation.x = exercise.pose === "incline" ? -0.3 : 0;
          supports.forEach((m, i) => {
            m.position.set(0, 0.26, (i ? 1 : -1) * 0.4);
            m.scale.set(0.08, 0.52, 0.08);
          });
          mat.visible = p.floor;
          controls.update();
          renderer.render(scene, camera);
        };
        renderer.setAnimationLoop(draw);
        setLoaded(true);
        const contextLost = (e: Event) => {
          e.preventDefault();
          cleanup();
          setFailed(true);
        };
        renderer.domElement.addEventListener("webglcontextlost", contextLost);
        cleanup = () => {
          renderer.setAnimationLoop(null);
          observer.disconnect();
          controls.dispose();
          renderer.domElement.removeEventListener(
            "webglcontextlost",
            contextLost,
          );
          const geometries = new Set<import("three").BufferGeometry>(),
            materials = new Set<import("three").Material>();
          scene.traverse((o) => {
            if (o instanceof T.Mesh || o instanceof T.Line) {
              geometries.add(o.geometry);
              (Array.isArray(o.material) ? o.material : [o.material]).forEach(
                (m) => materials.add(m),
              );
            }
          });
          geometries.forEach((g) => g.dispose());
          materials.forEach((m) => m.dispose());
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
          api.current = null;
        };
      } catch {
        if (!disposed) setFailed(true);
      }
    }
    void init();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [exercise]);
  if (failed)
    return (
      <>
        <p className="notice">
          3D isn’t available in this browser. The basic movement guide is shown
          below.
        </p>
        <Fallback exercise={exercise} />
      </>
    );
  const choose = (v: View, c = close) => {
    setView(v);
    setClose(c);
    api.current?.view(v, c);
  };
  return (
    <section
      className="movement-player real-3d"
      aria-label={`${exercise.name} animated demonstration`}
    >
      <div className="movement-top">
        <span className="eyebrow">ROTATABLE 3D GUIDE</span>
        <span className="movement-phase">
          {exercise.id === "plank"
            ? "Hold & breathe"
            : phase < 0.5
              ? "Controlled movement"
              : "Controlled return"}
        </span>
      </div>
      <div className="view-controls" aria-label="Camera views">
        {(["angled", "front", "side"] as const).map((v) => (
          <button key={v} aria-pressed={view === v} onClick={() => choose(v)}>
            {v === "angled"
              ? "3/4 view"
              : v === "front"
                ? "Front view"
                : "Side view"}
          </button>
        ))}
        <button aria-pressed={close} onClick={() => choose(view, !close)}>
          <ZoomIn size={14} />
          {close ? "Full body" : "Hands close-up"}
        </button>
      </div>
      <div ref={host} className="three-stage">
        {!loaded && <p className="three-loading">Loading 3D movement…</p>}
      </div>
      <div className="three-legend">
        <span>
          <i className="left-hand" /> Left hand
        </span>
        <span>
          <i className="right-hand" /> Right hand
        </span>
        <small>Drag to rotate · pinch to zoom</small>
      </div>
      <div className="movement-controls">
        <Button
          variant="outline"
          size="sm"
          aria-label={playing ? "Pause demonstration" : "Play demonstration"}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Restart demonstration"
          onClick={() => {
            phaseRef.current = 0;
            setPhase(0);
          }}
        >
          <RotateCcw size={16} />
        </Button>
        <label className="speed-label">
          Speed
          <select
            aria-label="Demonstration speed"
            value={speed}
            onChange={(e) => setSpeed(+e.target.value)}
          >
            <option value={0.5}>Slow · 0.5×</option>
            <option value={1}>Normal · 1×</option>
          </select>
        </label>
      </div>
      <input
        className="movement-scrubber"
        type="range"
        min="0"
        max="1000"
        value={Math.round(phase * 1000)}
        aria-label="Scrub demonstration"
        onChange={(e) => {
          setPlaying(false);
          playingRef.current = false;
          phaseRef.current = +e.target.value / 1000;
          setPhase(phaseRef.current);
        }}
      />
      <div className="movement-cue">
        <p>{movementHint(exercise)}</p>
      </div>
      <p className="movement-note">
        Original instructional model, not motion capture. Follow the written
        technique cues. {exercise.unilateral ? "Repeat on both sides." : ""}
      </p>
    </section>
  );
}
