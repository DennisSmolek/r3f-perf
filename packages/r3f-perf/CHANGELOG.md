# R3F-Perf

## 6.0.1:
- Enable jsx runtime #31
- Simplify logic in <Html> (remove babel generated code + move React root creation inside effect)

Thanks @alexandernanberg
## 6.0.0:
- Update r3f-perf to React v18 and R3F v8
- Fix an issue where the numbers were not getting displayed sometimes.

## 5.4.0:
- New `minimal` option. Useful for smartphone and smaller viewports.
- New `customData` option (See [README](https://github.com/utsuboco/r3f-perf)). Introducing custom data log. Can be useful for logging your physic fps for instance.
- New getter setter `setCustomData()` and `getCustomData()` methods to update the customData information.
- Added `/` before maxMemory.

## 5.3.2:
- Fix memory leak createQuery stacking in WebGL2 context
## 5.3.1:
- Fix potential memory leak when gl context is lost.

## 5.3.0:
- New parameter "antialiasing", enabled by default. 
- Tool is now slightly transparent

## 5.2.0:
- Removed the CPU monitoring as it is not relevant enough.
- Fix an issue where the graphs would disappear on HMR #23.
- Added new `maxMemory` information which represent the `jsHeapSizeLimit`. Requires `window.performance.memory`.
- Added memory graph monitor, it represents the real-time memory usage divided by the max memory.
- Replaced the dom text with 3D text using [troika-text](https://github.com/protectwise/troika/tree/master/packages/troika-3d-text)
- Replaced React-Icons by [Radix-Icons](https://icons.modulz.app/). related: #26 
- Removed candygraph (regl), rafz, lerp dependencies
- Graphs are now drawn with threejs and custom buffer attributes.
- Added new parameter `deepAnalyze` in order to show further information about programs. Set to false by default.
- Increased refresh rate of the logs.
- The logs and the graphs are always shown even in the programs tab.
- Dev: updated package to the latest dependencies. related: #27
