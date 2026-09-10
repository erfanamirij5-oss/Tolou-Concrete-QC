import path from 'node:path';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

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
        noMsi: true
      }
    }
  ],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ]
};
