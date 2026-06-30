import { type CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cc.hakilidia.blocklyia',
  appName: 'Blockly IA',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
