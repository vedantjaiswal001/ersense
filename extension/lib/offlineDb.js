/**
 * offlineDb - a curated knowledge base of the errors developers actually
 * hit most often. Powers ER Sense with zero API key, and gives instant
 * answers for well-known errors even when a key is present.
 *
 * Each entry:
 *   { id, title, severity, languages[], match(RegExp), summary,
 *     causes[], fixes[{text, code?}], docs? }
 */

export const KB = [
  /* ---------------- JavaScript / TypeScript ---------------- */
  {
    id: 'js-undefined-prop',
    title: "Reading a property of undefined",
    severity: 'high',
    languages: ['javascript', 'typescript'],
    match: /Cannot read propert(?:y|ies) of undefined/i,
    summary:
      "Your code tried to read a property (like `.name` or `.map`) from a value that is `undefined`. JavaScript can't look inside `undefined`, so it throws before the property is ever reached.",
    causes: [
      'A variable or object key you expected to exist was never set, or was misspelled.',
      'Data arrived asynchronously (an API call, props, state) and you accessed it before it loaded.',
      'A function returned nothing (`undefined`) and you used the result directly.',
      'An array/object index that does not exist was accessed.',
    ],
    fixes: [
      {
        text: 'Use optional chaining so a missing value short-circuits to `undefined` instead of throwing.',
        code: `// before\nconst city = user.address.city;\n\n// after\nconst city = user?.address?.city;`,
      },
      {
        text: 'Guard the access, or provide a default with the nullish-coalescing operator.',
        code: `const items = data?.items ?? [];\nitems.map(render); // safe even while data is loading`,
      },
      {
        text: 'Log the value right before the failing line to confirm what it actually is.',
        code: `console.log('user is:', user);`,
      },
    ],
    docs: {
      label: 'MDN - Optional chaining',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining',
    },
  },
  {
    id: 'js-null-prop',
    title: 'Reading a property of null',
    severity: 'high',
    languages: ['javascript', 'typescript'],
    match: /Cannot read propert(?:y|ies) of null/i,
    summary:
      "You accessed a property on `null`. This is common with DOM lookups - `document.querySelector` / `getElementById` returns `null` when nothing matches.",
    causes: [
      'A DOM element was queried before it existed in the page, or the selector/id is wrong.',
      'A value was explicitly set to `null` and then used as if it were an object.',
      'An API returned `null` for a field you assumed was always present.',
    ],
    fixes: [
      {
        text: 'Make sure the script runs after the element exists, and check the result before using it.',
        code: `const el = document.getElementById('app');\nif (el) {\n  el.textContent = 'ready';\n}`,
      },
      {
        text: 'For scripts in <head>, defer them or wait for DOMContentLoaded.',
        code: `<script src="app.js" defer></script>`,
      },
    ],
  },
  {
    id: 'js-not-a-function',
    title: 'Value is not a function',
    severity: 'high',
    languages: ['javascript', 'typescript'],
    match: /is not a function/i,
    summary:
      'You called something with `()` that is not actually a function - often a typo, a wrong import, or a value that is `undefined` at call time.',
    causes: [
      'A method name is misspelled or does not exist on that type (e.g. `arr.push()` on a non-array).',
      'A named/default import mismatch - you imported the wrong shape from a module.',
      'The value is `undefined` because it was not assigned before being called.',
      '`this` is not what you expect inside a callback, so the method is missing.',
    ],
    fixes: [
      {
        text: 'Check the exact type and available methods of the value before calling it.',
        code: `console.log(typeof thing, thing);\n// "object" with no .map? It's probably not an array.`,
      },
      {
        text: 'Verify the import matches how the module exports it.',
        code: `// default export\nimport doThing from './thing';\n// named export\nimport { doThing } from './thing';`,
      },
    ],
  },
  {
    id: 'js-not-defined',
    title: 'Variable is not defined',
    severity: 'medium',
    languages: ['javascript', 'typescript'],
    match: /(\w+) is not defined|ReferenceError/i,
    summary:
      "A name was used that JavaScript has never seen in the current scope. It was never declared, is out of scope, or is misspelled.",
    causes: [
      'A typo in the variable or function name.',
      'The variable is declared in another scope/file and not imported.',
      'A block-scoped `let`/`const` was used before its declaration line.',
      'A browser-only global (like `window`) was used in a Node/SSR environment.',
    ],
    fixes: [
      {
        text: 'Declare or import the name before using it, and check spelling and casing.',
        code: `import { helper } from './utils';\n// or\nconst helper = () => { /* ... */ };`,
      },
      {
        text: 'For SSR, guard browser globals so they only run in the browser.',
        code: `if (typeof window !== 'undefined') {\n  // safe to use window/document here\n}`,
      },
    ],
  },
  {
    id: 'js-max-callstack',
    title: 'Maximum call stack size exceeded',
    severity: 'high',
    languages: ['javascript', 'typescript'],
    match: /Maximum call stack size exceeded/i,
    summary:
      'A function is calling itself (directly or in a cycle) with no stopping condition, so the call stack fills up until the engine gives up.',
    causes: [
      'A recursive function is missing or never reaches its base case.',
      'Two functions call each other in a loop.',
      'A React effect/state update triggers itself endlessly.',
    ],
    fixes: [
      {
        text: 'Add a base case that stops the recursion.',
        code: `function countdown(n) {\n  if (n <= 0) return;   // base case\n  countdown(n - 1);\n}`,
      },
    ],
  },
  {
    id: 'js-json-parse',
    title: 'Unexpected end / token in JSON',
    severity: 'medium',
    languages: ['javascript', 'typescript'],
    match: /Unexpected (end of JSON input|token .* in JSON|non-whitespace)/i,
    summary:
      '`JSON.parse` received something that is not valid JSON - often an empty response, an HTML error page, or a trailing comma.',
    causes: [
      'You parsed a fetch response that was empty or an HTML/error page, not JSON.',
      'The JSON has a trailing comma, single quotes, or an unquoted key.',
      'You called `.json()` on a failed request.',
    ],
    fixes: [
      {
        text: 'Check the response is OK and actually JSON before parsing.',
        code: `const res = await fetch(url);\nif (!res.ok) throw new Error(res.status);\nconst data = await res.json();`,
      },
      {
        text: 'Log the raw text to see what you actually received.',
        code: `const text = await res.text();\nconsole.log(text); // is this HTML? empty?`,
      },
    ],
  },

  /* ---------------- React ---------------- */
  {
    id: 'react-object-child',
    title: 'Objects are not valid as a React child',
    severity: 'medium',
    languages: ['javascript', 'typescript'],
    framework: 'React',
    match: /Objects are not valid as a React child/i,
    summary:
      'You tried to render a plain object (or a Promise) directly in JSX. React can render strings, numbers, and elements - not raw objects.',
    causes: [
      'Rendering an object like `{user}` instead of a field like `{user.name}`.',
      'Rendering the result of an async function (a Promise) directly.',
      'Forgetting to `.map()` an array of objects into elements.',
    ],
    fixes: [
      {
        text: 'Render a specific primitive field, not the whole object.',
        code: `// before\n<p>{user}</p>\n// after\n<p>{user.name}</p>`,
      },
      {
        text: 'Map arrays of objects into elements with a key.',
        code: `{users.map((u) => (\n  <li key={u.id}>{u.name}</li>\n))}`,
      },
    ],
  },
  {
    id: 'react-too-many-renders',
    title: 'Too many re-renders / Maximum update depth',
    severity: 'high',
    languages: ['javascript', 'typescript'],
    framework: 'React',
    match: /Too many re-renders|Maximum update depth exceeded/i,
    summary:
      'A component updates state during render (or in an effect with no proper dependencies), which triggers another render, forever.',
    causes: [
      'Calling a setter directly in the render body: `onClick={setState(x)}` instead of `onClick={() => setState(x)}`.',
      'A `useEffect` that sets state but is missing a dependency array, or depends on a value it also updates.',
      'Creating a new object/array each render and using it as an effect dependency.',
    ],
    fixes: [
      {
        text: 'Pass a function reference to handlers - do not call the setter during render.',
        code: `// before  (runs on every render)\n<button onClick={setCount(count + 1)} />\n// after\n<button onClick={() => setCount(count + 1)} />`,
      },
      {
        text: 'Give effects a correct dependency array.',
        code: `useEffect(() => {\n  load();\n}, []); // run once on mount`,
      },
    ],
  },
  {
    id: 'react-invalid-hook',
    title: 'Invalid hook call',
    severity: 'high',
    languages: ['javascript', 'typescript'],
    framework: 'React',
    match: /Invalid hook call|Hooks can only be called inside/i,
    summary:
      'A hook (like `useState`) was called somewhere React does not allow - outside a component, conditionally, or with a duplicate/mismatched React copy.',
    causes: [
      'Calling a hook inside a condition, loop, or regular function.',
      'Two copies of React in node_modules (common with linked packages).',
      'A mismatch between the React and React-DOM versions.',
    ],
    fixes: [
      {
        text: 'Call hooks only at the top level of a component or a custom hook.',
        code: `function Panel() {\n  const [open, setOpen] = useState(false); // top level, unconditional\n  // ...\n}`,
      },
      {
        text: 'Check for duplicate React installs.',
        code: `npm ls react`,
      },
    ],
  },
  {
    id: 'react-key-prop',
    title: 'Missing "key" prop in a list',
    severity: 'low',
    languages: ['javascript', 'typescript'],
    framework: 'React',
    match: /unique "key" prop|Each child in a (?:list|array)/i,
    summary:
      'A warning, not a crash. React needs a stable `key` on each item in a rendered list so it can track items efficiently across renders.',
    causes: [
      'A `.map()` returns elements without a `key`.',
      'The array index is used as a key while the list reorders (can cause subtle bugs).',
    ],
    fixes: [
      {
        text: 'Give each element a stable, unique key - ideally a real id.',
        code: `{todos.map((t) => (\n  <li key={t.id}>{t.text}</li>\n))}`,
      },
    ],
  },

  /* ---------------- Node / npm / network ---------------- */
  {
    id: 'node-module-not-found',
    title: 'Cannot find module',
    severity: 'high',
    languages: ['javascript', 'typescript'],
    framework: 'Node.js',
    match: /Cannot find module|Module not found|ERR_MODULE_NOT_FOUND/i,
    summary:
      'Node/the bundler could not resolve an import path. Either the package is not installed, or the relative path is wrong.',
    causes: [
      'The dependency was never installed (missing from node_modules).',
      'A relative path is wrong or missing an extension.',
      'Case mismatch in the filename (matters on Linux/CI, not always on macOS/Windows).',
    ],
    fixes: [
      {
        text: 'Install the missing package.',
        code: `npm install <package-name>`,
      },
      {
        text: 'Fix the relative path and check exact casing.',
        code: `// from src/pages/Home.jsx\nimport Button from '../components/Button';`,
      },
      {
        text: 'If it still fails, reinstall cleanly.',
        code: `rm -rf node_modules package-lock.json && npm install`,
      },
    ],
  },
  {
    id: 'node-eaddrinuse',
    title: 'Port already in use (EADDRINUSE)',
    severity: 'medium',
    languages: ['javascript', 'typescript'],
    framework: 'Node.js',
    match: /EADDRINUSE|address already in use/i,
    summary:
      'The port your server wants is already taken by another process - often a previous run that never shut down.',
    causes: [
      'A previous dev server is still running in another terminal.',
      'Two apps are configured to use the same port.',
    ],
    fixes: [
      {
        text: 'Find and stop the process on that port (example: port 3000).',
        code: `# macOS / Linux\nlsof -i :3000\nkill -9 <PID>\n\n# Windows\nnetstat -ano | findstr :3000\ntaskkill /PID <PID> /F`,
      },
      { text: 'Or just start on a different port.', code: `PORT=3001 npm run dev` },
    ],
  },
  {
    id: 'node-econnrefused',
    title: 'Connection refused (ECONNREFUSED)',
    severity: 'medium',
    languages: ['javascript', 'typescript'],
    framework: 'Node.js',
    match: /ECONNREFUSED|connection refused/i,
    summary:
      'Your code tried to connect to a host/port where nothing is listening - the target service is down, not started, or the address is wrong.',
    causes: [
      'The database/API server you are calling is not running.',
      'Wrong host or port in the connection string / URL.',
      'A firewall or container network is blocking the connection.',
    ],
    fixes: [
      {
        text: 'Confirm the service is running and reachable at that address.',
        code: `# is anything listening?\ncurl http://localhost:5432 || echo "nothing there"`,
      },
      {
        text: 'Double-check host/port in your config or .env.',
        code: `DATABASE_URL=postgres://localhost:5432/mydb`,
      },
    ],
  },
  {
    id: 'web-cors',
    title: 'Blocked by CORS policy',
    severity: 'medium',
    languages: ['javascript', 'typescript'],
    match: /CORS policy|Access-Control-Allow-Origin|has been blocked by CORS/i,
    summary:
      'The browser blocked a cross-origin request because the server did not return the right CORS headers. This is a server-side permission, not a bug in your fetch call.',
    causes: [
      'The API server does not send `Access-Control-Allow-Origin` for your origin.',
      'A preflight (OPTIONS) request is not handled by the server.',
      'You are calling a third-party API directly from the browser that does not allow it.',
    ],
    fixes: [
      {
        text: 'Enable CORS on the server you control (Express example).',
        code: `import cors from 'cors';\napp.use(cors({ origin: 'http://localhost:5173' }));`,
      },
      {
        text: 'For third-party APIs you do not control, call them from your own backend/proxy instead of the browser.',
      },
    ],
  },

  /* ---------------- Python ---------------- */
  {
    id: 'py-indentation',
    title: 'IndentationError',
    severity: 'medium',
    languages: ['python'],
    match: /IndentationError|TabError|unexpected indent/i,
    summary:
      'Python uses indentation to define blocks. This error means the indentation is inconsistent - usually mixed tabs and spaces, or a block that is not indented as Python expects.',
    causes: [
      'Mixing tabs and spaces in the same file.',
      'A block (after `if`, `for`, `def`, etc.) is missing its indented body.',
      'Inconsistent indent width between lines in the same block.',
    ],
    fixes: [
      {
        text: 'Use 4 spaces consistently - configure your editor to convert tabs to spaces.',
        code: `def greet(name):\n    print(f"Hi {name}")   # 4 spaces, no tabs`,
      },
    ],
  },
  {
    id: 'py-module-not-found',
    title: 'ModuleNotFoundError',
    severity: 'high',
    languages: ['python'],
    match: /ModuleNotFoundError|ImportError: No module named|No module named/i,
    summary:
      'Python could not find the module you imported. It is not installed in the active environment, or the name/path is wrong.',
    causes: [
      'The package is not installed in the current virtual environment.',
      'You installed it into a different Python/venv than the one running.',
      'A local module filename or path is misspelled.',
    ],
    fixes: [
      {
        text: 'Install into the active environment (use the same interpreter that runs your code).',
        code: `python -m pip install <package>`,
      },
      {
        text: 'Confirm which Python and environment are active.',
        code: `which python   # or: where python (Windows)\npython -m pip list`,
      },
    ],
  },
  {
    id: 'py-name-error',
    title: 'NameError',
    severity: 'medium',
    languages: ['python'],
    match: /NameError: name .* is not defined/i,
    summary:
      'A name was used before it was defined in the current scope - usually a typo, a missing import, or using a variable outside where it was created.',
    causes: [
      'A misspelled variable or function name.',
      'Using a variable before the line that assigns it.',
      'Forgetting to import a name from a module.',
    ],
    fixes: [
      {
        text: 'Define or import the name before use, and check spelling/casing.',
        code: `from math import sqrt\nresult = sqrt(16)`,
      },
    ],
  },
  {
    id: 'py-key-error',
    title: 'KeyError',
    severity: 'medium',
    languages: ['python'],
    match: /KeyError/i,
    summary:
      'You asked a dictionary for a key it does not contain. Python raises `KeyError` rather than returning a default.',
    causes: [
      'The key is missing, misspelled, or a different type than expected (e.g. `"1"` vs `1`).',
      'Data shape differs from what you assumed (an API field is absent).',
    ],
    fixes: [
      {
        text: 'Use `.get()` with a default, or check membership first.',
        code: `value = data.get('email', None)\n# or\nif 'email' in data:\n    value = data['email']`,
      },
    ],
  },
  {
    id: 'py-index-error',
    title: 'IndexError: list index out of range',
    severity: 'medium',
    languages: ['python'],
    match: /IndexError|list index out of range|string index out of range/i,
    summary:
      'You indexed a list/string at a position that does not exist - for example element `[3]` of a 3-item list (valid indexes are 0-2).',
    causes: [
      'An off-by-one error in a loop or index calculation.',
      'The list is shorter than expected (or empty) at runtime.',
    ],
    fixes: [
      {
        text: 'Check the length before indexing, or iterate directly.',
        code: `if len(items) > i:\n    do(items[i])\n\n# usually cleaner:\nfor item in items:\n    do(item)`,
      },
    ],
  },
  {
    id: 'py-attr-nonetype',
    title: "AttributeError: 'NoneType' object has no attribute",
    severity: 'high',
    languages: ['python'],
    match: /AttributeError: 'NoneType' object has no attribute/i,
    summary:
      'You called a method or accessed an attribute on `None`. Something you expected to return a value returned `None` instead.',
    causes: [
      'A function returned `None` implicitly (no `return` statement) and you used the result.',
      'A lookup (dict.get, re.match, DB query) found nothing and returned `None`.',
      'A variable was never assigned a real value.',
    ],
    fixes: [
      {
        text: 'Check for None before using the result.',
        code: `m = re.match(pattern, text)\nif m is not None:\n    print(m.group())`,
      },
    ],
  },

  /* ---------------- Java ---------------- */
  {
    id: 'java-npe',
    title: 'NullPointerException',
    severity: 'high',
    languages: ['java'],
    match: /NullPointerException/i,
    summary:
      'Code tried to use an object reference that is `null` - calling a method on it or reading a field. Modern JVMs often name exactly which variable was null.',
    causes: [
      'A variable/field was never initialized before use.',
      'A method returned `null` and the result was used directly.',
      'A map/collection lookup returned `null`.',
    ],
    fixes: [
      {
        text: 'Read the "Cannot invoke ... because ... is null" detail - it names the null reference. Guard it.',
        code: `if (user != null && user.getName() != null) {\n    print(user.getName());\n}`,
      },
      { text: 'Prefer Optional for values that may be absent.', code: `Optional.ofNullable(user).map(User::getName).ifPresent(System.out::println);` },
    ],
  },
]

