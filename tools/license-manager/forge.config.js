import path from 'node:path';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const root = path.resolve(process.cwd(), '..');
const windowsIcon = path.resolve(root, 'assets', 'icons', 'Tolou-Concrete-QC.ico');

export default {
  packagerConfig: {
    asar: true,
    name: 'Tolou License Manager',
    executableName: 'TolouLicenseManager',
    icon: windowsIcon,
    prune: true,
    ignore: [/^\/out($|\/)/]
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'tolou_license_manager',
        authors: 'Engineer Erfan Amiri',
        description: 'Tolou License Manager — owner-only offline license generator',
        setupExe: 'Tolou-License-Manager-Setup.exe',
        setupIcon: windowsIcon,
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
