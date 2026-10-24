/* SBA Checklisten — Laufzeitkonfiguration (kein Modul, wird vor der App geladen).
 * apiBase: Adresse des Cloudflare Workers. Wird vom Workflow «Setup worker» eingetragen.
 * Leer = lokaler Modus ohne Server.
 */
window.CHECKLISTS_CONFIG = {
  apiBase: 'https://checklists-api.balthasar.workers.dev',
};
