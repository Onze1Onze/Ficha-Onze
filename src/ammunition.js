/**
 * One distinct vector silhouette for each cartridge type.
 * SVGs are inline so the ammunition panel never depends on external icon files.
 */
export const AMMO_SVGS = Object.freeze({
  // Short, rounded 9×19 mm FMJ with a narrow case and visible extractor groove.
  pistol: `<path d="M12 2.5c-2.25 2.35-3.05 4.35-3.05 7.15v11.6c0 2 1.36 3.25 3.05 3.25s3.05-1.25 3.05-3.25V9.65c0-2.8-.8-4.8-3.05-7.15Z"/><path d="M8.95 18.5h6.1v2.2h-6.1Z"/><path d="M9.2 21.1h5.6v1.4c-.8.7-1.75 1-2.8 1s-2-.3-2.8-1Z"/>`,
  // Broad, rounded-nose revolver slug with a pronounced rimmed brass case.
  revolver: `<path d="M12 3.4c-2.9 2.1-4.3 4.25-4.3 7.2v8.1c0 2.25 1.85 3.5 4.3 3.5s4.3-1.25 4.3-3.5v-8.1c0-2.95-1.4-5.1-4.3-7.2Z"/><path d="M7.7 18.1h8.6v2.2H7.7Z"/><path d="M6.7 21h10.6v2.2c-1.45 1-3.2 1.45-5.3 1.45S8.15 24.2 6.7 23.2Z"/><path d="M8.1 19.1h7.8" fill="none" stroke-width="1.1"/>`,
  // Heavy belted cartridge: long projectile, reinforced case and broad belt groove.
  heavy: `<path d="M12 1.4c-1.85 2.65-2.8 5.35-2.8 8.25v10.4c0 2.15 1.25 3.3 2.8 3.3s2.8-1.15 2.8-3.3V9.65c0-2.9-.95-5.6-2.8-8.25Z"/><path d="M9.2 17h5.6v2.2H9.2Z"/><path d="M8.4 21.2h7.2v1.85H8.4Z"/><path d="M9.1 23.1h5.8v1.1H9.1Z"/>`,
  // Intermediate rifle cartridge with a long pointed projectile and tapered shoulder.
  rifle: `<path d="M12 1.1c-1.65 3.65-2.45 6.6-2.45 9.35v3.4l-1.2 2.25v5.05c0 1.8 1.5 2.65 3.65 2.65s3.65-.85 3.65-2.65V16.1l-1.2-2.25v-3.4c0-2.75-.8-5.7-2.45-9.35Z"/><path d="M8.4 19.2h7.2v2.1H8.4Z"/><path d="M9.1 23.1h5.8v.8H9.1Z"/>`,
  // Shotgun shell with a crimped star closure, cylindrical hull and metal base.
  shell: `<path d="M7.2 5.8h9.6v15.4c0 2.05-2.15 3.25-4.8 3.25s-4.8-1.2-4.8-3.25Z"/><path d="M7.2 8.1h9.6M7.2 10.2h9.6M8.2 5.8V3.7l1.3-1.2 1.25 1.1 1.25-1.1 1.25 1.1 1.25-1.1 1.25 1.2v2.1"/><path d="M6.4 21.2h11.2v2.1H6.4Z"/><path d="M8.2 24.1h7.6" fill="none" stroke-width="1.2"/>`,
  // Compact SMG round: short projectile, compact case and visible case mouth.
  compact: `<path d="M12 4.1c-2.45 2.1-3.3 3.95-3.3 6.35v7.25c0 2.2 1.3 3.35 3.3 3.35s3.3-1.15 3.3-3.35v-7.25c0-2.4-.85-4.25-3.3-6.35Z"/><path d="M8.7 16.8h6.6v2.2H8.7Z"/><path d="M8 20.9h8v2c-1.05.7-2.35 1.05-4 1.05s-2.95-.35-4-1.05Z"/>`,
  // Precision projectile: extra-long ogive, slim profile and boat-tail base.
  precision: `<path d="M12 1c-1.45 4.4-2.1 7.9-2.1 11v6.9c0 1.45.8 2.65 2.1 2.65s2.1-1.2 2.1-2.65V12c0-3.1-.65-6.6-2.1-11Z"/><path d="M9.9 18.7h4.2l1.25 3.25h-6.7Z"/><path d="M9.25 22h5.5v1.5h-5.5Z"/>`,
  // Hunting soft-point: broad flat exposed tip, expanding shoulder and brass casing.
  hunting: `<path d="M9.1 3h5.8v2.3c0 2.2-.65 3.35-1.3 4.65l-.6 1.3c-.3.65-.5 1.1-.5 2.1v5.8c0 2.2-1.1 3.25-2.9 3.25s-2.9-1.05-2.9-3.25v-6.6c0-2.35.65-3.55 1.45-5.1L9.1 5.2Z"/><path d="M7.1 18.4h7.7v2.1H7.1Z"/><path d="M6.4 21h9.1v2.2c-1.3.9-2.8 1.35-4.55 1.35S7.7 24.1 6.4 23.2Z"/>`,
});
