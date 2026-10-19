/**
 * Shown when part of the site cannot load because a newer release replaced it (SDD 6).
 * Plain English, because the translations may be in the missing part.
 */
export function NewVersionPage() {
  return (
    <main className="crash container">
      <h1>A new version is available</h1>
      <p>The site was updated while this page was open.</p>
      <p>
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload the page
        </button>
      </p>
    </main>
  );
}
