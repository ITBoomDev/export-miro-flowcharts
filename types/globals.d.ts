// Ambient types for page globals used by the MAIN-world functions in src/extract.js.
// Dev-time only: nothing in types/ ships with the extension.

interface EmfWatch {
  ver: number;
  events: boolean;
  installed: boolean;
}

interface Window {
  /** Miro's own Web SDK, present in the top frame of a board page. Shape is unverified → any. */
  miro?: any;
  /** Change watcher installed by installWatcher(). */
  __emfWatch?: EmfWatch;
}
