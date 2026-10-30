@AGENTS.md

# Subagents

When this session runs on Fable 5.x, start subagents on Opus 5 unless told otherwise explicitly.

# Testing the native app against a local instance

The native app ([`cevi/conveniat27-app`](https://github.com/cevi/conveniat27-app)) is a React Native
WebView around `/entrypoint?app-mode=true`; its shell, push bridge and offline retry live in the
private [`cevi/app-core`](https://github.com/cevi/app-core). Anything that behaves differently in
the app (app mode, the user agent, the push bridge, a cold start) can be tested without an Android
SDK on the host: the emulator runs in Docker, the APK is built in Docker, and both the native app
and the installed PWA are driven over adb and the Chrome DevTools protocol. Every step below runs
unattended. Needs Docker, read access to `/dev/kvm`, and `gh` logged in with access to both repos.

**1. Run the webpage.** `pnpm dev` serves `http://localhost:3000` with the fake Cevi.DB login on
`http://localhost:3001`. The service worker is off in development; for offline or cold-start work
use `docker compose --profile service-worker up --build` instead, same ports.

**2. Start the emulator.** The device reaches the host through `adb reverse` and a `socat` in the
container, so it sees the same `http://localhost:3000` and `:3001` as a desktop browser.
`localhost` is a secure context, so the service worker and PWA install work; `10.0.2.2` would not
be one, and inside this container it is not the host anyway.

```bash
docker run -d --name c27-android-emu --device /dev/kvm --add-host=host.docker.internal:host-gateway \
  -p 127.0.0.1:6080:6080 -p 127.0.0.1:5037:15037 -p 127.0.0.1:9222:19222 \
  -e EMULATOR_DEVICE="Samsung Galaxy S10" -e WEB_VNC=true budtmo/docker-android:emulator_14.0
e() { docker exec c27-android-emu "$@"; }
until [ "$(e adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do sleep 5; done
docker exec -d c27-android-emu socat TCP-LISTEN:15037,fork,reuseaddr TCP:127.0.0.1:5037  # adb server
docker exec -d c27-android-emu socat TCP-LISTEN:19222,fork,reuseaddr TCP:127.0.0.1:9222  # DevTools
for p in 3000 3001; do
  docker exec -d c27-android-emu socat TCP-LISTEN:$p,bind=127.0.0.1,fork,reuseaddr TCP:host.docker.internal:$p
  e adb reverse tcp:$p tcp:$p
done
for k in window_animation_scale transition_animation_scale animator_duration_scale; do
  e adb shell settings put global $k 0
done
```

`http://localhost:6080` shows the screen in a browser (noVNC). Rules learned the hard way:

- One adb server per emulator: the container's. A second server on the host fights it for the
  emulator's adbd until the device goes offline for good. Host tools use the container's server
  with `ADB_SERVER_SOCKET=tcp:127.0.0.1:5037`.
- The image does not survive `docker restart`; the device process exits. Recreate the container.
- Right after a fresh boot Google Play services restarts and Android kills apps that use its font
  provider, ours included (`depends on provider ... in dying proc`). Launch again.
- The image ships Chrome and WebView 113, older than what participants run. Logic bugs reproduce,
  rendering and API support may not.

**3. Build the APK for the local instance.** The app's environments are hard coded in
`Conveniat27App/src/config/appConfig.ts`. Point `testing` at the local instance and allow cleartext
in the `screengrab` build type (bundled JS, debug signed, debuggable, so its WebView is open to
DevTools). Never commit these two edits. `@cevi/app-core` resolves over SSH, so the build rewrites
GitHub URLs to HTTPS with the `gh` token, and it needs Node 22.18 or newer, which the build image
does not ship.

```bash
gh repo clone cevi/conveniat27-app /tmp/c27app -- --depth 1
cd /tmp/c27app/Conveniat27App
sed -i "s#testing: '[^']*'#testing: 'http://localhost:3000/entrypoint?app-mode=true'#" src/config/appConfig.ts
sed -i 's#usesCleartextTraffic: "false"#usesCleartextTraffic: "true"#' android/app/build.gradle
docker run --rm -e GH_TOKEN="$(gh auth token)" -v /tmp/c27app:/work -v c27-gradle-cache:/root/.gradle \
  reactnativecommunity/react-native-android:latest bash -euc '
    git config --global url."https://x-access-token:$GH_TOKEN@github.com/".insteadOf ssh://git@github.com/
    curl -fsSL https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.gz | tar -xz -C /opt
    export PATH=/opt/node-v22.20.0-linux-x64/bin:$PATH && npm i -g yarn@1.22.22 >/dev/null
    cd /work/Conveniat27App && yarn install --frozen-lockfile && yarn generate:app-info
    cd android && ./gradlew assembleScreengrab -PreactNativeArchitectures=x86_64 --no-daemon'
docker cp android/app/build/outputs/apk/screengrab/app-screengrab.apk c27-android-emu:/tmp/app.apk
docker exec c27-android-emu adb install -r /tmp/app.apk
```

The first build downloads the SDK platform and takes several minutes, later ones two to three with
the Gradle volume.

**4. Launch and attach DevTools.** The deep link `conveniat27://env=testing` switches the app to
the local instance and persists. A WebView's DevTools socket carries the process id, so look it up
after every launch. Only one DevTools client can attach to a WebView at a time.

```bash
PKG=ch.cevi.conveniat27.conveniat27app; e() { docker exec c27-android-emu "$@"; }
e adb shell am force-stop $PKG
e adb shell am start -W -a android.intent.action.VIEW -d conveniat27://env=testing $PKG
PID=$(e adb shell pidof $PKG | tr -d '\r')
e adb forward tcp:9222 localabstract:webview_devtools_remote_$PID
curl -s 127.0.0.1:9222/json/list   # the page should be http://localhost:3000/...
```

For the PWA, open `http://localhost:3000/entrypoint?app-mode=true` in the emulator's Chrome, install
it from the menu, and forward `localabstract:chrome_devtools_remote` instead. Without Play services
Chrome installs a standalone shortcut rather than a WebAPK; it runs through the same worker.

**5. Drive it.** Node 24 has `fetch` and `WebSocket` built in, so a page needs no Playwright:

```js
// /tmp/cdp.mjs — node /tmp/cdp.mjs '<expression>' evaluates in the localhost page behind :9222
const pages = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = pages.find((p) => p.type === 'page' && p.url.startsWith('http://localhost:300'));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => (ws.onopen = resolve));
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id !== 1) return;
  const { result, exceptionDetails } = message.result;
  console.log(
    JSON.stringify(exceptionDetails ? exceptionDetails.exception?.description : result.value),
  );
  ws.close();
};
ws.send(
  JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression: process.argv[2], awaitPromise: true, returnByValue: true },
  }),
);
```

Click by visible text or a selector, and wait for text instead of sleeping. The onboarding speaks
the device's locale, and `innerText` applies `text-transform`, so a section label reads
`SCHNELLZUGRIFF`. The fake login page lists one `button[name=user_id]` per test user: `1` is
"Admin Conveniat v/o Letmein", `3` is "Benutzer Nr. 3 v/o NoAccess" without groups. On Android the
login runs inside the WebView, so after the click the page returns to `localhost:3000` signed in.
Take screenshots with `docker exec c27-android-emu adb exec-out screencap -p > shot.png`.

**6. Bad networks.** The emulator's traffic to the local instance leaves the container as requests
to ports 3000 and 3001, so shape those ports only; filtering by address would also slow adb and
DevTools, whose replies go to the same host.

```bash
docker run -d --rm --name c27-netem --network container:c27-android-emu --cap-add NET_ADMIN \
  nicolaka/netshoot sleep infinity
n() { docker exec c27-netem "$@"; }
n tc qdisc add dev eth0 root handle 1: prio bands 3 priomap 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
n tc qdisc add dev eth0 parent 1:3 handle 30: netem delay 2000ms 500ms loss 40%
for p in 3000 3001; do n tc filter add dev eth0 parent 1: protocol ip prio 1 u32 match ip dport $p 0xffff flowid 1:3; done
n tc qdisc del dev eth0 root   # back to normal
```

`loss 100%` is Wi-Fi without uplink, the case airplane mode does not reproduce. For a cold start,
`am force-stop` the app first; that also stops its service worker.

**7. Clean up.** `docker rm -f c27-netem c27-android-emu`. Stop only what you started.

**Agent tooling.** The adb-plus-CDP recipe above is what was verified on 2026-10-30. Against this
setup [`mobile-mcp`](https://github.com/mobile-next/mobile-mcp) connected through
`ADB_SERVER_SOCKET` and gave screenshots, coordinate taps and app install, clear and launch, but its
element listing failed on every screen, and
[`chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp) attached to the
WebView socket without listing its page. T3 Code has a Device panel of its own (`device_list`,
`device_open`, the `agent-device` CLI), switched on per environment under Settings > Integrations >
Devices; whether it can adopt this Docker emulator is untested. Prefer stable selectors to
coordinates, and put a flow that has to stay green into a committed test rather than re-exploring
it every run.
