# Changelog

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