const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 }

/**
 * Find the best knowledge-base entry for a raw error + its parsed info.
 * Returns the KB entry or null.
 */
export function matchOffline(raw, parsed) {
  const text = raw || ''
  let best = null
  let bestScore = -1

  for (const entry of KB) {
    if (!entry.match.test(text)) continue
    let score = 1
    if (parsed?.language && entry.languages?.includes(parsed.language)) score += 2
    if (parsed?.framework && entry.framework === parsed.framework) score += 2
    score += (SEVERITY_RANK[entry.severity] ?? 0) * 0.1
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }
  return best
}

export function matchOfflineToResult(raw, parsed) {
  const entry = matchOffline(raw, parsed)
  if (entry) {
    return {
      source: 'offline',
      matched: true,
      title: entry.title,
      severity: entry.severity,
      language: parsed?.languageLabel || null,
      framework: entry.framework || parsed?.framework || null,
      errorType: parsed?.errorType || null,
      summary: entry.summary,
      causes: entry.causes,
      fixes: entry.fixes,
      docs: entry.docs || null,
    }
  }

  // Generic, still-useful fallback built from the parsed signal.
  return {
    source: 'offline',
    matched: false,
    title: parsed?.errorType
      ? `${parsed.errorType}`
      : 'Unrecognized error',
    severity: 'medium',
    language: parsed?.languageLabel || null,
    framework: parsed?.framework || null,
    errorType: parsed?.errorType || null,
    summary:
      "This error isn't in the offline library yet. Here's a general read: the message below is the key - it usually names what went wrong and where. Add your free Gemini key in Settings for a full AI explanation tailored to this exact trace.",
    causes: [
      parsed?.message
        ? `The reported problem is: "${parsed.message}".`
        : 'Read the first line - it names the error type and a short reason.',
      parsed?.frames?.length
        ? `It originates near: ${parsed.frames.slice(0, 3).join('  →  ')}.`
        : 'Look for the topmost frame that points at your own code (not a library).',
      'Search the exact error type plus your language/framework for the fastest match.',
    ],
    fixes: [
      {
        text: 'Open the first file:line in the trace that belongs to your code and inspect the value on that line.',
      },
      {
        text: 'Add your free Gemini API key in Settings to get a precise, AI-generated explanation and fix for this specific error.',
      },
    ],
    docs: null,
  }
}
