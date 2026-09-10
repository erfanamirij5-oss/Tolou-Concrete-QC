const path = require('node:path');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    name: 'Tolou QC License Manager',
    executableName: 'Tolou-QC-License-Manager',
    icon: path.join(__dirname, '..', 'assets', 'icons', 'Tolou-Concrete-QC.ico'),
    asar: true,
    overwrite: true,
    win32metadata: {
      CompanyName: 'Tolou',
      FileDescription: 'Tolou QC License Manager',
      ProductName: 'Tolou QC License Manager'
    }
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'tolou_qc_license_manager',
        setupExe: 'Tolou-QC-License-Manager-Setup.exe',
        setupIcon: path.join(__dirname, '..', 'assets', 'icons', 'Tolou-Concrete-QC.ico')
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-fuses',
      config: {
        version: FuseVersion.V1,
        [FuseV1Options.RunAsNode]: false,
        [FuseV1Options.EnableCookieEncryption]: true,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
        [FuseV1Options.OnlyLoadAppFromAsar]: true
      }
    }
  ]
};
