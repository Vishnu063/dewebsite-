# Veyra — The Lantern Isles

A six-page website with an original explorable 3D world, **51 characters: 31 original residents and 20 anime guests**, real user accounts and private favourites. Built in the `dewebsite-` repository for your own deployment and DevOps practice. No hosting, Docker, infrastructure, or CI/CD configuration is included.

## Artwork upgrade — first review batch

**Status: Naruto and Luffy are a two-character benchmark awaiting art review. The other 18 anime characters have not been rebuilt in this batch.** See [the artwork review and reference/outfit plan](docs/art-review/README.md) for the actual front/side/back model renders, known limitations and remaining batches. This README contains no images.

The benchmark pair uses Blender-authored GLB meshes with shaped faces, clothing surfaces, hair locks, fingers, feet and separately articulated elbows/knees. The website loads these assets for their profiles and world instances. They are stylised fan models, not approved replicas or finished production rigs. Knee/elbow regions use weighted meshes, with other parts attached to articulated groups. The original 31 Veyra characters are unchanged.

Blender is an offline authoring tool here; EC2 only serves the exported files. Regenerate the pair with Blender 4.2 and Pillow available on the authoring machine:

```bash
blender -b -t 4 --python scripts/art/build_benchmarks.py -- --render
python3 scripts/art/compose_review.py
npm run build
```

The exported pair totals approximately 1.65 MiB, with no external textures. Detailed scene/file counts and performance tradeoffs are in the review document. Browser performance, likeness and animation are unverified; tests remain with the project owner.

## Naruto and One Piece characters

Open **Characters**, choose **Naruto** or **One Piece**, then select a character. Drag to rotate freely, scroll/pinch to zoom, or use **Front / Back / Left / Right / Top / Bottom**. Pause or enable auto rotation. The profile viewer has no ground plane hiding the underside. Use **Expand viewer** for a full-viewport view; **Close full screen** or Escape returns to the page. **Reset camera** restores the front view, and **Background** offers Studio, Light and Dark.

These are **stylised, unofficial fan models** with articulated mesh groups, not detailed replicas or imported game rigs. Each has a distinct costume and geometry: Naruto's whiskers and headband, Gaara's rear gourd, Zoro's three swords, Usopp's long nose, Chopper's antlers, Franky's mechanical arms, Brook's skeleton and Jinbe's wide fish-man form.

### Lighter rendering and viewer recovery

**Quality** is available in both the world and character viewer. Standard mode caps rendering at 30 FPS and pixel ratio at 1.5. Low mode caps rendering at 20 FPS and pixel ratio at 0.85 to reduce graphics work. Screens up to 700 CSS pixels wide start in Low mode. The choice carries between pages for the current session; it is not saved across reloads. Models and camera controls remain available in either mode; actual performance depends on the device.

A loading message stays visible until the first frame renders. If graphics cannot start, rendering fails, or the browser loses its graphics context, the viewer shows recovery guidance and **Retry in low quality**. Retry reloads the current page's viewer; the catalogue remains available. Navigating away cancels a pending viewer start and disposes its resources.

This quality/recovery update was compiled, but its runtime and browser behaviour have not been tested.

### Poses, animation and lead-character detail

- All 20 anime guests have an individual **Signature pose** and a **Neutral stance** option. Their articulated head/arm/leg groups use the same meshes in the world and profile viewer.
- **Animation** offers Breathe & blink, Walk in place, and Still. Brook has eye sockets and does not blink. Walking is a procedural preview loop; it does not move the character across the world or provide gameplay.
- Animation and camera rotation have separate controls. Reduced-motion preferences start the viewer with animation and rotation off; select a mode to enable them.
- Naruto has smoother facial geometry, blue irises, extra hair detail, jacket panels and seams, a leaf-style headband detail, shin wraps, sandals and a waist pouch.
- Luffy has smoother facial geometry, expressive eyes and grin, an open red vest, straw-hat weave and rim detail, hair tufts and sandals.
- These refinements focus on Naruto and Luffy first. The remaining 18 keep their existing stylised designs with the new poses and animation.

