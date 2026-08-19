/**
 * Ambient typing for the vendored Artificer runtime scripts (theme, focus,
 * icons, tabs, whimsy), loaded in index.html as plain `<script defer>` tags
 * — not bundled by Vite. Each `@cameronsjo/artificer/*.js` subpath ships its
 * own `declare global { interface Window { ... } }` augmentation; a
 * TYPE-ONLY import here pulls that augmentation into tsc's view without
 * importing the module's runtime value (erased entirely at compile time —
 * this never adds a script tag or a second bundled copy of the runtime).
 *
 * Replaces the hand-copied focus.d.ts / icons.d.ts / tabs.d.ts / whimsy.d.ts,
 * which drifted from the package's own shipped types by hand-transcription.
 */
import type {} from '@cameronsjo/artificer/theme.js'
import type {} from '@cameronsjo/artificer/focus.js'
import type {} from '@cameronsjo/artificer/icons.js'
import type {} from '@cameronsjo/artificer/tabs.js'
import type {} from '@cameronsjo/artificer/whimsy.js'
