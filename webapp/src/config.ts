/**
 * Centralized application configuration.
 * All environment-driven values should be read here — never inline `import.meta.env` elsewhere.
 */

/** Base URL of the Node.js backend API (no trailing slash). */
export const API_BASE_URL: string =
    import.meta.env.VITE_API_URL || 'http://localhost:8000';
