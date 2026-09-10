import path from 'node:path';

const windowsIcon = path.resolve('assets', 'icons', 'Tolou-Concrete-QC.ico');

export default {
  packagerConfig: {
    asar: true,
    name: 'Tolou Concrete QC',
    executableName: 'TolouConcreteQC',
    icon: windowsIcon,
    prune: true,
    ignore: [
      /^\/\.git($|\/)/,
      /^\/\.github($|\/)/,
      /^\/docs($|\/)/,
      /^\/test($|\/)/,
      /^\/scripts($|\/)/,
      /^\/src($|\/)/,
      /^\/vendor($|\/)/,
      /^\/out($|\/)/
    ]
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'tolou_concrete_qc',
        authors: 'Engineer Erfan Amiri',
        description: 'Tolou Concrete QC — offline Windows concrete quality-control suite',
        setupExe: 'Tolou-Concrete-QC-Setup.exe',
        setupIcon: windowsIcon,
        skipUpdateIcon: true,
        noMsi: true
      }
    }
  ]
};
