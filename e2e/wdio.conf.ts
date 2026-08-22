import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config: WebdriverIO.Config = {
  hostname: '127.0.0.1',
  port: 4444,
  specs: ['./test/specs/**/*.ts'],
  maxInstances: 1,

  capabilities: [
    {
      maxInstances: 1,
      'wdio:tauriOptions': {
        binary: path.resolve(__dirname, '../src-tauri/target/debug/archivio'),
      },
    },
  ],

  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  services: [
    [
      'tauri',
      {
        appBinaryPath: path.resolve(__dirname, '../src-tauri/target/debug/archivio'),
        driverProvider: 'embedded',
      },
    ],
  ],
};