Open a character profile in the running website for full interactive 3D viewing. Naruto and One Piece characters/designs belong to their respective rights holders; this project is unaffiliated. The original Veyra cast is listed separately in the collection filter.

| Naruto | One Piece |
| --- | --- |
| **Naruto Uzumaki** | **Monkey D. Luffy** |
| **Sasuke Uchiha** | **Roronoa Zoro** |
| **Sakura Haruno** | **Nami** |
| **Kakashi Hatake** | **Usopp** |
| **Hinata Hyuga** | **Sanji** |
| **Itachi Uchiha** | **Tony Tony Chopper** |
| **Gaara** | **Nico Robin** |
| **Shikamaru Nara** | **Franky** |
| **Rock Lee** | **Brook** |
| **Jiraiya** | **Jinbe** |

Rebuild the guest data and previews after changing their designs:

```bash
python3 scripts/create_world.py
node scripts/render-character.mjs --anime
npm run build
```

## What is in the website

| Page | Features |
| --- | --- |
| Explore `/` | Three connected floating islands, skybridges, buildings, landmarks, 51 characters, walking, orbit/zoom, region travel and a guided tour |
| Characters `/characters` | All 51 profiles, 3D model previews for anime guests, collection/island filters, search and favourite buttons |
| Character `/characters/ari-solwen` | Rotatable 3D model, individual story, personality, role, ambition and a link to their world location |
| Chronicle `/history` | Three region histories and six eras of original world lore |
| Favourites `/favourites` | A private, persistent collection for the signed-in account |
| Account `/account` | Registration, sign-in, account summary and sign-out |

**Sunmere** is a warm lantern harbour, **Glasswood** a forest that remembers lost paths, and **Cinderpeak** a crystal-and-forge settlement. The original cast has eleven residents in Sunmere and ten each in Glasswood and Cinderpeak. Twenty additional Naruto and One Piece fan characters visit the isles on a separate inner ring. The original cast and world lore remain unchanged. Meshes are authored in project code, including the Blender benchmark exports; no downloaded anime models, footage, textures or voices are bundled.

The models use simple, stylised 3D shapes with distinct hair, clothing colours and accessories. This is a compact navigable browser world, **not a detailed anime game or an unlimited open world**; animation uses lightweight articulated groups rather than imported skeletal rigs. Original-character cards use SVG illustrations; anime cards use static snapshots of their actual meshes. Profile and world views render real Three.js geometry.

## Run locally

Requirements: **Python 3.11+**, **Node.js 20+** and npm. Rendering happens in the visitor's browser using **WebGL 2**; EC2 does not need a rendering GPU. A browser without WebGL 2 gets an explanation and can still use the catalogue, stories and accounts.

```bash
git clone https://github.com/Vishnu063/dewebsite-.git
cd dewebsite-
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
npm ci
npm run build
python app.py
```

Open **http://127.0.0.1:8000**. On Windows, activate with `.venv\Scripts\activate` instead of `source`. Ubuntu may require its `python3-venv` package before creating the environment. The Flask entry point binds to loopback by default; `--host` and `--port` are available for your own environment.

If running this on EC2 and viewing it from your computer, keep the app running and use your existing SSH connection for a tunnel:

```bash
ssh -i /path/to/your-key.pem -N -L 8000:127.0.0.1:8000 ubuntu@YOUR_EC2_PUBLIC_IP
```

Open the same local URL on your computer. Replace the key path and IP. This is a local viewing option, not a deployment setup.

The frontend build is generated into ignored `static/dist/`. Rebuild it with `npm run build` after editing frontend JavaScript. No CDN, external image service, account service or paid API is required at website runtime. The health endpoint is `/health`.

## Explore the world

