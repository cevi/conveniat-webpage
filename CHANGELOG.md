# Changelog

## [1.9.3](https://github.com/cevi/conveniat-webpage/compare/v1.9.2...v1.9.3) (2026-09-20)


### Bug Fixes

* **jobs:** keep a worker's claim readable across a rolling deploy ([d38e3ba](https://github.com/cevi/conveniat-webpage/commit/d38e3baab695d9b6475a0c769146e45868a28a6f))
* **jobs:** let a task record its own log entry ([b3558ed](https://github.com/cevi/conveniat-webpage/commit/b3558edaffcaa6f07c8b8b01e9c08edc2c2d4495))
* **jobs:** let a task record its own log entry ([fa5c74f](https://github.com/cevi/conveniat-webpage/commit/fa5c74feeca4ec08a7bb423d6a1d01c7e906a2d0))
* **jobs:** publish every job a worker is running, as it starts ([d0e32c9](https://github.com/cevi/conveniat-webpage/commit/d0e32c926c4bdb3f2b4bc358b53b3c9842aa337b))
* **logging:** route per-request server logs through the logger ([c6b286d](https://github.com/cevi/conveniat-webpage/commit/c6b286d348e8a588ce52e566b98693b4a7ff195d))
* **mail:** read past mail the bounce check cannot place ([fac85ea](https://github.com/cevi/conveniat-webpage/commit/fac85ea019434c0d6bb2a490a8e18e6b7d98f151))
* **mail:** read past mail the bounce check cannot place ([25e18b8](https://github.com/cevi/conveniat-webpage/commit/25e18b85e6d2493345154c500f396d9bb4f3a8b1))
* **mail:** tell a missing record apart from a failed lookup ([a6196ad](https://github.com/cevi/conveniat-webpage/commit/a6196ad844c57befaba404b681b4e7fd6aff199d))
* **payload-cms:** strip control characters from saved content ([d71d110](https://github.com/cevi/conveniat-webpage/commit/d71d1108587eb4336cc45a0dd5492a2afa2d3f79))
* **payload-cms:** strip control characters on plugin collections too ([f2faf9f](https://github.com/cevi/conveniat-webpage/commit/f2faf9f1eef9a9f03f75be5ed4738a8f79e2cd59))


### Performance

* **jobs:** make a worker heartbeat a single write ([c3d8ac5](https://github.com/cevi/conveniat-webpage/commit/c3d8ac592c408720d9c1cf5dadf976d1aa9d4e0f))

## [1.9.2](https://github.com/cevi/conveniat-webpage/compare/v1.9.1...v1.9.2) (2026-09-20)


### Bug Fixes

* **billing:** fold repeated entries in a participant's sync history ([5aeffea](https://github.com/cevi/conveniat-webpage/commit/5aeffea2a53b94fae256e1713a2d02dea0c2d090))
* **billing:** fold repeated entries in a participant's sync history ([44f2740](https://github.com/cevi/conveniat-webpage/commit/44f2740bb3be3df669009d63f13895e28e047858))
* **billing:** keep a Cevi.DB write-back value out of a folded run ([f37fb40](https://github.com/cevi/conveniat-webpage/commit/f37fb40dff7c7eabbd6bb429e50d83d0c95d5a12))
* **billing:** keep the scheme test off bare hosts starting with http ([c14799d](https://github.com/cevi/conveniat-webpage/commit/c14799d50908d90de08bc5f023667e1c9678b217))
* **billing:** print web addresses in the bill letter as links ([f324cf2](https://github.com/cevi/conveniat-webpage/commit/f324cf2df21dc2e5c9181a152a2fd2522580bdec))
* **billing:** print web addresses in the bill letter as links ([76b3b08](https://github.com/cevi/conveniat-webpage/commit/76b3b0831cabba4523290f5cdc6192c717f4a6ce))
* **ci:** push an image Shepherd can actually redeploy ([1905bbd](https://github.com/cevi/conveniat-webpage/commit/1905bbdcd14e8fe07b52e505c0bed3973f0b9cde))
* **ci:** push an image Shepherd can actually redeploy ([3c32db9](https://github.com/cevi/conveniat-webpage/commit/3c32db9e5959040ff901768a8bcf31c9948e40a6))
* **jobs:** let a job record the task it just finished ([14eb853](https://github.com/cevi/conveniat-webpage/commit/14eb8535764e0ecad782c299600f95ea3ac816e0))
* **jobs:** let a job record the task it just finished ([c9c27ed](https://github.com/cevi/conveniat-webpage/commit/c9c27ed5cf28878bd8f3d5468c369731a3b1e82e))
* **jobs:** run scheduled tasks on their cron, not on every queue poll ([169f11d](https://github.com/cevi/conveniat-webpage/commit/169f11da078fd3538afa20c22251b7805c1c1af9))
* **jobs:** run scheduled tasks on their cron, not on every queue poll ([3145a50](https://github.com/cevi/conveniat-webpage/commit/3145a503ee32b0a91f4f7bbf0f8336db29c51085))
* **jobs:** say so when Payload moves the task log error field ([3cdf42b](https://github.com/cevi/conveniat-webpage/commit/3cdf42b44923cec5cda41c76ff917a1fc9631121))
* **jobs:** weekly report keeps its slot, nightly sync is queued once ([3a5012b](https://github.com/cevi/conveniat-webpage/commit/3a5012bad4bc93b43d9d72a2452c6f3a043f5cba))

## [1.9.1](https://github.com/cevi/conveniat-webpage/compare/v1.9.0...v1.9.1) (2026-09-19)


### Dependencies

* **deps:** bump Payload CMS to 3.90.1 and refresh dependencies ([12ad7d8](https://github.com/cevi/conveniat-webpage/commit/12ad7d80613ac858181bd5210137e73d5846d7f6))
* **deps:** bump Payload CMS to 3.90.1 and refresh dependencies ([7bc5e42](https://github.com/cevi/conveniat-webpage/commit/7bc5e42006cbe419ed613f62810ee0f5339661b6))

## [1.9.0](https://github.com/cevi/conveniat-webpage/compare/v1.8.1...v1.9.0) (2026-09-15)


### Features

* **billing:** remind a Hof's Adressverwalter about missing Pflichtangaben ([4f79fa0](https://github.com/cevi/conveniat-webpage/commit/4f79fa0e7139f5de7c7cf4915ddf2922db163b1b))
* **billing:** remind a Hof's Adressverwalter about missing Pflichtangaben ([3f755da](https://github.com/cevi/conveniat-webpage/commit/3f755da0f47fb9e299703adb7aa9f9cbfa98f33c))
* **billing:** separate general registration report and finance mail ([49a041d](https://github.com/cevi/conveniat-webpage/commit/49a041d10f49978094a11d419263220d60888da7))
* **billing:** separate general registration report and finance mail ([b8341ec](https://github.com/cevi/conveniat-webpage/commit/b8341ece87aedc09da7174b47707d3a9287249de))
* **billing:** set the Anmeldestatus to "Rechnung gestellt" in the Cevi.DB ([f0598dc](https://github.com/cevi/conveniat-webpage/commit/f0598dca5b4e8ce64ad47e9ea5d8e21079596692))
* **billing:** sync participants from the Cevi.DB every night ([99e668c](https://github.com/cevi/conveniat-webpage/commit/99e668cd8d9321f702ce5b3e84f0844497676883))
* **forms:** helpers can mark a second availability slot ([b965eb7](https://github.com/cevi/conveniat-webpage/commit/b965eb77f6af029c75257aa8e5b44610d00e03f7))


### Bug Fixes

* **billing:** address greptile feedback on lock failure and scheduler count handling ([a043b7b](https://github.com/cevi/conveniat-webpage/commit/a043b7b26bea143921edb9ce09d87fc9d0a47b75))
* **billing:** make weekly report reason and error messages english ([3114a17](https://github.com/cevi/conveniat-webpage/commit/3114a1774d8b87cfaa7fb131d055ddeaf37595ad))
* **billing:** prevent duplicate weekly report emails with distributed locking ([2ee9132](https://github.com/cevi/conveniat-webpage/commit/2ee913262af1cd94366805c77f70f661104f10b5))
* **billing:** prevent duplicate weekly report emails with redis distributed locking ([03573bb](https://github.com/cevi/conveniat-webpage/commit/03573bb9e29686e19b4460baacdef737f01e33a5))
* **billing:** reminder run sends each Hof at most once a week ([3695cb2](https://github.com/cevi/conveniat-webpage/commit/3695cb23f31ed6dce802fac54e9d06209646753f))
* **billing:** use english reason and error messages for weekly report ([55e56be](https://github.com/cevi/conveniat-webpage/commit/55e56be32e1fecf3b338004148f33da6a0e8bc53))

## [1.8.1](https://github.com/cevi/conveniat-webpage/compare/v1.8.0...v1.8.1) (2026-09-14)


### Dependencies

* **deps:** bump the npm_and_yarn group across 1 directory with 3 updates ([b9f34c3](https://github.com/cevi/conveniat-webpage/commit/b9f34c3b6efb12e0bfb97e4454a387cd3ae7a2d1))
* **deps:** bump the npm_and_yarn group across 1 directory with 3 updates ([4c2e235](https://github.com/cevi/conveniat-webpage/commit/4c2e235233b8181aab31b6819bccedffcbd3e81c))

## [1.8.0](https://github.com/cevi/conveniat-webpage/compare/v1.7.6...v1.8.0) (2026-09-14)


### Features

* **forms:** let helpers enrol for a multi-day slot instead of a role ([70bd229](https://github.com/cevi/conveniat-webpage/commit/70bd2299a400bdf6bbea552ee0a972ea5f6d3346))
* **forms:** let helpers enrol for a multi-day slot instead of a role ([1fb7645](https://github.com/cevi/conveniat-webpage/commit/1fb764552691ac3f42bd2b97bceccefa2375e46e))
* **forms:** pick a helper's availability on a calendar instead of fixed slots ([e3fe775](https://github.com/cevi/conveniat-webpage/commit/e3fe775600851629bf4f9389f159ebac981f757c))


### Bug Fixes

* **billing:** ignore Aufbau- and Abbaulager events in sync and subevents ([69259b4](https://github.com/cevi/conveniat-webpage/commit/69259b4da8d6ff4d2c405f907743f56d7c69ff06))
* **billing:** ignore Aufbau- and Abbaulager events in sync and subevents ([2eb560a](https://github.com/cevi/conveniat-webpage/commit/2eb560a19128ec72e9968bcf07efa2a780992e93))
* **billing:** reconcile participants for excluded events and handle non-string event names safely ([2f1ec8e](https://github.com/cevi/conveniat-webpage/commit/2f1ec8ed06421eeec99f91108852ca270f7c1543))
* **forms:** calendar names range endpoints and caps the date window ([132d8d0](https://github.com/cevi/conveniat-webpage/commit/132d8d00f25db76435a4ff53f803de0dd3a0b7f0))
* **forms:** drop the answers of a branch the helper left ([57482a9](https://github.com/cevi/conveniat-webpage/commit/57482a968966eac5f0cd0f60e06c1820ee54fe47))
* **offline:** darken offline-page text so it is readable on the light background ([bad6c1f](https://github.com/cevi/conveniat-webpage/commit/bad6c1fcbcc67c91ffbc5973453c8b1eaae7df9a))
* **offline:** darken offline-page text so it is readable on the light background ([3d2954b](https://github.com/cevi/conveniat-webpage/commit/3d2954bef5eddd96f3e626bf10a876f6face5d9a))
* **tracing:** keep Node-only instrumentation out of the Edge bundle ([4ecf17a](https://github.com/cevi/conveniat-webpage/commit/4ecf17ab110290b1179b4664cd7546737e130c85))
* **tracing:** keep Node-only instrumentation out of the Edge bundle ([699b711](https://github.com/cevi/conveniat-webpage/commit/699b711a45f195854db2b1afba402b19eabb6ff8))

## [1.7.6](https://github.com/cevi/conveniat-webpage/compare/v1.7.5...v1.7.6) (2026-09-12)


### Bug Fixes

* **map:** adapt to the ESM-only maplibre-gl 6 ([211e3ec](https://github.com/cevi/conveniat-webpage/commit/211e3ece56ca607a21f45664fb21a2cb64e0246b))
* **map:** adapt to the ESM-only maplibre-gl 6 ([1658623](https://github.com/cevi/conveniat-webpage/commit/1658623062d0c819293a8c7f9c5806e993c44d0e))


### Dependencies

* **deps:** bump maplibre-gl ([4a48687](https://github.com/cevi/conveniat-webpage/commit/4a48687d74ee37d49eafb2727537f99b4e263fbb))
* **deps:** bump maplibre-gl from 5.24.0 to 6.4.1 in the npm_and_yarn group across 1 directory ([00e334a](https://github.com/cevi/conveniat-webpage/commit/00e334a373c4f8bb37283b3bcb49652675da5c73))

## [1.7.5](https://github.com/cevi/conveniat-webpage/compare/v1.7.4...v1.7.5) (2026-09-12)


### Bug Fixes

* **billing:** only one worker runs a queued participant sync ([0803dda](https://github.com/cevi/conveniat-webpage/commit/0803ddadbbb0385161b924c00da7b1574325f398))
* **billing:** only one worker runs a queued participant sync ([6a6b79a](https://github.com/cevi/conveniat-webpage/commit/6a6b79a9224a2855fccb9d99dc2d08a955fe36fd))
* **billing:** only the worker holding the run lock clears the progress record ([dcca7e4](https://github.com/cevi/conveniat-webpage/commit/dcca7e432f5052e77ae32415f829be765c307c70))
* **billing:** only the worker holding the run lock clears the progress record ([6a1aae9](https://github.com/cevi/conveniat-webpage/commit/6a1aae9804b2b4e5296273b6ceef9d6122e75288))
* **compose:** pull the MinIO image from quay.io ([b2ecf8b](https://github.com/cevi/conveniat-webpage/commit/b2ecf8b8b8f8209afd8f39d2beafd6f7fac4367e))
* **compose:** pull the MinIO image from quay.io ([1f63b47](https://github.com/cevi/conveniat-webpage/commit/1f63b471b07ff480c2b410c2ef20c8ce644c90fa))
* **storage:** presigned uploads no longer carry an empty-body checksum ([1b6fe61](https://github.com/cevi/conveniat-webpage/commit/1b6fe61f98d6ce3ba2ad872f8f3bfad3e8598caf))
* **storage:** presigned uploads no longer carry an empty-body checksum ([6f05ac5](https://github.com/cevi/conveniat-webpage/commit/6f05ac573105ad21afe2519c4d3259bd1ac0ff3c))
* **tracing:** host and process memory metrics now reach Prometheus ([406fe8b](https://github.com/cevi/conveniat-webpage/commit/406fe8b480b73b27e855832d7835d34f25bf327e))
* **tracing:** host and process memory metrics now reach Prometheus ([09a405f](https://github.com/cevi/conveniat-webpage/commit/09a405fdcc20a1ecc49036ba77ec434b7b9040fd))

## [1.7.4](https://github.com/cevi/conveniat-webpage/compare/v1.7.3...v1.7.4) (2026-09-06)


### Bug Fixes

* **analytics:** drop browser extension exceptions from PostHog ([bae50b4](https://github.com/cevi/conveniat-webpage/commit/bae50b4702f40d084e0490abd45bf479eaa75cc0))
* **analytics:** drop browser extension exceptions from PostHog ([#1708](https://github.com/cevi/conveniat-webpage/issues/1708)) ([76a8f14](https://github.com/cevi/conveniat-webpage/commit/76a8f14b1d8eae8a2e172fb820d487c1e9ce0135))
* **analytics:** drop the masked cross-origin "Script error." from PostHog ([52f174c](https://github.com/cevi/conveniat-webpage/commit/52f174c57a3266e8cbddab3a1e5e4bfacaf13190)), closes [#1553](https://github.com/cevi/conveniat-webpage/issues/1553)
* **analytics:** drop the masked cross-origin "Script error." from PostHog ([#1711](https://github.com/cevi/conveniat-webpage/issues/1711)) ([0026ba1](https://github.com/cevi/conveniat-webpage/commit/0026ba14a4dfee94c98ebf1019cfb99a70fccf31))
* **analytics:** match the masked cross-origin error exactly ([833d12a](https://github.com/cevi/conveniat-webpage/commit/833d12aaa09985af63620492ef06ffccb1a6955c))
* **chunks:** recover from a stale bundle when an error boundary catches it ([b6d50e2](https://github.com/cevi/conveniat-webpage/commit/b6d50e284ff1996725a941fe5f8126deaf0e268b)), closes [#1625](https://github.com/cevi/conveniat-webpage/issues/1625) [#1587](https://github.com/cevi/conveniat-webpage/issues/1587) [#1588](https://github.com/cevi/conveniat-webpage/issues/1588)
* **chunks:** recover from a stale bundle when an error boundary catches it ([#1717](https://github.com/cevi/conveniat-webpage/issues/1717)) ([de183c5](https://github.com/cevi/conveniat-webpage/commit/de183c507e6f390201785437db81e67eb73ccc77))
* **docker:** keep previous builds' static assets reachable across a deploy ([5069b47](https://github.com/cevi/conveniat-webpage/commit/5069b470d202a83c971255d2dca7e3bb2a078e26))
* **docker:** keep previous builds' static assets reachable across a deploy ([#1721](https://github.com/cevi/conveniat-webpage/issues/1721)) ([08349d0](https://github.com/cevi/conveniat-webpage/commit/08349d094cd9da043e69c8c0cc4f1b74b165656b))
* **offline:** a closing IndexedDB connection is a cache miss, not a crash ([76f1dd0](https://github.com/cevi/conveniat-webpage/commit/76f1dd0cbb381c62d3762260181d6ab836ec2644)), closes [#1656](https://github.com/cevi/conveniat-webpage/issues/1656)
* **offline:** a closing IndexedDB connection is a cache miss, not a crash ([#1718](https://github.com/cevi/conveniat-webpage/issues/1718)) ([859e0e4](https://github.com/cevi/conveniat-webpage/commit/859e0e4f8914282b48b570577094cbd740607ce7))
* **posthog:** drop browser-worded fetch aborts and the cookies.set extension error ([e342ebc](https://github.com/cevi/conveniat-webpage/commit/e342ebc31846c67a5244d6a29026869ab64e13ca))
* **posthog:** drop browser-worded fetch aborts and the cookies.set extension error ([#1720](https://github.com/cevi/conveniat-webpage/issues/1720)) ([49a2c15](https://github.com/cevi/conveniat-webpage/commit/49a2c15c1a6f63ea31d0f17013a1bea59f2df4e8))
* **posthog:** match WebKit's "Internal error" only in its synthetic, stackless shape ([e4f94f0](https://github.com/cevi/conveniat-webpage/commit/e4f94f0b04998d695d90d57521fa947ec1e9f399))
* **proxy:** answer stray multipart form posts to pages with 400 ([c357b97](https://github.com/cevi/conveniat-webpage/commit/c357b9796882c37ae4dc24323de87665243aeac4)), closes [#1559](https://github.com/cevi/conveniat-webpage/issues/1559)
* **proxy:** answer stray multipart form posts to pages with 400 ([#1712](https://github.com/cevi/conveniat-webpage/issues/1712)) ([59b148a](https://github.com/cevi/conveniat-webpage/commit/59b148a6a54cb7cfde93e41048253b3e52671814))
* **pwa:** handle a service worker that cannot be registered ([57ab9c9](https://github.com/cevi/conveniat-webpage/commit/57ab9c9372dfc6cf70e619280c6df309d4b0abbd)), closes [#1668](https://github.com/cevi/conveniat-webpage/issues/1668)
* **pwa:** handle a service worker that cannot be registered ([#1710](https://github.com/cevi/conveniat-webpage/issues/1710)) ([9408518](https://github.com/cevi/conveniat-webpage/commit/94085185ba31f5dc24091ff0ca3e8d3a5d17cb8c))
* **telemetry:** drop exceptions whose whole stack is native code ([888f322](https://github.com/cevi/conveniat-webpage/commit/888f3228f6d6e8cda1db37b3f31fd90b46d72d82)), closes [#1667](https://github.com/cevi/conveniat-webpage/issues/1667)
* **telemetry:** drop exceptions whose whole stack is native code ([#1713](https://github.com/cevi/conveniat-webpage/issues/1713)) ([e939ff1](https://github.com/cevi/conveniat-webpage/commit/e939ff1839548f0a6acde6807079b5594a768a65))
* **telemetry:** name server errors that arrive without a message ([72fa25e](https://github.com/cevi/conveniat-webpage/commit/72fa25edb365ff56882957692e37fa670655139e)), closes [#1582](https://github.com/cevi/conveniat-webpage/issues/1582)
* **telemetry:** name server errors that arrive without a message ([#1715](https://github.com/cevi/conveniat-webpage/issues/1715)) ([9079e36](https://github.com/cevi/conveniat-webpage/commit/9079e3689a4ba22e77ffcb0299a125d3fe8e8f91))
* **telemetry:** stop iOS browser-injected scripts filing errors against us ([73c0387](https://github.com/cevi/conveniat-webpage/commit/73c03876cc0ef09c6f654b32da01fdc0dd385bbb)), closes [#1666](https://github.com/cevi/conveniat-webpage/issues/1666)
* **telemetry:** stop iOS browser-injected scripts filing errors against us ([#1709](https://github.com/cevi/conveniat-webpage/issues/1709)) ([e07f464](https://github.com/cevi/conveniat-webpage/commit/e07f464624a09824dab0cd95bc610617dafab5c2))


### Dependencies

* **deps-dev:** bump @faker-js/faker ([e3f2d1d](https://github.com/cevi/conveniat-webpage/commit/e3f2d1d59115877786f59fed5ff6a97d725cbc1c))
* **deps-dev:** bump @faker-js/faker from 9.9.0 to 10.5.0 in the npm_and_yarn group across 1 directory ([#1705](https://github.com/cevi/conveniat-webpage/issues/1705)) ([af2f23a](https://github.com/cevi/conveniat-webpage/commit/af2f23a1a0adf3691ad62c0c7564ec44b7cb1dd7))
* **deps:** bump the npm_and_yarn group across 1 directory with 2 updates ([c3e2b3a](https://github.com/cevi/conveniat-webpage/commit/c3e2b3a9b2b4befa9c2fd49bedce6fe2a732ef8a))
* **deps:** bump the npm_and_yarn group across 1 directory with 2 updates ([#1723](https://github.com/cevi/conveniat-webpage/issues/1723)) ([557c37a](https://github.com/cevi/conveniat-webpage/commit/557c37a07b2edb51dac57de06c47eb6e49fd0b6a))
