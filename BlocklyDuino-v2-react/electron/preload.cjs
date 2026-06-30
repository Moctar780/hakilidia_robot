const { contextBridge } = require('electron');

// Expose une API minimaliste et sécurisée au renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
