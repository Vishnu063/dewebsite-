# Veyra — The Lantern Isles

A six-page website with an original explorable 3D world, **30 original characters**, real user accounts and private favourites. Built in the `dewebsite-` repository for your own deployment and DevOps practice. No hosting, Docker, infrastructure, or CI/CD configuration is included.

## What is in the website

| Page | Features |
| --- | --- |
| Explore `/` | Three connected floating islands, skybridges, buildings, landmarks, 30 residents, walking, orbit/zoom, region travel and a guided tour |
| Characters `/characters` | All 30 profiles, original illustrated portraits, island filters, search and favourite buttons |
| Character `/characters/ari-solwen` | Rotatable 3D model, individual story, personality, role, ambition and a link to their world location |
| Chronicle `/history` | Three region histories and six eras of original world lore |
| Favourites `/favourites` | A private, persistent collection for the signed-in account |
| Account `/account` | Registration, sign-in, account summary and sign-out |

**Sunmere** is a warm lantern harbour, **Glasswood** a forest that remembers lost paths, and **Cinderpeak** a crystal-and-forge settlement. Ten residents belong to each isle. Names, stories, palettes, silhouettes and role-specific props were created for this project, without intentionally copying existing anime characters. No existing anime footage, models, images, articles or voices are bundled.

The models use simple, stylised 3D shapes with distinct hair, clothing colours and accessories. This is a compact navigable browser world, **not a detailed anime game, an unlimited open world, or a skeletal-animation project**. Character cards use original SVG illustrations; their profile and world views use actual Three.js meshes.

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
- Idle motion respects the browser's reduced-motion preference and can be paused. Rendering is capped at 30 frames per second with a limited pixel ratio.
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

`frontend/models.js` creates the character meshes and props; `frontend/world.js` creates the environment and controls. `frontend/layout.js` contains the shared walking and bridge calculations. The backend entry point is `app.py`, the app pages are in `frontend/app.js`, and styling is in `static/style.css`.

## Validation

```bash
python -m unittest discover -s tests -v
npm test
npm run build
```

Validation performed locally:

- Eight backend tests: real registration/login/logout, password hashing and session rotation, wrong passwords, expired sessions, duplicate names, attempt limits, CSRF/origin rejection, persistent private favourites across separate users and app restarts, six page routes, malformed/oversized input and the 30-character catalogue.
- Four scene/control tests: all 30 models have finite geometry and distinct design definitions; world construction places every resident; island/bridge connectivity, void boundaries and building collisions pass; guided tour start/pause works. The constructed scene has about 1,060 meshes and 115,000 triangles.
- The production frontend bundle builds successfully at approximately 537 KiB before compression.

**Verification limit:** this environment has no supported browser-control capability for visual/WebGL QA. The scene was constructed and checked using real Three.js objects, not rendered in a browser here. Desktop/mobile camera composition, touch interaction and actual graphics performance need a browser trial. No EC2 deployment, public account security audit or 8 GB client-memory benchmark is claimed.

## Credits and licence

Application code and original Veyra content: MIT, see [LICENSE](LICENSE). Three.js is MIT; Flask and Werkzeug use BSD licences. npm and Python packages retain their own licences. This repository does not claim ownership of those dependencies.
