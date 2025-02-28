import { FC, HTMLAttributes, useEffect, useMemo } from 'react';
import {
  addEffect,
  addAfterEffect,
  useThree,
  addTail,
} from '@react-three/fiber';
import GLPerf from './perf';
import create from 'zustand';
import { PerfProps } from '.';
import {
  Material,
  Mesh,
  Points,
  Scene,
  WebGLProgram,
  WebGLRenderer,
} from 'three';
import countGeoDrawCalls from './helpers/countGeoDrawCalls';

type drawCount = {
  type: string;
  drawCount: number;
};
export type drawCounts = {
  total: number;
  type: string;
  data: drawCount[];
};

export type ProgramsPerf = {
  meshes?: {
    [index: string]: Mesh[];
  };
  material: Material;
  program?: WebGLProgram;
  visible: boolean;
  drawCounts: drawCounts;
  expand: boolean;
};

export type ProgramsPerfs = Map<string, ProgramsPerf>;

const isUUID = (uuid: string) => {
  let s: any = '' + uuid;

  s = s.match(
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  );
  if (s === null) {
    return false;
  }
  return true;
};

const addMuiPerfID = (material: Material, currentObjectWithMaterials: any) => {
  if (!material.defines) {
    material.defines = {};
  }

  if (material.defines && !material.defines.muiPerf) {
    material.defines = Object.assign(material.defines || {}, {
      muiPerf: material.uuid,
    });
  }

  const uuid = material.uuid;

  if (!currentObjectWithMaterials[uuid]) {
    currentObjectWithMaterials[uuid] = {
      meshes: {},
      material: material,
    };
    material.needsUpdate = true;
  }
  material.needsUpdate = false;
  // console.log(material);
  // debugger;
  return uuid;
};

export type State = {
  log: any;
  paused: boolean;
  triggerProgramsUpdate: number;
  customData: number;
  chart: {
    data: {
      [index: string]: number[];
    };
    circularId: number;
  };
  gl: WebGLRenderer | undefined;
  scene: Scene | undefined;
  programs: ProgramsPerfs;
  objectWithMaterials: Mesh[] | null;
  tab: 'infos' | 'programs' | 'data';
};


type Logger = {
  i: number;
  maxMemory: number;
  gpu: number;
  mem: number;
  fps: number;
  duration: number;
  frameCount: number;
};

type Chart = {
  data: {
    [index: string]: number[];
  };
  id: number;
  circularId: number;
};

const getMUIIndex = (muid: string) => muid === 'muiPerf';

export const usePerfStore = create<State>(() => ({
  log: null,
  paused: false,
  triggerProgramsUpdate: 0,
  customData: 0,
  chart: {
    data: {
      fps: [],
      gpu: [],
      mem: [],
    },
    circularId: 0,
  },
  gl: undefined,
  objectWithMaterials: null,
  scene: undefined,
  programs: new Map(),
  sceneLength: undefined,
  tab: 'infos',
}));

export const setCustomData = (customData: number) => {
  usePerfStore.setState({customData})
}
export const getCustomData = () => {
  return usePerfStore.getState().customData
}

export const usePerfFunc = () => {
  return {
    log: usePerfStore((state) => state.log),
    gl: usePerfStore((state) => state.gl)?.info,
    programs: usePerfStore((state) => state.programs),
  };
};

export interface Props extends HTMLAttributes<HTMLDivElement> {}

/**
 * Performance profiler component
 */
export const Headless: FC<PerfProps> = ({ trackCPU, chart, deepAnalyze }) => {
  const { gl, scene } = useThree();

  usePerfStore.setState({ gl, scene });

  const PerfLib = useMemo(() => new GLPerf({
    trackGPU: true,
    chartLen: chart ? chart.length : 120,
    chartHz: chart ? chart.hz : 60,
    gl: gl.getContext(),
    chartLogger: (chart: Chart) => {
      usePerfStore.setState({ chart });
    },
    paramLogger: (logger: Logger) => {
      usePerfStore.setState({
        log: {
          maxMemory: logger.maxMemory,
          gpu: logger.gpu,
          mem: logger.mem,
          fps: logger.fps,
          totalTime: logger.duration,
          frameCount: logger.frameCount,
        },
      });
    },
  }), [])

  useEffect(() => {

    gl.info.autoReset = false;
    let effectSub: any = null
    let afterEffectSub: any = null
    if (!gl.info) return

    
    effectSub = addEffect(() => {
      if (usePerfStore.getState().paused) {
        usePerfStore.setState({ paused: false });
      }
      if (PerfLib && gl.info) {
        gl.info.reset();
        PerfLib.begin('profiler');
      }
    });
    afterEffectSub = addAfterEffect(() => {
      if (PerfLib) {
        PerfLib.end('profiler');
        PerfLib.nextFrame(window.performance.now());
      }
      if (deepAnalyze) {
      const currentObjectWithMaterials: any = {};
      const programs: ProgramsPerfs = new Map();

        scene.traverse(function (object) {
          if (object instanceof Mesh || object instanceof Points) {
            if (object.material) {
              let uuid = object.material.uuid;
              // troika generate and attach 2 materials
              const isTroika =
                Array.isArray(object.material) && object.material.length > 1;
              if (isTroika) {
                uuid = addMuiPerfID(
                  object.material[1],
                  currentObjectWithMaterials
                );
              } else {
                uuid = addMuiPerfID(
                  object.material,
                  currentObjectWithMaterials
                );
              }

              currentObjectWithMaterials[uuid].meshes[object.uuid] = object;
            }
          }
        });

        gl?.info?.programs?.forEach((program: any) => {
          const cacheKeySplited = program.cacheKey.split(',');
          const muiPerfTracker =
            cacheKeySplited[cacheKeySplited.findIndex(getMUIIndex) + 1];
          if (
            isUUID(muiPerfTracker) &&
            currentObjectWithMaterials[muiPerfTracker]
          ) {
            const { material, meshes } = currentObjectWithMaterials[
              muiPerfTracker
            ];
            programs.set(muiPerfTracker, {
              program,
              material,
              meshes,
              drawCounts: {
                total: 0,
                type: 'triangle',
                data: [],
              },
              expand: false,
              visible: true,
            });
          }
        });
        if (programs.size !== usePerfStore.getState().programs.size) {
          countGeoDrawCalls(programs);
          usePerfStore.setState({
            programs: programs,
            triggerProgramsUpdate: usePerfStore.getState()
              .triggerProgramsUpdate++,
          });
        }
      }
    });

    return () => {
      if (PerfLib) {
        window.cancelAnimationFrame(PerfLib.rafId);
        window.cancelAnimationFrame(PerfLib.checkQueryId);
      }
      effectSub();
      afterEffectSub();
    };
  }, [PerfLib, gl, trackCPU, chart]);

  useEffect(() => {
    const unsub = addTail(() => {
      if (PerfLib) {
        PerfLib.paused = true;
        usePerfStore.setState({
          paused: true,
          log: {
            maxMemory: 0,
            gpu: 0,
            mem: 0,
            fps: 0,
            totalTime: 0,
            frameCount: 0,
          },
        });
      }
      return false;
    });

    return () => {
      unsub();
    };
  }, []);

  return null;
};
