/* Harmless external execution probe. Reads only this script's own test token. */
(() => {
  'use strict';
  const token = document.currentScript?.dataset.owndaysTestId;
  if (!token) return;
  document.dispatchEvent(new CustomEvent('owndays-external-probe-executed', {
    detail: { token, version: '1.0' }
  }));
})();