- **Drag** to orbit the camera; scroll or pinch to zoom. **Full world** returns to the overview.
- Click a resident to see their name, role and profile link.
- **Walk the isles** enables the visitor avatar. Use **WASD / arrow keys** on a computer, or hold the onscreen direction buttons on touch devices. Drag to turn the camera. Skybridges connect every island; walking is bounded to islands/bridges and avoids buildings and central landmarks.
- Region travel buttons move to a new island. **Take a tour** visits residents automatically; pause it or select a resident to stop.
- Idle motion respects the browser's reduced-motion preference and can be paused. Standard quality caps rendering at 30 FPS; Low quality uses 20 FPS and lower resolution.
- Use **Find in the world** from a character profile to locate that resident.

Create your own username and password on Account. There is **no default account or password**. The heart on any card or profile saves that resident to your personal collection. Accounts and favourites remain after the server restarts.

## Accounts and data

The backend uses SQLite in ignored `instance/veyra.sqlite3`. It stores scrypt password hashes, opaque session-token hashes, expiring server-side sessions and per-user favourites. Session cookies are HttpOnly and SameSite=Lax; authentication rotates sessions, and sign-out revokes the current token. Mutations require a session-bound CSRF token and reject cross-origin requests. Login/account attempt limits are enforced in the database. SQL statements use parameters.

Keep `instance/` private and retain it if you want accounts to survive moving/replacing the application. Do not commit databases, credentials or private keys. `APP_COOKIE_SECURE=1` enables Secure cookies when **you** run the app over HTTPS. The included Flask server is for local use; you handle production serving and deployment. Do not enter a real password over an unencrypted public connection.

Password reset, email verification, user deletion, moderation, administrative tools and a production security audit are **not included**. There is no multiplayer, combat, saved avatar position, dialogue system, sound track, character voice or downloadable rigged-model library.

## Edit the original world

The canonical authored content is `scripts/create_world.py`. It writes the committed `data/world.json` used by the API:

```bash
python scripts/create_world.py
```

`frontend/models.js` handles model selection and original residents. `frontend/anime-models.js` defines the anime guest designs; `frontend/character-animation.js` provides signature poses and procedural animation. `frontend/world.js` creates the environment, quality settings and camera controls. `frontend/layout.js` contains the shared walking and bridge calculations. The backend entry point is `app.py`, the app pages are in `frontend/app.js`, and styling is in `static/style.css`.

## Validation

```bash
python -m unittest discover -s tests -v
npm test
npm run build
```

**Current artwork benchmark and viewer updates:** the frontend was compiled and model-preview assets regenerated. Tests and live desktop/mobile checks have not been run for this update. The included tests passed before the latest viewer and artwork changes; rerun them to validate the current version.

Existing test coverage:

- Nine backend tests (including all 20 guest routes, preview assets and favourites): real registration/login/logout, password hashing and session rotation, wrong passwords, expired sessions, duplicate names, attempt limits, CSRF/origin rejection, persistent private favourites across separate users and app restarts, six page routes, malformed/oversized input and the 51-character catalogue.
- Scene/control tests also cover the exact 20-guest roster, distinct mesh geometry, six camera angles, portrait assets and collision-free guest placement. The suite includes finite geometry, scene construction and complexity budgets, island/bridge connectivity, building collisions and guided-tour controls. Browser/WebGL appearance and touch interaction have not been tested in this environment; catalogue previews are generated offline from the actual geometry.
- The updated production frontend bundle compiles to approximately 649 KiB before compression.

**Verification limit:** tests and live-browser checks are deferred to the project owner. Blender renders show the authored neutral geometry; WebGL appearance, animation deformation and actual desktop/mobile performance remain unverified. No 8 GB memory benchmark or likeness approval is claimed.

## Credits and licence

Application code and original Veyra content: MIT, see [LICENSE](LICENSE). Three.js is MIT; Flask and Werkzeug use BSD licences. npm and Python packages retain their own licences. This repository does not claim ownership of those dependencies.
