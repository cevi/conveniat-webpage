# Changelog

## [1.29.0](https://github.com/cevi/conveniat-webpage/compare/v1.28.0...v1.29.0) (2026-10-10)


### Features

* **email:** background mails wait in an outgoing queue ([484cdad](https://github.com/cevi/conveniat-webpage/commit/484cdad7bed91ce914d34c7c238bc379defa4ffb))
* **email:** background mails wait in an outgoing queue ([c2354dd](https://github.com/cevi/conveniat-webpage/commit/c2354dd9d0eb2394ae3ac8b1a75d1c030ba2f31b))


### Bug Fixes

* **admin:** emergency alert count on the dashboard updates after closing an alert ([6b38f79](https://github.com/cevi/conveniat-webpage/commit/6b38f79c62ccdc4ddd88eafc9fc9869599df262e))
* **admin:** emergency alert count on the dashboard updates after closing an alert ([db0b75d](https://github.com/cevi/conveniat-webpage/commit/db0b75de43f2889260724cc739bf1a467a95dc66))
* **auth:** Cevi.DB sign-in no longer throws when next-auth returns nothing ([3ded683](https://github.com/cevi/conveniat-webpage/commit/3ded683701c1bc3681b94d9b7aa3f72a270e1cfd))
* **auth:** Cevi.DB sign-in no longer throws when next-auth returns nothing ([03e17dd](https://github.com/cevi/conveniat-webpage/commit/03e17ddc42f6afd32c32ccbccde5f7635ee6d632))
* **billing:** Pflichtangaben reminder greets the AVPs by name ([99612b2](https://github.com/cevi/conveniat-webpage/commit/99612b2ef53735332778e53c89e6f1dbf811337d))
* **billing:** Pflichtangaben reminder greets the AVPs by name ([cb70dc2](https://github.com/cevi/conveniat-webpage/commit/cb70dc283610c537a6007b6319691282fbf64397))
* **email:** bounce stays visible when the relay report is read after it ([08b33d0](https://github.com/cevi/conveniat-webpage/commit/08b33d0abcb4920f6232655e470261994d56c687))
* **email:** bounce stays visible when the relay report is read after it ([d1ab772](https://github.com/cevi/conveniat-webpage/commit/d1ab7723d3a09847fec77257d472aa0dbf40fb8b))
* **email:** scope the bounce to the current attempt and to failed reports ([adf8328](https://github.com/cevi/conveniat-webpage/commit/adf83283810b4a329308736ce34193c9333dc48e))
* **posthog:** attach the release to server-side exceptions ([3fe844d](https://github.com/cevi/conveniat-webpage/commit/3fe844d9e0742cb645f5ddf230d538b3bbd44b1f))
* **posthog:** attach the release to server-side exceptions ([67b5c31](https://github.com/cevi/conveniat-webpage/commit/67b5c3183bc12dbf55bd02718f104cf3116f4a0e))
* **prerender:** app pages no longer fail on the first request after they expire ([3093603](https://github.com/cevi/conveniat-webpage/commit/30936030ce9ed4dd81d3e756cd108e2aa2801ede))
* **prerender:** app pages no longer fail on the first request after they expire ([1774587](https://github.com/cevi/conveniat-webpage/commit/177458758e1496cd9f06833e6a1b4e2f83f00a00))
* **preview:** a shared link leaves embedded documents on their published state ([eaa8908](https://github.com/cevi/conveniat-webpage/commit/eaa890867468c3520abfaff086b3c7ab2936a457))
* **preview:** a shared preview link opens only its own document ([db20ab1](https://github.com/cevi/conveniat-webpage/commit/db20ab113d0d8681135e0f13df2fbba4ed5556ad))


### Performance

* **cache:** flush only the published page instead of the whole cache ([080acaa](https://github.com/cevi/conveniat-webpage/commit/080acaa934bd90061a1015779432dd47ef4fa303))
* **cache:** flush only the published page instead of the whole cache ([8fc9f26](https://github.com/cevi/conveniat-webpage/commit/8fc9f26fb03869b49734b44a864ec9ddc4d54f21))
* **links:** file links are no longer prefetched ([0777230](https://github.com/cevi/conveniat-webpage/commit/077723076ad756af719ac5cdac2df751ef6387e4))
* **links:** file links are no longer prefetched ([c67e557](https://github.com/cevi/conveniat-webpage/commit/c67e5579f3ac03e41945b8c0d4bd15249e05567c))


### Dependencies

* **deps:** bump Payload CMS to 3.90.2 and refresh dependencies ([bed38ce](https://github.com/cevi/conveniat-webpage/commit/bed38cea631760fb1f59764c38fb2a3eb3fbc80b))
* **deps:** bump Payload CMS to 3.90.2 and refresh dependencies ([a0ecb7c](https://github.com/cevi/conveniat-webpage/commit/a0ecb7cf8384cbe32d50ffc5a02d881157457e4d))

## [1.28.0](https://github.com/cevi/conveniat-webpage/compare/v1.27.0...v1.28.0) (2026-10-01)


### Features

* **access:** one role model from Cevi.DB groups, and an overview that explains any person ([7626fd1](https://github.com/cevi/conveniat-webpage/commit/7626fd10eb25e99c9ffb3839a0d5384877e63fcd))
* **access:** one role model from Cevi.DB groups, and an overview that explains any person ([3b2709a](https://github.com/cevi/conveniat-webpage/commit/3b2709a7b3a20ccf6932d2abce694489729cfc06))
* **admin:** access overview lists a person's rights in words, with the group behind each ([9e13890](https://github.com/cevi/conveniat-webpage/commit/9e138902d88b249988cfc80412b5edb6d75675a4))
* **admin:** compare two versions of a page rendered side by side ([b165738](https://github.com/cevi/conveniat-webpage/commit/b1657388f330dee3df1416f03535f394be56c294))
* **admin:** compare two versions of a page rendered side by side ([35f4985](https://github.com/cevi/conveniat-webpage/commit/35f4985e09a211957026034763fe398812c7f3fa))
* **admin:** custom admin views sit inside their sidebar group ([b6dceba](https://github.com/cevi/conveniat-webpage/commit/b6dceba743015c6a1d9b850a25bedb4d40064f98))
* **admin:** custom admin views sit inside their sidebar group ([508fdc0](https://github.com/cevi/conveniat-webpage/commit/508fdc06cb8e793077793441eaae1262fb331deb))
* **admin:** version history shows what is live and folds drafts under their publication ([06ba457](https://github.com/cevi/conveniat-webpage/commit/06ba45705f5e5e9873f0309b393bade675f0ff64))
* **admin:** version history shows what is live and folds drafts under their publication ([339b55f](https://github.com/cevi/conveniat-webpage/commit/339b55fe316a239f70d628b1d8eedb6b0496891e))


### Bug Fixes

* **access:** no operation is left at Payload's "any logged-in user" default ([bd2f9d5](https://github.com/cevi/conveniat-webpage/commit/bd2f9d57d12c8bb98fe4f91b72f4acd7d93f1f3d))
* **admin:** a stored version needs its own token, and renders without a slug ([bb14414](https://github.com/cevi/conveniat-webpage/commit/bb1441432379494c47506cff2ab645538111f413))
* **admin:** access overview shows the internal collections and the versions rule ([dbb6e2c](https://github.com/cevi/conveniat-webpage/commit/dbb6e2c0925ac7e4a5dc95dc67797905e7544981))
* **admin:** dashboard cards share one height and one grid ([38e506f](https://github.com/cevi/conveniat-webpage/commit/38e506f4245dded9476bc62c181306a15f1d0531))
* **admin:** dashboard cards share one height and one grid ([da31eba](https://github.com/cevi/conveniat-webpage/commit/da31eba0f05c905a6b9652f5e3eeb6658189ccb8))
* **admin:** version history picks a version inside Payload's compare drawer ([9623569](https://github.com/cevi/conveniat-webpage/commit/96235695bcea288a11ebdd529db589cb446f75e7))
* **push:** only the owner can unsubscribe, and the send helper is no server action ([c31d1a0](https://github.com/cevi/conveniat-webpage/commit/c31d1a013c0435527491932cecefdc5329f173b2))
* **push:** only the owner can unsubscribe, and the send helper is no server action ([865879f](https://github.com/cevi/conveniat-webpage/commit/865879fcf24b350f8a64ab4b4c1a0912bcc7586f))


### Dependencies

* **deps:** bump next ([fe58162](https://github.com/cevi/conveniat-webpage/commit/fe58162c174f4ec53c0134fa0e45d5b81c12ebef))
* **deps:** bump next from 16.3.3 to 16.3.6 in the npm_and_yarn group across 1 directory ([6edfcf7](https://github.com/cevi/conveniat-webpage/commit/6edfcf7af4d3167b01372aa210a5afa0d5b53c5d))

## [1.27.0](https://github.com/cevi/conveniat-webpage/compare/v1.26.0...v1.27.0) (2026-09-30)


### Features

* **documents:** show where a document is used ([f451724](https://github.com/cevi/conveniat-webpage/commit/f4517249ac2b2da65a42005099726e863aa47cb0))
* **documents:** show where a document is used ([b991afc](https://github.com/cevi/conveniat-webpage/commit/b991afc8cee1de060c46eb4c5bc166fa0b0b702a))
* **material:** suggest registered people for "Wer holt ab?" ([db622ba](https://github.com/cevi/conveniat-webpage/commit/db622ba538da5a4048057c524693ca57817e239a))
* **material:** suggest registered people for "Wer holt ab?" ([27dc9d1](https://github.com/cevi/conveniat-webpage/commit/27dc9d187fd7f82953e032c29efff4a301b123e9))


### Bug Fixes

* **documents:** a document linked from a live page never shows as unused ([8108eba](https://github.com/cevi/conveniat-webpage/commit/8108eba0de700954b65f5c1d3ed5a148dd716223))
* **documents:** a document linked from a live page never shows as unused ([48abf29](https://github.com/cevi/conveniat-webpage/commit/48abf29ed81fb60a80f518096997fd25dc61b27e))
* **map:** a guest reporting a problem is asked to log in ([d093a89](https://github.com/cevi/conveniat-webpage/commit/d093a89ef7861fd89e0784ce51cdd723a43f33d9))
* **map:** guests can open the camp map ([f09fee2](https://github.com/cevi/conveniat-webpage/commit/f09fee2daa3dee9dd97b2b525efc084d8efcfc1c))
* **map:** guests can open the camp map ([3b108f6](https://github.com/cevi/conveniat-webpage/commit/3b108f686a4bfeed58f5f6b07e284fa25ba6920d))
* **material:** pickup suggestions survive a Payload error and match word starts ([6b6aade](https://github.com/cevi/conveniat-webpage/commit/6b6aadef9bae4574a12f5551362f9583c249a71f))
* **offline:** download every font the map labels with ([190f104](https://github.com/cevi/conveniat-webpage/commit/190f1041a2d1ca1b7ba9876a15e72816d2d625ff))
* **offline:** download every font the map labels with ([8689edc](https://github.com/cevi/conveniat-webpage/commit/8689edcdad32c9d600b63004912385842a38a036))
* **offline:** serve downloaded map tiles to the map worker ([c084514](https://github.com/cevi/conveniat-webpage/commit/c084514c3806cf80c6296621fb7ad8b10f459eea))
* **offline:** serve downloaded map tiles to the map worker ([6fbbdf7](https://github.com/cevi/conveniat-webpage/commit/6fbbdf7b48dce22f41344093749ab3538d6a8c18))
* **offline:** settings show the download as done only when it ran ([34f35d3](https://github.com/cevi/conveniat-webpage/commit/34f35d39948ae44e9fc771c57f647256928d8b46))
* **offline:** settings show the download as done only when it ran ([e6aabc2](https://github.com/cevi/conveniat-webpage/commit/e6aabc263bb9d4061c1772ddf488138291ac00bb))
* **offline:** the worker's own offline pages speak the user's language ([722b5b4](https://github.com/cevi/conveniat-webpage/commit/722b5b4f254821c86a4cc27aa7d2a81f50f8bbe7))
* **offline:** the worker's own offline pages speak the user's language ([2aa8f84](https://github.com/cevi/conveniat-webpage/commit/2aa8f84eebcbc78d26216484b9e7488b680deade))


### Performance

* **tracing:** also drop the scheduler's read of its stats global ([3b2cc47](https://github.com/cevi/conveniat-webpage/commit/3b2cc479f4b8fa10f09a0250dbff7420b6c738ec))
* **tracing:** drop the traces of the job runner's and heartbeat's polling ([d014ce4](https://github.com/cevi/conveniat-webpage/commit/d014ce4e64ff59be88f2ab0b7405ff1f47ea75f4))
* **tracing:** drop the traces of the job runner's and heartbeat's polling ([4c3ddcf](https://github.com/cevi/conveniat-webpage/commit/4c3ddcf9258d87f069a642818e019dee29ff1e31))

## [1.26.0](https://github.com/cevi/conveniat-webpage/compare/v1.25.0...v1.26.0) (2026-09-29)


### Features

* **material:** calmer depot screens with clearer figures ([67daefc](https://github.com/cevi/conveniat-webpage/commit/67daefcb1f238fe1618424b8d9df491d635aca06))
* **material:** calmer depot screens with clearer figures ([e733bf2](https://github.com/cevi/conveniat-webpage/commit/e733bf21e94a568259cdc25072a2aea33c18106d))
* **push:** deliver pushes through a queue with retries ([f105826](https://github.com/cevi/conveniat-webpage/commit/f1058260d123fb88445c2616c91dc8cb52fda44c))
* **push:** deliver pushes through a queue with retries ([e580b97](https://github.com/cevi/conveniat-webpage/commit/e580b9737bc8f76b8c4e9adae73eb476be37ee81))
* **push:** one notification per chat, a separate one per announcement ([6b21feb](https://github.com/cevi/conveniat-webpage/commit/6b21febff7e5cc791ac133040d5c308cef879334))
* **push:** one notification per chat, a separate one per announcement and emergency ([c680b2d](https://github.com/cevi/conveniat-webpage/commit/c680b2d8988264556a81e5977a04a33feb87820f))


### Bug Fixes

* **forms:** clear the service worker's pages when switching the login ([e2dec6e](https://github.com/cevi/conveniat-webpage/commit/e2dec6e0f4d1b9521e81270eab08e36068b437db))
* **forms:** drop the previous user's cached data when switching the login ([ad86ee4](https://github.com/cevi/conveniat-webpage/commit/ad86ee4a74ddadb0826284c880c4d1fe1d268c3a))
* **forms:** drop the previous user's cached data when switching the login ([f14a0d0](https://github.com/cevi/conveniat-webpage/commit/f14a0d0acacccd57d21cc17d56d6ca599545de26))
* **forms:** flush after the sign-out and clear the in-memory cache too ([5942199](https://github.com/cevi/conveniat-webpage/commit/5942199c37066bb8411b12c6e748425dbad31029))
* **forms:** let the persister write the empty cache before flushing ([56a5edc](https://github.com/cevi/conveniat-webpage/commit/56a5edc6552862aa82198c1b14cd1897cfd6a756))
* **material:** review findings on the depot screens ([895eb6e](https://github.com/cevi/conveniat-webpage/commit/895eb6e0390fedcaa1738133d26e749dfe9d460d))
* **offline:** answer the session check from the cache on a hanging network ([998cd47](https://github.com/cevi/conveniat-webpage/commit/998cd479bdf757a8e2c67d2cba51d257c74b3bab))
* **offline:** answer the session check from the cache on a hanging network ([6a77a43](https://github.com/cevi/conveniat-webpage/commit/6a77a43f7b538df3afad0c8a535faae0bcf88460))
* **offline:** cap the wait for an uncached page and keep the schedule deep-link fix ([c2dbfc1](https://github.com/cevi/conveniat-webpage/commit/c2dbfc1f71217cf1c91204b2fb4d6ecfa7dcc399))
* **offline:** clear cached pages only on an explicit logout, keep the app shell ([ddf3fb8](https://github.com/cevi/conveniat-webpage/commit/ddf3fb86fbeac1318d06b417f112fbbbda7b8f37))
* **offline:** clear the previous user's cached pages on logout ([6153e88](https://github.com/cevi/conveniat-webpage/commit/6153e8872904caa5c78b539d01486203f05510e9))
* **offline:** clear the previous user's cached pages on logout ([0eebfcc](https://github.com/cevi/conveniat-webpage/commit/0eebfcc445934b4b1c63c771af0c14eb8bb47905))
* **offline:** do not cache a session answer that lands after a logout ([984c817](https://github.com/cevi/conveniat-webpage/commit/984c817a67b42b68c7d4500fd14a2de33fb9554f))
* **offline:** forget the offline download when its content is deleted ([5e24834](https://github.com/cevi/conveniat-webpage/commit/5e248341581ec32d0615572880be110fcff2662b))
* **offline:** forget the offline download when its content is deleted ([8da7488](https://github.com/cevi/conveniat-webpage/commit/8da74880097fcefc3cb19cd3431348409fa2b37e))
* **offline:** give the 503 for an uncached page an empty body ([4c41594](https://github.com/cevi/conveniat-webpage/commit/4c41594bb675c45fa7e22ba1dc160c14cbf1fb23))
* **offline:** keep refreshing the cache on a slow network ([87c5929](https://github.com/cevi/conveniat-webpage/commit/87c5929dc25dad913299e93028c9693196e61d1e))
* **offline:** keep refreshing the cache on a slow network ([d8ed749](https://github.com/cevi/conveniat-webpage/commit/d8ed749b10ee61f3f7d4280ba22b8da6c2b840c3))
* **offline:** keep the saved query cache for a week ([3f2e4e0](https://github.com/cevi/conveniat-webpage/commit/3f2e4e0a442ac815d025666081feb90c912fd0ee))
* **offline:** keep the saved query cache for a week ([590659f](https://github.com/cevi/conveniat-webpage/commit/590659f635f47c876fd8037c65b174c523b742f2))
* **offline:** keep the saved query cache when a query waited offline ([238af83](https://github.com/cevi/conveniat-webpage/commit/238af839146026bd3085106bbc2b50e723087166))
* **offline:** keep the saved query cache when a query waited offline ([00bed50](https://github.com/cevi/conveniat-webpage/commit/00bed50cdf243cb84cb5d8b5456c58960e9db763))
* **offline:** load uncached pages as documents instead of waiting forever ([fbb2955](https://github.com/cevi/conveniat-webpage/commit/fbb2955061c258313466237a49f85dfe88df710f))
* **offline:** load uncached pages as documents instead of waiting forever ([a6dd8d0](https://github.com/cevi/conveniat-webpage/commit/a6dd8d0505e649fa947f462fb4214549ffb23004))
* **offline:** never abort the session check, only answer early from the cache ([8cb9299](https://github.com/cevi/conveniat-webpage/commit/8cb92996b2d886d127c45d607a77982d2911b5ff))
* **offline:** offer the download again after a logout and restart it cleanly ([57eedcf](https://github.com/cevi/conveniat-webpage/commit/57eedcf606fef0f3699610603d7e995401785633))
* **offline:** show the offline page for an uncached app page, not the dashboard ([558e920](https://github.com/cevi/conveniat-webpage/commit/558e9206fc26cd98121e428a1a612dfdeedcefec))
* **offline:** show the offline page for an uncached app page, not the dashboard ([13e6081](https://github.com/cevi/conveniat-webpage/commit/13e608155e7e7ade44436f35bd219cf86a1d193d))
* **offline:** stop inventing a session when none is cached ([baf1a8e](https://github.com/cevi/conveniat-webpage/commit/baf1a8e121475633d0f6f7070096b03f172f1306))
* **offline:** stop inventing a session when none is cached ([d42b066](https://github.com/cevi/conveniat-webpage/commit/d42b066f677bd78cd12222396e571a1e4d796aee))
* **offline:** tell a navigation from a same-page update by the referrer ([2e31a68](https://github.com/cevi/conveniat-webpage/commit/2e31a68470bc384453876a312f22b9ddb4c51028))
* **onboarding:** keep offering the download until it has run ([8e76bff](https://github.com/cevi/conveniat-webpage/commit/8e76bffbaa76a9e7b40f79089c70136a9138d3d1))
* **onboarding:** start offline when the dashboard is cached ([ae9812c](https://github.com/cevi/conveniat-webpage/commit/ae9812cf599c18b386483d0974d0c4615aa09c2e))
* **onboarding:** start offline when the dashboard is cached ([1249c01](https://github.com/cevi/conveniat-webpage/commit/1249c011469cf23bd7b2a714e0f648fb97234fb6))
* **push:** newest line first, sticky only for emergencies, close emergencies on read ([e13db36](https://github.com/cevi/conveniat-webpage/commit/e13db36f5cda9cf487fa0ed1b7e79c4cf691baae))
* **push:** no double alerts on retries, no lost lines, emergencies stand alone ([8a16140](https://github.com/cevi/conveniat-webpage/commit/8a1614021e41b62e9a955ae3223fc4a9c4fcb8db))
* **push:** tag the emergency alert under its chat too ([4db1d7b](https://github.com/cevi/conveniat-webpage/commit/4db1d7b5ed1008b9e35f1312b6a39f4929e3adc2))
* **pwa:** keep the page when the connection comes back ([4f93427](https://github.com/cevi/conveniat-webpage/commit/4f934271a0c78a899cbb5c9f29e5848ff6616c76))
* **pwa:** keep the page when the connection comes back ([0095d1f](https://github.com/cevi/conveniat-webpage/commit/0095d1f035c54f7933a0ef7521ab51cadf6c58e6))
* **pwa:** register the service worker with one set of options ([781966a](https://github.com/cevi/conveniat-webpage/commit/781966a5a178477e5688d1132805a2a9cd339ff6))
* **pwa:** register the service worker with one set of options ([74c1478](https://github.com/cevi/conveniat-webpage/commit/74c1478e36cb9446ea6aec07b7ff66ec84fc19fc))
* **pwa:** reload the offline page when the connection comes back ([30f47fb](https://github.com/cevi/conveniat-webpage/commit/30f47fbec04910c0aa0a87fdc467c7fdc0c83e88))
* **pwa:** reload the worker's inline offline page when the connection returns ([abfa62a](https://github.com/cevi/conveniat-webpage/commit/abfa62a94b22485c03bcb9e230af230579d5046f))
* **sw:** drop the previous build's RSC payloads when a new worker activates ([1152b5b](https://github.com/cevi/conveniat-webpage/commit/1152b5b8e45d45499179335f6d3264b7c507ab3d))
* **sw:** drop the previous build's RSC payloads when a new worker activates ([b073f94](https://github.com/cevi/conveniat-webpage/commit/b073f94f690992fb9a63544270c6b8df6f8b62b3))
* **sw:** keep prefetch responses out of the offline navigation cache ([cb742fb](https://github.com/cevi/conveniat-webpage/commit/cb742fb4962bbf9fe030cfd36bd6ac1f860d4540))
* **sw:** keep prefetch responses out of the offline navigation cache ([f6b6c5e](https://github.com/cevi/conveniat-webpage/commit/f6b6c5edf282582b2ee9ec6655dbbb9f6a7266d8))
* **sw:** leave the router's connectivity probe to the network ([0fe801d](https://github.com/cevi/conveniat-webpage/commit/0fe801df60eb4bde20da9a53c0691195f6d5ec29))
* **sw:** leave the router's connectivity probe to the network ([a9cbe4d](https://github.com/cevi/conveniat-webpage/commit/a9cbe4dc3c5d71ccab9144d00240de0f805acd87))
* **sw:** stop answering an offline CSRF request with a made-up token ([ba06b22](https://github.com/cevi/conveniat-webpage/commit/ba06b2238d681c6cb1e73235cde18e550552ef07))
* **sw:** stop answering an offline CSRF request with a token the server rejects ([67ab347](https://github.com/cevi/conveniat-webpage/commit/67ab347b27e45f3094f2a97569dcf4104ee73fc4))
* **tracing:** drop the /status health check from traces ([62f422e](https://github.com/cevi/conveniat-webpage/commit/62f422efea397f7afa65f4234617349a1bb20e5f))
* **tracing:** drop the /status health check from traces ([eab3ad7](https://github.com/cevi/conveniat-webpage/commit/eab3ad7ba768df14b756bebc0d804d50fe17a451))

## [1.25.0](https://github.com/cevi/conveniat-webpage/compare/v1.24.0...v1.25.0) (2026-09-29)


### Features

* **push:** trace push notifications from send to device ([2e69a0e](https://github.com/cevi/conveniat-webpage/commit/2e69a0edb86a007d0888b42164b56015bd9bf3fa))
* **push:** trace push notifications from send to device ([2dd51d2](https://github.com/cevi/conveniat-webpage/commit/2dd51d25f865d096d0c19b945be1db3e12d5b2c2))


### Bug Fixes

* **announcements:** push only after the announcement is validated and saved ([aa33f68](https://github.com/cevi/conveniat-webpage/commit/aa33f6825a5201cbac690ce3226dd642fbdf7195))
* **announcements:** push only after the announcement is validated and saved ([0e04eb6](https://github.com/cevi/conveniat-webpage/commit/0e04eb6478e6120ac644562bb4563276c8d507ca))
* **push:** cut long messages to a preview so the push is delivered ([6166625](https://github.com/cevi/conveniat-webpage/commit/6166625140067606e490935cc53c99b5098b6a17))
* **push:** cut long messages to a preview so the push is delivered ([508434d](https://github.com/cevi/conveniat-webpage/commit/508434d5eca0160b0e2e0b50390de662e3929f6f))
* **push:** keep WebKit from revoking subscriptions after suppressed pushes ([abc9108](https://github.com/cevi/conveniat-webpage/commit/abc9108d80662a306a53619e16f6ae43d7a367a8))
* **push:** keep WebKit from revoking subscriptions after suppressed pushes ([ae2fcdc](https://github.com/cevi/conveniat-webpage/commit/ae2fcdc0af8132b410e72226e5b873af39b7767a))
* **push:** logout ends this device's push subscriptions ([597598b](https://github.com/cevi/conveniat-webpage/commit/597598be627b674c32c761ffb5602044378d910a))
* **push:** logout ends this device's push subscriptions ([f2e840d](https://github.com/cevi/conveniat-webpage/commit/f2e840d559e6be0cc4cbf20249bebbfc41632987))
* **push:** report subscriptions the browser renews or a VAPID key change strands ([5939923](https://github.com/cevi/conveniat-webpage/commit/5939923585294bee9b2071a879d1af9e6851479f))
* **push:** report subscriptions the browser renews or a VAPID key change strands ([d605208](https://github.com/cevi/conveniat-webpage/commit/d605208017d44f84f21ecde5996f42dc85dd1f1e))
* **push:** stop deleting web push subscriptions on every boot ([84fe4d3](https://github.com/cevi/conveniat-webpage/commit/84fe4d32041de0a6296058658c848a416cc5605e))
* **push:** stop deleting web push subscriptions on every boot ([a93aae7](https://github.com/cevi/conveniat-webpage/commit/a93aae7af8a78c85a520ca48b593ee879b48b8bc))
* **push:** turning native push off survives app restarts ([5096288](https://github.com/cevi/conveniat-webpage/commit/509628858b37432c0928bdccf8b84cd760558d1b))
* **push:** turning native push off survives app restarts ([a100e6c](https://github.com/cevi/conveniat-webpage/commit/a100e6c214fb28ab8266276805ab34e87c096802))
* **sw:** keep repeated-slash API paths out of the runtime caches ([6c5cb09](https://github.com/cevi/conveniat-webpage/commit/6c5cb094d042fdf2c427c5153fb3532b68c43183))

## [1.24.0](https://github.com/cevi/conveniat-webpage/compare/v1.23.1...v1.24.0) (2026-09-28)


### Features

* **forms:** order materials in steps ([09d959e](https://github.com/cevi/conveniat-webpage/commit/09d959e843c8dc1bddeff889df9d3a9718a4ab51))
* **forms:** order materials in steps ([2a55509](https://github.com/cevi/conveniat-webpage/commit/2a555092feeca981aebfb2a2770c82dad1bd93a3))
* **material:** order step for articles ([d5f9074](https://github.com/cevi/conveniat-webpage/commit/d5f9074eba07a2e6f55bee3cb9147fd2a56527ec))
* **material:** order step for articles ([e78f180](https://github.com/cevi/conveniat-webpage/commit/e78f180662c8b1a9c8e649cbaf4e73f2dd524c83))


### Bug Fixes

* **push:** keep links to another origin, like con27.ch, in native pushes ([349de88](https://github.com/cevi/conveniat-webpage/commit/349de886fdf72d9fc337ac2259e3887fd3be4879))
* **push:** keep links to another origin, like con27.ch, in native pushes ([223ebe3](https://github.com/cevi/conveniat-webpage/commit/223ebe326d9efdfeeeec4a31e59c21c881325826))
* **push:** open links to another origin, like con27.ch, as they are ([0ca2bc9](https://github.com/cevi/conveniat-webpage/commit/0ca2bc9a67557cc6a9c38eaf769127ee28c81f01))
* **push:** open links to another origin, like con27.ch, as they are ([1e02c5a](https://github.com/cevi/conveniat-webpage/commit/1e02c5a6f4b6d7b9f31defb67a4f725362d2ee2a))
* **sw:** leave plain API requests to the browser ([c90cd1b](https://github.com/cevi/conveniat-webpage/commit/c90cd1b45de94eae96b05f756dee69a300663481))
* **sw:** leave plain API requests to the browser ([8158c92](https://github.com/cevi/conveniat-webpage/commit/8158c92441dee90172578c3863cccc9ff685c70d))

## [1.23.1](https://github.com/cevi/conveniat-webpage/compare/v1.23.0...v1.23.1) (2026-09-28)


### chore

* release dev into main ([4bec3c4](https://github.com/cevi/conveniat-webpage/commit/4bec3c48291478ddbdc3e561388585667532c9fd))

## [1.23.0](https://github.com/cevi/conveniat-webpage/compare/v1.22.1...v1.23.0) (2026-09-28)


### Features

* **billing:** ask for a reason when cancelling, and name the cancelled bill ([a3a0942](https://github.com/cevi/conveniat-webpage/commit/a3a094253eb5c0afc185de9ac5c5452190e287f7))
* **billing:** call a cancelled registration Storniert, like the action that cancels it ([739803b](https://github.com/cevi/conveniat-webpage/commit/739803b3b679aa2b81a51236b44e23cead3ec8d7))
* **billing:** finance overview lists every bill, replaced and cancelled ones marked ([208ad97](https://github.com/cevi/conveniat-webpage/commit/208ad97d19c6f26ecf3f8c1f7636c47d1c7a9ece))
* **billing:** finance overview lists every bill, replaced and cancelled ones marked ([cf54a84](https://github.com/cevi/conveniat-webpage/commit/cf54a84d79699d05931dc11684b12822ec4e73f6))
* **billing:** reason for Stornieren, and never cancel a bill from an incomplete Cevi.DB read ([affbdc7](https://github.com/cevi/conveniat-webpage/commit/affbdc7f448ab4de73f0b47539fd4efb87a2a301))
* **billing:** Stornogrund shows the reason given for Stornieren ([9335a9d](https://github.com/cevi/conveniat-webpage/commit/9335a9d14229f85b8f917691a4e8cac9a31dc7bf))


### Bug Fixes

* **billing:** read every Cevi.DB page and refuse an incomplete participation list ([28c85b6](https://github.com/cevi/conveniat-webpage/commit/28c85b6b36b3ac873c44b2c99c30f5135d222303))
* **offline:** refresh persisted data when a screen opens and on Update ([6e38768](https://github.com/cevi/conveniat-webpage/commit/6e387684b4f7b8149c0aa3e8ea2414562d2156fb))
* **offline:** refresh persisted data when a screen opens and on Update ([5327ba0](https://github.com/cevi/conveniat-webpage/commit/5327ba07708f95cfd53c6444f2c8e24361732d8a))

## [1.22.1](https://github.com/cevi/conveniat-webpage/compare/v1.22.0...v1.22.1) (2026-09-28)


### Bug Fixes

* **auth:** a visitor without a session is no user, null, as Payload expects ([e6ab1ab](https://github.com/cevi/conveniat-webpage/commit/e6ab1ab28b4e5a78357b9e4f778f3fff2975124e))
* **auth:** a visitor without a session is no user, null, as Payload expects ([131857c](https://github.com/cevi/conveniat-webpage/commit/131857cefc0c207fe3e2191f2961f5d6c2b1143e))
* **forms:** a Hof dashboard form can publish the files of approved submissions ([e3000a6](https://github.com/cevi/conveniat-webpage/commit/e3000a6cc23c0e7153ee0d320305a3ba49cc901c))
* **forms:** a Hof dashboard form can publish the files of approved submissions ([342d042](https://github.com/cevi/conveniat-webpage/commit/342d0423f1397337d8f95e6f2353dadd43e86769))

## [1.22.0](https://github.com/cevi/conveniat-webpage/compare/v1.21.0...v1.22.0) (2026-09-28)


### Features

* **chat:** cap the size of groups participants create ([8e7b9b1](https://github.com/cevi/conveniat-webpage/commit/8e7b9b1a952b077782862241708931d5f98f2c38))
* **chat:** cap the size of groups participants create ([e3e067a](https://github.com/cevi/conveniat-webpage/commit/e3e067a091649c188417a0113b799851daa2ede1))
* **hof-dashboard:** Hof ZIP holds a PDF of every submission, files named by version ([e8f6111](https://github.com/cevi/conveniat-webpage/commit/e8f6111fb4ae1e4af7f3ba69c93e81f35432e355))
* **hof-dashboard:** Hof ZIP holds a PDF of every submission, files named by version ([46f9ed8](https://github.com/cevi/conveniat-webpage/commit/46f9ed89db634b0f7c1a2fe124f2ee3c1dce7bc5))


### Bug Fixes

* **chat:** desktop chat sits below the top-nav header, without empty margins ([4a2441d](https://github.com/cevi/conveniat-webpage/commit/4a2441d29a713c6a5acc3acba74130cba0c37314))
* **chat:** long links wrap inside the bubble and the reaction bar stays on top ([4f894e8](https://github.com/cevi/conveniat-webpage/commit/4f894e89636741b2967ccf2e8ed18f60c6a4d59a))
* **chat:** message bubble wrapping, italics in links, reaction bar and desktop layout ([e9dd0aa](https://github.com/cevi/conveniat-webpage/commit/e9dd0aa72127c2a6192ed5d34e7dd574d8252d24))
* **chat:** rate-limit chat writes and narrow who a reply notifies ([6e52481](https://github.com/cevi/conveniat-webpage/commit/6e52481a8d5ead53d678c96ea49f2cd8639f9ec1))
* **chat:** rate-limit chat writes and narrow who a reply notifies ([32c307b](https://github.com/cevi/conveniat-webpage/commit/32c307b374abedd9099283a8ccf2c291ac345eb4))
* **chat:** refuse an oversized group in the user's language ([6c95d3c](https://github.com/cevi/conveniat-webpage/commit/6c95d3c28cab025ec8f65039d5557acfa59bb08a))
* **chat:** underscores in links and file names no longer turn into italics ([e50ea80](https://github.com/cevi/conveniat-webpage/commit/e50ea800e4ab764f384a8aa9b4269dae64a8d309))
* **forms:** answers can no longer expand into approval links in mails ([5254ff5](https://github.com/cevi/conveniat-webpage/commit/5254ff5de5e23399c59e7b9e1079c9d5a7d64d3a))
* **forms:** answers can no longer expand into approval links in mails ([9477022](https://github.com/cevi/conveniat-webpage/commit/9477022327327b9a8d44e244ae47c8a7995b5fc1))
* **forms:** form files live in their own bucket under random keys ([88c4cdc](https://github.com/cevi/conveniat-webpage/commit/88c4cdc1a4e2de45a960a732e9acf9c2e69fc163))
* **forms:** form files live in their own bucket under random keys ([8ac4cd4](https://github.com/cevi/conveniat-webpage/commit/8ac4cd4b8e94d710eba72ab7c120b94c8a215ce5))
* **forms:** read an uploaded file's type from its bytes, download what could run ([fc71515](https://github.com/cevi/conveniat-webpage/commit/fc715158930ebc87fb6f262a8f66e4dc5a5cfe23))
* **forms:** read an uploaded file's type from its bytes, download what could run ([f2e54bb](https://github.com/cevi/conveniat-webpage/commit/f2e54bb328d622a9457e787d2e75a736fb0ab872))
* **hitobito:** log Cevi.DB requests at debug, with structured attributes ([5d50368](https://github.com/cevi/conveniat-webpage/commit/5d50368ed9d48fc02e4742fbe4d31cd87fa93f32))
* **hitobito:** log Cevi.DB requests at debug, with structured attributes ([15c187b](https://github.com/cevi/conveniat-webpage/commit/15c187bd333d5e7200c623902e39a2a14a4b7783))
* **hof-dashboard:** answers show a checkbox's rich-text label, not its field name ([750be6a](https://github.com/cevi/conveniat-webpage/commit/750be6a8b57e02822b9420ee78e5d3d418ae4675))
* **hof-dashboard:** answers show a checkbox's rich-text label, not its field name ([2586595](https://github.com/cevi/conveniat-webpage/commit/2586595c53fec0186c1c9ae55664b524b85f9781))
* **hof-dashboard:** overview list no longer stretches the page below the footer ([2ad8c6e](https://github.com/cevi/conveniat-webpage/commit/2ad8c6e8a9d0a92eade9a77bc8579e96cdce3e55))
* **hof-dashboard:** overview list no longer stretches the page below the footer ([dac3e66](https://github.com/cevi/conveniat-webpage/commit/dac3e667e3e83b312570f5c07c9ef098cc4ae236))
* **menu:** move top-level items that do not fit into a "Mehr" menu ([f58b556](https://github.com/cevi/conveniat-webpage/commit/f58b5560bd77f249a9a84ecdbcd050dfd47ce920))
* **menu:** move top-level items that do not fit into a "Mehr" menu ([68b7684](https://github.com/cevi/conveniat-webpage/commit/68b768489632945e5805da96abe958d764e87ec0))
* **push:** report and prune web push subscriptions the push service rejects ([902074e](https://github.com/cevi/conveniat-webpage/commit/902074e4cae726f02a38028e7f5e6784be0d2d1c))
* **push:** report and prune web push subscriptions the push service rejects ([e904300](https://github.com/cevi/conveniat-webpage/commit/e904300f78dbf7d8d8642155ebee504881b65b6b))


### Performance

* **chat:** stop background pings and duplicate refetches ([515c3e5](https://github.com/cevi/conveniat-webpage/commit/515c3e56bf1a259f478341a82b476882a643d840))
* **chat:** stop background pings and duplicate refetches ([ef0bf9e](https://github.com/cevi/conveniat-webpage/commit/ef0bf9e335db2fd51a67989c9d257dd9ab9530bf))

## [1.21.0](https://github.com/cevi/conveniat-webpage/compare/v1.20.0...v1.21.0) (2026-09-28)


### Features

* **chat:** leave group chats and confirm destructive swipes ([9c9eed0](https://github.com/cevi/conveniat-webpage/commit/9c9eed04aa3f538a9afde2113c0e0e0098ffe086))
* **chat:** leave group chats and confirm destructive swipes ([2b0f092](https://github.com/cevi/conveniat-webpage/commit/2b0f092c306050dc349453ba99196ea042253713))
* **hof-dashboard:** an overview of every Hof, and accepting an area at once ([059ca0d](https://github.com/cevi/conveniat-webpage/commit/059ca0db6230e00f8e8fe6b2f8e91d9903fbd074))
* **hof-dashboard:** an overview of every Hof, and accepting an area at once ([421e8b2](https://github.com/cevi/conveniat-webpage/commit/421e8b283ea7f9fdd482f1cd2cc99d64d245dea1))
* **hof-dashboard:** download everything a Hof handed in as a ZIP ([37caafe](https://github.com/cevi/conveniat-webpage/commit/37caafeb5f4769c0739e8ee61715e5da1784a7f4))
* **hof-dashboard:** download everything a Hof handed in as a ZIP ([b0353de](https://github.com/cevi/conveniat-webpage/commit/b0353de3403df501c811021c808558bb15df9ae5))
* **map:** open the camp map rotated along the valley ([aad74ec](https://github.com/cevi/conveniat-webpage/commit/aad74ec89ca751ad9f0e5b2a90120a12a9fc7977))
* **map:** open the camp map rotated along the valley ([6f8218b](https://github.com/cevi/conveniat-webpage/commit/6f8218bb7c7010f5b43c13de44c44a3886601227))
* **map:** paint the camp map as a watercolour plan ([7b8e51f](https://github.com/cevi/conveniat-webpage/commit/7b8e51f55030377ac01961ec8749e4067bf5acc4))
* **map:** paint the camp map as a watercolour plan ([4424e70](https://github.com/cevi/conveniat-webpage/commit/4424e70098f211bb033c84fb71faccd4c4187b5c))


### Bug Fixes

* **announcements:** remove unauthenticated debug route ([dc0c04d](https://github.com/cevi/conveniat-webpage/commit/dc0c04d9cd4ed3eb73a7ecd0c984927248f632ee))
* **chat:** deduplicate read events and index thread replies ([9fab137](https://github.com/cevi/conveniat-webpage/commit/9fab1372d77ec5388f39b0728656e5c51b58a340))
* **chat:** deduplicate read events and index thread replies ([f6d9b89](https://github.com/cevi/conveniat-webpage/commit/f6d9b8904d9154e899906951cea1bca44edc54d3))
* **chat:** end a removed member's live stream ([0675f2b](https://github.com/cevi/conveniat-webpage/commit/0675f2b4c045ea4d00371754e46b02d55d951856))
* **chat:** end a removed member's live stream ([3a80121](https://github.com/cevi/conveniat-webpage/commit/3a801214ae6facb36a53c38bb29bafd12697b4e0))
* **chat:** end the chat-list refetch storm ([21a21d9](https://github.com/cevi/conveniat-webpage/commit/21a21d9c588e89ae76fa3bf4abbff0fe5bc976b1))
* **chat:** end the chat-list refetch storm ([401a904](https://github.com/cevi/conveniat-webpage/commit/401a904aeebf72a5cc6aee655c84a3b72a04b973))
* **chat:** offline outbox keeps messages on transient failures ([1f2bc0a](https://github.com/cevi/conveniat-webpage/commit/1f2bc0a5b112dce32cc587c9c048df558bb7b731))
* **chat:** offline outbox keeps messages on transient failures ([1a26241](https://github.com/cevi/conveniat-webpage/commit/1a26241c81e2e7d13edfeb5bcd5d0c70c921092c))
* **chat:** only server code creates system and alert messages ([8a5ebc3](https://github.com/cevi/conveniat-webpage/commit/8a5ebc3cb4205799e09460ad58c53f8c6cf6f467))
* **chat:** only server code creates system and alert messages ([5ae1f4b](https://github.com/cevi/conveniat-webpage/commit/5ae1f4b93fb71b27ab10fc00922ea7eb4c85599f))
* **chat:** publish realtime events and pushes only after the transaction commits ([2bdddfc](https://github.com/cevi/conveniat-webpage/commit/2bdddfc466faa8da0e6c4f6c3eaf310be8a8b3b2))
* **chat:** publish realtime events and pushes only after the transaction commits ([9d4c7ca](https://github.com/cevi/conveniat-webpage/commit/9d4c7ca78fd7703c2067afbc976138d2d2550836))
* **chat:** queue the full send, per user, before the request goes out ([cfa3817](https://github.com/cevi/conveniat-webpage/commit/cfa381701e9c71042a9f87b35561b0c08b6d9d33))
* **chat:** queue the full send, per user, before the request goes out ([f4523d5](https://github.com/cevi/conveniat-webpage/commit/f4523d5f5b4af56fa63e5f935cfe5c51fe993033))
* **chat:** reject writes to archived chats on the server ([b8172b2](https://github.com/cevi/conveniat-webpage/commit/b8172b2cce2ab6b98c5390184f0b2eaf3798676b))
* **chat:** reject writes to archived chats on the server ([54c8a07](https://github.com/cevi/conveniat-webpage/commit/54c8a07e9f7cece2c422e4e97586e8898a8b7e97))
* **emails:** record and resend the plain-text body of outgoing emails ([587118a](https://github.com/cevi/conveniat-webpage/commit/587118a038cad08c0b19dc27f82890c67e1c1d10))
* **emails:** record and resend the plain-text body of outgoing emails ([e9f46e4](https://github.com/cevi/conveniat-webpage/commit/e9f46e4e438d10421d09433de543b27820ccecac))
* **hoefe:** sync renames Höfe and removes those whose group left Cevi.DB ([bd318e3](https://github.com/cevi/conveniat-webpage/commit/bd318e31d19e69faf40dfd59ffbf6b64fd3a7960))
* **hoefe:** sync renames Höfe and removes those whose group left Cevi.DB ([921b024](https://github.com/cevi/conveniat-webpage/commit/921b02430d9c6654743de88e5b1f356c16ce38a4))
* **payload-cms:** align poster hero text with the page body ([ecc6377](https://github.com/cevi/conveniat-webpage/commit/ecc6377350cda4f9224710b388618a4a606089f9))
* **payload-cms:** align poster hero text with the page body ([5957024](https://github.com/cevi/conveniat-webpage/commit/595702464b60cc4e95907c7a73bb182516b5e0bf))
* **schedule:** accept organisers populated without an email ([ea2cca0](https://github.com/cevi/conveniat-webpage/commit/ea2cca0828ad16a08a071720a9cad6b7df2ff5bb))
* **schedule:** accept organisers populated without an email ([0a6a896](https://github.com/cevi/conveniat-webpage/commit/0a6a896791768e986b1b995e0f4b08a59be3ce3d)), closes [#1969](https://github.com/cevi/conveniat-webpage/issues/1969)
* **settings:** profile picture actions unfold in place instead of floating ([3ca15eb](https://github.com/cevi/conveniat-webpage/commit/3ca15eb57b96256711a174adefc506d51b68fc6e))
* **settings:** profile picture actions unfold in place instead of floating ([be0c1dc](https://github.com/cevi/conveniat-webpage/commit/be0c1dc09dad7a2734c06180935547d4be8caec0))

## [1.20.0](https://github.com/cevi/conveniat-webpage/compare/v1.19.1...v1.20.0) (2026-09-27)


### Features

* **chat:** mark a Hof's AVP in the address book and chat ([1f10d20](https://github.com/cevi/conveniat-webpage/commit/1f10d20ca8b3fdd91206e966c03e5b73ea113982))
* **chat:** mark a Hof's AVP in the address book and chat ([fc5bd4e](https://github.com/cevi/conveniat-webpage/commit/fc5bd4e7494384e7be7313ef86bd434a58726327))
* **chat:** pin announcement channels to the top of the chat overview ([31dfc93](https://github.com/cevi/conveniat-webpage/commit/31dfc93065b886ca60874544441f47cb14f96b1e))
* **chat:** pin announcement channels to the top of the chat overview ([0b1f718](https://github.com/cevi/conveniat-webpage/commit/0b1f718c3460bc7e278c7f12354cf35e5787e91e))
* **chat:** restrict the contact list to Hof, scanned contacts and leaders ([a118138](https://github.com/cevi/conveniat-webpage/commit/a1181383f0311340b81ccebcfe9ac6829f7e4999))
* **chat:** restrict the contact list to Hof, scanned contacts and leaders ([b2d9588](https://github.com/cevi/conveniat-webpage/commit/b2d9588ed3dddda3675604d1751b01daae291e15))
* **chat:** two-letter initials avatars on a colour per person ([7c107ea](https://github.com/cevi/conveniat-webpage/commit/7c107ea4f2035525348365e3820ac554d6e3ae80))
* **chat:** two-letter initials avatars on a colour per person ([2705500](https://github.com/cevi/conveniat-webpage/commit/2705500f7dc4e4e1446b1dabe7c801e85e40c2b8))
* **settings:** profile pictures uploaded in the app ([b2bf9f0](https://github.com/cevi/conveniat-webpage/commit/b2bf9f0d4e3d3539c94119bce745fbc1ec0e19e7))
* **settings:** profile pictures uploaded in the app ([1c606e9](https://github.com/cevi/conveniat-webpage/commit/1c606e9326a00b15ca7a8012e766dcddf6505ffd))


### Bug Fixes

* **chat:** a scanned QR code opens a single chat ([7c2076c](https://github.com/cevi/conveniat-webpage/commit/7c2076c5e77da096d9f4e78909bc2352b747087d))
* **chat:** a scanned QR code opens a single chat ([4777eac](https://github.com/cevi/conveniat-webpage/commit/4777eacd1b8ce1eb3f5ee6282e02d657b94fb511))
* **chat:** image links only for members, only for the chat's own images ([22276e9](https://github.com/cevi/conveniat-webpage/commit/22276e9890ef3d1e2cdb6678072e09f9c9fc3e15))
* **chat:** image links only for members, only for the chat's own images ([1bd8ad0](https://github.com/cevi/conveniat-webpage/commit/1bd8ad0804a83cdf53edb05aa7145f3e5474fcfe))
* **chat:** members can delete archived chats ([45b376f](https://github.com/cevi/conveniat-webpage/commit/45b376fc6ffe16477a947fa7b99cb9bc354f136e))
* **chat:** members can delete archived chats ([1970dc9](https://github.com/cevi/conveniat-webpage/commit/1970dc989e4a2f4bcac4e71aa2979f12ff195765))
* **emergency:** simultaneous alerts both open a case, the piket is woken after commit ([503dcc4](https://github.com/cevi/conveniat-webpage/commit/503dcc409f6e38b2c0bea61b9fd2ba9c638b6030))
* **emergency:** simultaneous alerts both open a case, the piket is woken after commit ([b07e3ee](https://github.com/cevi/conveniat-webpage/commit/b07e3ee517e9db50c42ec49d797a525dc426cb39))
* **forms:** senders cannot set job links or mail results on a submission ([c84980c](https://github.com/cevi/conveniat-webpage/commit/c84980c3b4cf66bb5e00d5e3d893bf960bef172e))
* **forms:** senders cannot set job links or mail results on a submission ([089a789](https://github.com/cevi/conveniat-webpage/commit/089a78948b979654850afd5e68f460aaae7a4397))
* **settings:** show the user's Hof and Quartier from the registration ([b4cca05](https://github.com/cevi/conveniat-webpage/commit/b4cca050d145b1fea78e750f998c8b20a67b89fe))
* **settings:** show the user's Hof and Quartier from the registration ([4a7b90c](https://github.com/cevi/conveniat-webpage/commit/4a7b90c0ac92942ff96a79226bf91df2591151d3))

## [1.19.1](https://github.com/cevi/conveniat-webpage/compare/v1.19.0...v1.19.1) (2026-09-27)


### Bug Fixes

* **funktionen:** the sync button runs the sync and shows its progress ([3c5fc9a](https://github.com/cevi/conveniat-webpage/commit/3c5fc9aacca3878f52fdfeba641e409f94c379a3))
* **funktionen:** the sync button runs the sync and shows its progress ([802799a](https://github.com/cevi/conveniat-webpage/commit/802799abd08cddcf90f5c403c0d2eabf88afe581))
* **hof-dashboard:** balance the lines of a form's description ([fb6a670](https://github.com/cevi/conveniat-webpage/commit/fb6a67040bd75e2f15fed457b861021507d5bd72))
* **hof-dashboard:** balance the lines of a form's description ([f4c7edc](https://github.com/cevi/conveniat-webpage/commit/f4c7edcd59a64af9d0375b6d6460f709b97e996f))

## [1.19.0](https://github.com/cevi/conveniat-webpage/compare/v1.18.1...v1.19.0) (2026-09-27)


### Features

* **chat:** show and search the Hof in the address book ([c72eb12](https://github.com/cevi/conveniat-webpage/commit/c72eb1254f5e413d09c59667637a1337dee7aa2d))
* **chat:** show the Hof of the participants in the chat details ([15a5ea0](https://github.com/cevi/conveniat-webpage/commit/15a5ea0eaa648c202443e85cc9863000e65beffd))
* **hoefe:** Quartiere in the CMS, each Hof placed in one ([20eaf43](https://github.com/cevi/conveniat-webpage/commit/20eaf43c9210b3138b68237c54937222a02f720d))
* **hof-dashboard:** the Ressorts Infrastruktur and Programm review the Höfe ([851f76c](https://github.com/cevi/conveniat-webpage/commit/851f76cb551107257d3c1bb82f731d70ec654e49))
* **hof-dashboard:** the Ressorts Infrastruktur and Programm review the Höfe ([0c36f1c](https://github.com/cevi/conveniat-webpage/commit/0c36f1c042500d649ce7e17967a47c0946f28b51))
* **users:** camp functions synced from Cevi.DB ([70338d9](https://github.com/cevi/conveniat-webpage/commit/70338d931a9a80b4dc56b5932611567dc2d06f87))
* **users:** camp functions synced from Cevi.DB ([7858535](https://github.com/cevi/conveniat-webpage/commit/7858535ad3c57b16b55c402e215818f18fb134d9))
* **users:** link users to their Höfe from the registrations ([b7233f8](https://github.com/cevi/conveniat-webpage/commit/b7233f873b611f32f6b7d5acc6194f5ed5bbfc37))


### Bug Fixes

* **funktionen:** fail safe on bad Cevi.DB answers, log every sync ([0d57a2f](https://github.com/cevi/conveniat-webpage/commit/0d57a2f3d76eff277f51db6267863ea063c0843c))
* **hitobito:** never send Cevi.DB credentials to another origin ([ecf8428](https://github.com/cevi/conveniat-webpage/commit/ecf8428806fd7f27e694b57baa952d2fb5317992))
* **hof-dashboard:** browser back returns to the tab the user came from ([#1932](https://github.com/cevi/conveniat-webpage/issues/1932)) ([0826f47](https://github.com/cevi/conveniat-webpage/commit/0826f473a250b6a921e78fb1f31f1749a56ceed4))
* **hof-dashboard:** name the Hof's responsible people from Cevi.DB ([#1933](https://github.com/cevi/conveniat-webpage/issues/1933)) ([49daf5a](https://github.com/cevi/conveniat-webpage/commit/49daf5abdfe2000e145d3ec5a3155c7f7287613d))
* review findings on the Hof and functions stack ([9055a64](https://github.com/cevi/conveniat-webpage/commit/9055a64736aea35780e510a16f633b9019f1fa9a))

## [1.18.1](https://github.com/cevi/conveniat-webpage/compare/v1.18.0...v1.18.1) (2026-09-27)


### Bug Fixes

* **billing:** the Cevi.DB sync button shows again for the billing team ([#1925](https://github.com/cevi/conveniat-webpage/issues/1925)) ([e809d66](https://github.com/cevi/conveniat-webpage/commit/e809d66f7f32289a9e5c1f5ff87e86b662e7b40d))

## [1.18.0](https://github.com/cevi/conveniat-webpage/compare/v1.17.1...v1.18.0) (2026-09-27)


### Features

* **hof-dashboard:** Hof dashboard built on Payload forms ([#1921](https://github.com/cevi/conveniat-webpage/issues/1921)) ([048680a](https://github.com/cevi/conveniat-webpage/commit/048680a35a1089f3a0267437de5339b2dfa4377e))


### Bug Fixes

* **admin:** the material team sees only the depot setup in the admin panel ([525f73a](https://github.com/cevi/conveniat-webpage/commit/525f73af35e5a90cb2cdc7b15efc7513915ada80))
* **admin:** the material team sees only the depot setup in the admin panel ([4d0e896](https://github.com/cevi/conveniat-webpage/commit/4d0e8967be7f5b4fc19984a76db83acd7c377cbc))
* **material:** depot tabs stick right below the header on wide screens ([02228f7](https://github.com/cevi/conveniat-webpage/commit/02228f79b630725e9f6491246b57695d13979acd))
* **material:** the basket says what is free while it is filled ([084d085](https://github.com/cevi/conveniat-webpage/commit/084d085dbd27e8cca43769f55a82afdbf8f00414))

## [1.17.1](https://github.com/cevi/conveniat-webpage/compare/v1.17.0...v1.17.1) (2026-09-26)


### Bug Fixes

* **announcements:** require preview access for the announcement preview ([0cca3b2](https://github.com/cevi/conveniat-webpage/commit/0cca3b252df10a192a3e5612b985becf09de199b))
* **chat:** chat details and single messages only for members ([e1954e3](https://github.com/cevi/conveniat-webpage/commit/e1954e359e05e04d643605d8d29c042f1a75e81f))
* **chat:** chat details and single messages only for members ([e22ae65](https://github.com/cevi/conveniat-webpage/commit/e22ae655078cb0c370c7a69d8cc2fd1548d05734))
* **chat:** only admins list the support chats ([99a1fa6](https://github.com/cevi/conveniat-webpage/commit/99a1fa6404e0b272611ca6638ffe3f71f58d5f9d))
* **chat:** only admins list the support chats ([6995e85](https://github.com/cevi/conveniat-webpage/commit/6995e851fe44dc93f26daa5ec795375f11b2b15f))
* **cms:** populate only what rendering needs for forms and pages ([28e0aad](https://github.com/cevi/conveniat-webpage/commit/28e0aade74034692158e92db3e5c43de0b87b4f7))
* **cms:** populate only what rendering needs for forms and pages ([b3f9d83](https://github.com/cevi/conveniat-webpage/commit/b3f9d83fcc83ea51e3555833f2c463c20ef8d5db))
* **cookie-banner:** render above the desktop side panel ([633f732](https://github.com/cevi/conveniat-webpage/commit/633f732a0e973233f0252121a5bd79802d1a6897))
* **cookie-banner:** render above the desktop side panel ([cb83651](https://github.com/cevi/conveniat-webpage/commit/cb836515576078d5a0a0836ecc4dc0232d8f01b9))
* **emergency:** return only the fields emergency cards render ([5912020](https://github.com/cevi/conveniat-webpage/commit/5912020c00a10a039a83eb2893df879ace6f9cd2))
* **emergency:** return only the fields emergency cards render ([7fabea1](https://github.com/cevi/conveniat-webpage/commit/7fabea150bb002e136aba291e33fa2a99ad3fa23))
* **forms:** export submissions only to who may read them ([6829b55](https://github.com/cevi/conveniat-webpage/commit/6829b554febc14ef32d140e96b015009c98301ca))
* **forms:** export submissions only to who may read them ([16d8646](https://github.com/cevi/conveniat-webpage/commit/16d864644f50d65fdbee742d7a543d1598972f6f))
* **forms:** require an approved submission or editor access for form files ([e9597ec](https://github.com/cevi/conveniat-webpage/commit/e9597ec10a084d3d8e5b0f2fadb0bcbe19397e2e))
* **forms:** require an approved submission or editor access for form files ([33fe3bd](https://github.com/cevi/conveniat-webpage/commit/33fe3bdec08494277a85b44ab6b0bc51b7e300d9))
* **forms:** show approved submissions without their private fields ([0dce7d5](https://github.com/cevi/conveniat-webpage/commit/0dce7d58f4b48cc3a005a7f2dbcdf9ee2c3d69b8))
* **forms:** show approved submissions without their private fields ([24b2641](https://github.com/cevi/conveniat-webpage/commit/24b264192a25b53968a8dca35eb68fba734ad5d1))
* **helper-shifts:** keep internal notes out of the public API ([a6fb391](https://github.com/cevi/conveniat-webpage/commit/a6fb3914b6040451bdcc44e39d2dcce37c5df7fb))
* **helper-shifts:** keep internal notes out of the public API ([f902e04](https://github.com/cevi/conveniat-webpage/commit/f902e0473e495d5b2caa27c117e9487d3ce085ed))
* **map:** load the MapLibre worker from a self-hosted bundle ([304afa6](https://github.com/cevi/conveniat-webpage/commit/304afa66947218e8122572cebe408f74fea6c6fc))
* **search:** send only permitted results to the browser ([b58eff5](https://github.com/cevi/conveniat-webpage/commit/b58eff5f8c7b92c4b56cf39f8c9e3726a0d952a8))
* **users:** populate only the name when another document links a user ([3f23f82](https://github.com/cevi/conveniat-webpage/commit/3f23f82459a659cc122d64b51a8db56b9ef07821))

## [1.17.0](https://github.com/cevi/conveniat-webpage/compare/v1.16.0...v1.17.0) (2026-09-26)


### Features

* **announcements:** publish every language at once, with a single push ([a6d0742](https://github.com/cevi/conveniat-webpage/commit/a6d0742eb18a40d398a260e75f341ea2e1110a38))
* **announcements:** publish every language at once, with a single push ([86ab276](https://github.com/cevi/conveniat-webpage/commit/86ab2762af80ae040fe7509eb21dc0320be74cab))
* **announcements:** show push delivery, taps and chat reads on the announcement ([cdd128d](https://github.com/cevi/conveniat-webpage/commit/cdd128dc95d82ad9f1bf694166128109b5e7c0ce))
* **announcements:** show push delivery, taps and chat reads on the announcement ([bc5027a](https://github.com/cevi/conveniat-webpage/commit/bc5027a7f85d2ece4184c5a6658b1b5fd27443c7))
* **billing:** move the Höfe into a shared collection ([973c928](https://github.com/cevi/conveniat-webpage/commit/973c92830924dfe40496bd68a3436bdb1cd8dc75))
* **billing:** move the Höfe into a shared collection ([dbd4c2a](https://github.com/cevi/conveniat-webpage/commit/dbd4c2a7ee4bb3c423538d32f22a825e289cdaa5))
* **material:** book loans on a Hof instead of a department ([775d1dd](https://github.com/cevi/conveniat-webpage/commit/775d1ddae7601f7d60c6e9fd01cc38ebdfb773da))
* **material:** four screens for the counter: overview, hand out, take back, inventory ([6effa5b](https://github.com/cevi/conveniat-webpage/commit/6effa5bdf335b694995bb992687450add80332d4))
* **material:** Höfe request material and announce returns ([9729450](https://github.com/cevi/conveniat-webpage/commit/97294506a57ed19d62e5dc433e1d14b8d94169fb))
* **material:** material depot for reservations, loans and returns ([48f1e44](https://github.com/cevi/conveniat-webpage/commit/48f1e44a3e36a667aaf9340ae5246e783d5e9408))
* **material:** material depot for reservations, loans and returns ([c767084](https://github.com/cevi/conveniat-webpage/commit/c7670844c8466ce6f1753afe67bfdaa8e27b0fff))
* **material:** phone-first lists, bulk actions and pagination ([45a1c8f](https://github.com/cevi/conveniat-webpage/commit/45a1c8fd415371e0af46bc135e1250b5e3dcd1de))


### Bug Fixes

* **admin:** push subscription page uses Payload's own edit view ([9a2271d](https://github.com/cevi/conveniat-webpage/commit/9a2271d250552718dbd26bf3dbc3f5be5de17d0c))
* **billing:** seed the Höfe right after the users ([1b89717](https://github.com/cevi/conveniat-webpage/commit/1b897175efcebc306b171e04f546421cad93669a))
* **documents:** downloads cell no longer crashes the edit view's form state ([6df4db1](https://github.com/cevi/conveniat-webpage/commit/6df4db1555bfc34294704e2172a762b740c5da29))
* **documents:** downloads cell no longer crashes the edit view's form state ([d9e2861](https://github.com/cevi/conveniat-webpage/commit/d9e2861ac6757f4155bb5e457161f276eda7c927))
* **forms:** helper job list returns only the fields the form shows ([5178b77](https://github.com/cevi/conveniat-webpage/commit/5178b77e790c8d9f53918d6d16c18c018a70d6ef))
* **forms:** helper job list returns only the fields the form shows ([ae36be5](https://github.com/cevi/conveniat-webpage/commit/ae36be5bd41db3f63afcaf90b82ade1114dfbb22))
* **material:** keep the depot tabs clear of the header logo on phones ([fd518aa](https://github.com/cevi/conveniat-webpage/commit/fd518aa29d314ecb423c573c8eb6209e57c475a3))
* **material:** review findings on requests, the role gate and touch targets ([0db5aca](https://github.com/cevi/conveniat-webpage/commit/0db5acaa53714fb617a5227e3c861120063c3ee1))
* **onboarding:** skip the Cevi.DB login screen while offline ([809e9bd](https://github.com/cevi/conveniat-webpage/commit/809e9bd29e9049decc07862fc2af97a6ea303c58))
* **payload-cms:** donation barometer test passes on ICU before 78 ([557b83d](https://github.com/cevi/conveniat-webpage/commit/557b83db4a9f2d14b1a4347cd1411cab46606490))
* **payload-cms:** donation barometer test passes on ICU before 78 ([00a2f9a](https://github.com/cevi/conveniat-webpage/commit/00a2f9a6bf30ddb8ed7bcdde0ac4e4e00be8d374))
* **presence:** auto checkout runs every queue tick instead of every 5 minutes ([2164906](https://github.com/cevi/conveniat-webpage/commit/21649063b30f7ff2ae38f32037560b353d140c34))
* **push:** only admins can read push history or send test pushes ([bc9fe0c](https://github.com/cevi/conveniat-webpage/commit/bc9fe0c3b3ee79204cf2af86edc38044f39c336e))
* **push:** only admins can read push history or send test pushes ([3e52743](https://github.com/cevi/conveniat-webpage/commit/3e52743e5367022ad8793d0dafc911a7d7ac5313))
* **push:** push history and test sends are for full admins only ([dd8da74](https://github.com/cevi/conveniat-webpage/commit/dd8da74079a4bc47de4360877c1b293b772f8e1c))
* **push:** record taps on native app notifications ([3a1093e](https://github.com/cevi/conveniat-webpage/commit/3a1093ec314fe0fa88e49cbb7a40f28ab957bfa2))


### Performance

* **docker:** cut the production image from 3.6 GB to 750 MB ([f5cbe88](https://github.com/cevi/conveniat-webpage/commit/f5cbe88a72cbd62bbc825fd5a9fff460974e0859))
* **docker:** cut the production image from 3.6 GB to 750 MB ([c04c16d](https://github.com/cevi/conveniat-webpage/commit/c04c16d56ffea0c85ec017925b8eaaeea46f7325))

## [1.16.0](https://github.com/cevi/conveniat-webpage/compare/v1.15.0...v1.16.0) (2026-09-26)


### Features

* **forms:** send a confirmation email only for the branch a person took ([10973e9](https://github.com/cevi/conveniat-webpage/commit/10973e91c2b0ba02c765ab5315b704e4c35710ca))
* **forms:** send a confirmation email only for the branch a person took ([3b33ae8](https://github.com/cevi/conveniat-webpage/commit/3b33ae846cbabed8e8a2763b2d93d8cff4daae12))
* **mcp:** publish and unpublish documents through a per-key capability ([90d3942](https://github.com/cevi/conveniat-webpage/commit/90d3942bd91914763c23a5daf3875f851a7ea22a))
* **mcp:** publish and unpublish documents through a per-key capability ([5c5be25](https://github.com/cevi/conveniat-webpage/commit/5c5be25c42e6d3c57becec1e87306b0f2496032a))
* **payload-cms:** open the frontend in app or web view from the dashboard ([56f5029](https://github.com/cevi/conveniat-webpage/commit/56f50292d79ed0c85aeb0530a70e2431e25eef6b))
* **payload-cms:** open the frontend in app or web view from the dashboard ([aa21934](https://github.com/cevi/conveniat-webpage/commit/aa21934e52e6ce3170cc31ea29d2c148c42af4af)), closes [#1633](https://github.com/cevi/conveniat-webpage/issues/1633)


### Bug Fixes

* **billing:** write the bill overview Excel in Banana's import format ([fe23c64](https://github.com/cevi/conveniat-webpage/commit/fe23c649885c38e59ecc3df03971dfa1c562be1c))
* **billing:** write the bill overview Excel in Banana's import format ([91c8350](https://github.com/cevi/conveniat-webpage/commit/91c8350c6165b9d3ad810871920e6e640b08c879))
* **logging:** route the last server-side console calls through the logger ([c023a8b](https://github.com/cevi/conveniat-webpage/commit/c023a8bb0b3ce3876484f0b657853663ac82ae8f))
* **logging:** route the last server-side console calls through the logger ([374dffb](https://github.com/cevi/conveniat-webpage/commit/374dffb354b8ec0186ad4e136f36211f9d43bde6)), closes [#1525](https://github.com/cevi/conveniat-webpage/issues/1525)
* **mcp:** publishing respects the key's per-collection update toggle ([d99726c](https://github.com/cevi/conveniat-webpage/commit/d99726c84a1aaa38173d54c98df5369592f69bd7))

## [1.15.0](https://github.com/cevi/conveniat-webpage/compare/v1.14.0...v1.15.0) (2026-09-26)


### Features

* **billing:** download the bill overview Excel from the bill settings ([5beaf15](https://github.com/cevi/conveniat-webpage/commit/5beaf151f002013d6b489f6434833b4325f5547f))
* **billing:** download the bill overview Excel from the bill settings ([d87d712](https://github.com/cevi/conveniat-webpage/commit/d87d712a43cdbc859782f2ca131d03cb310d9d71))
* **cms:** add posterHero full-bleed banner block ([be6bd1a](https://github.com/cevi/conveniat-webpage/commit/be6bd1a05871178b113f834123a2769b87c4124f))
* **cms:** add posterHero full-bleed banner block ([4803351](https://github.com/cevi/conveniat-webpage/commit/480335198e4d44011992358b337c49e6aad1dff6))
* **mcp:** serve helper jobs over MCP ([b50bad6](https://github.com/cevi/conveniat-webpage/commit/b50bad61efb5387d0ef89280bcfcea90bccc6461))


### Bug Fixes

* **billing:** keep the bill overview download out of the browser cache ([d54c5ac](https://github.com/cevi/conveniat-webpage/commit/d54c5acef73ec9f60da83214668182cfa8a2ea7c))
* **cms:** poster hero sits flush under the header ([dbd51be](https://github.com/cevi/conveniat-webpage/commit/dbd51be38d61eb6b4ad78268ae05ab4053974ac6))
* **push:** title notifications with the deployment's app name ([e9c0bee](https://github.com/cevi/conveniat-webpage/commit/e9c0bee037eee83c196a99094dcb062ddc908583))
* **push:** title notifications with the deployment's app name ([08428c1](https://github.com/cevi/conveniat-webpage/commit/08428c1931374fb476af905afe607279b757a04b)), closes [#1855](https://github.com/cevi/conveniat-webpage/issues/1855)

## [1.14.0](https://github.com/cevi/conveniat-webpage/compare/v1.13.0...v1.14.0) (2026-09-26)


### Features

* **documents:** count downloads and show them in the admin panel ([fff4bf8](https://github.com/cevi/conveniat-webpage/commit/fff4bf8dec2e0f0286a6316c0af19d50e5518e04))
* **documents:** count downloads and show them in the admin panel ([6b37f5f](https://github.com/cevi/conveniat-webpage/commit/6b37f5f73807f36292f7267d8451b9129a29755b))
* **menu:** keep desktop submenu open until an outside click ([4f16d2b](https://github.com/cevi/conveniat-webpage/commit/4f16d2b0954573814b8eca32ec9146bfd91defe3))
* **menu:** open desktop submenus on click instead of hover ([0b6ea51](https://github.com/cevi/conveniat-webpage/commit/0b6ea51669306dcea14678de2e39799883693d6b))
* **menu:** open desktop submenus on click, close on outside click ([52ff10b](https://github.com/cevi/conveniat-webpage/commit/52ff10b25f5125305cc17c6a8ccdb71c93116e30))


### Bug Fixes

* **billing:** export the accounting CSV in Banana's import format ([9d21360](https://github.com/cevi/conveniat-webpage/commit/9d2136039601d288cae4abe4200a090f0928365f))
* **billing:** export the accounting CSV in Banana's import format ([7342fd6](https://github.com/cevi/conveniat-webpage/commit/7342fd6b00b896328767c4827e1362a9531c122a))
* **documents:** keep downloads of users missing from the Postgres mirror ([6abe202](https://github.com/cevi/conveniat-webpage/commit/6abe202f24f0357ebb0ca5cc2473469056740766))
* **mcp:** pages saved over MCP clear the page cache ([27bb057](https://github.com/cevi/conveniat-webpage/commit/27bb057b43318c97c80e301243de85e55a78f1fe))
* **mcp:** pages saved over MCP clear the page cache ([ca923ba](https://github.com/cevi/conveniat-webpage/commit/ca923ba31a0cfa55148378171c6bc42f27b2a9f6))
* **mcp:** save every MCP write as a draft ([0d71948](https://github.com/cevi/conveniat-webpage/commit/0d71948ae7d4e7656b6ce5fad133cb28909bf771))
* **mcp:** save every MCP write as a draft ([e89ef39](https://github.com/cevi/conveniat-webpage/commit/e89ef394cf33da898e5c08cbbc08628319a6cf1f))
* **preview:** only editors can mint preview tokens ([2d1994a](https://github.com/cevi/conveniat-webpage/commit/2d1994a5d15309dc9423124fdd928e17a9437ad4))
* **preview:** only editors can mint preview tokens ([99f378a](https://github.com/cevi/conveniat-webpage/commit/99f378a7459f7facfea947566bd46d7fb2043a10))

## [1.13.0](https://github.com/cevi/conveniat-webpage/compare/v1.12.1...v1.13.0) (2026-09-24)


### Features

* **documents:** localized display name for downloads ([635454a](https://github.com/cevi/conveniat-webpage/commit/635454adb35152355a62dfcff16ac845678519c0))
* **documents:** localized display name for downloads ([eb32224](https://github.com/cevi/conveniat-webpage/commit/eb32224954c7c27bf2231e31cfca7ba79725284c)), closes [#250](https://github.com/cevi/conveniat-webpage/issues/250) [#219](https://github.com/cevi/conveniat-webpage/issues/219)
* **documents:** name saved files after the display name ([21621b9](https://github.com/cevi/conveniat-webpage/commit/21621b9e1770b9c5e664122d8f72b52c98c89ef9))


### Bug Fixes

* **deploy:** serve con27.ch association files without the /go prefix ([7950bbc](https://github.com/cevi/conveniat-webpage/commit/7950bbcba3c5f2ed143a98a80f7f14ae44d5052c))
* **deploy:** serve con27.ch association files without the /go prefix ([7adbbc5](https://github.com/cevi/conveniat-webpage/commit/7adbbc5ddd570dfdf3c7b32ec8cba5b7caaf0991)), closes [#1847](https://github.com/cevi/conveniat-webpage/issues/1847)

## [1.12.1](https://github.com/cevi/conveniat-webpage/compare/v1.12.0...v1.12.1) (2026-09-23)


### Bug Fixes

* add Conveniat27 native app to universal/app link verification files ([3763382](https://github.com/cevi/conveniat-webpage/commit/376338210a8a4455a53e3183bef861d57d230934))
* add Conveniat27 native app to universal/app link verification files ([2cc3b38](https://github.com/cevi/conveniat-webpage/commit/2cc3b38a06e46a5952ae272f4db0dd3d16926279)), closes [#1843](https://github.com/cevi/conveniat-webpage/issues/1843)

## [1.12.0](https://github.com/cevi/conveniat-webpage/compare/v1.11.3...v1.12.0) (2026-09-22)


### Features

* **observability:** attach the trace id to reported errors ([e2e5a1f](https://github.com/cevi/conveniat-webpage/commit/e2e5a1fe373ecc507967ff07f4f947f88a830182))
* **trpc:** trace every procedure and record its duration ([375e52d](https://github.com/cevi/conveniat-webpage/commit/375e52d5a2b95e40b8730eaff22557f9393c4413))
* **jobs:** trace every task run and record its duration ([4a75f18](https://github.com/cevi/conveniat-webpage/commit/4a75f18ba2c5087becafd538d4c675f4b8791d36))


### Bug Fixes

* **push:** detect the Conveniat27 native app user agent ([b714d88](https://github.com/cevi/conveniat-webpage/commit/b714d88abe12f873571743008abb10af0c12fcb3)), closes [#1838](https://github.com/cevi/conveniat-webpage/issues/1838)
* **billing:** refresh the name of a Hof renamed in Cevi.DB ([d865adc](https://github.com/cevi/conveniat-webpage/commit/d865adc1696c29df4d39d1df37d87cc8302bb010))
* **billing:** show the stored Hof names as text, not as entities ([655a5ec](https://github.com/cevi/conveniat-webpage/commit/655a5ec0da609e977c4ec0ee2612b2dafa23f0d3))
* **billing:** make the subevent walk readable in Loki ([01b2843](https://github.com/cevi/conveniat-webpage/commit/01b28431e081949f49a31e9026b3e64ddd8e9dac))
* **auth:** scanner probes are logged as debug instead of errors ([ec4ff44](https://github.com/cevi/conveniat-webpage/commit/ec4ff44eff1781978395b35e74d29bbfd63287ee))
* **observability:** job runner no longer logs under a dead request span ([c645ca7](https://github.com/cevi/conveniat-webpage/commit/c645ca7be7b9c82e9d9b40ef2a05aee17d26693b))
* **observability:** pass the startup error as a log attribute ([d33f695](https://github.com/cevi/conveniat-webpage/commit/d33f69565d2b7eeb57435d8691fa694438a410dd))

## [1.11.3](https://github.com/cevi/conveniat-webpage/compare/v1.11.2...v1.11.3) (2026-09-21)


### Bug Fixes

* correct Android FCM channel id to conveniat27-push ([f038a96](https://github.com/cevi/conveniat-webpage/commit/f038a96dec29d9e02a2d65cea2b0880f76f14b3b))
* correct Android FCM channel id to conveniat27-push ([817d7ff](https://github.com/cevi/conveniat-webpage/commit/817d7ffd5e76faf783147ff257de648c29bd8546))

## [1.11.2](https://github.com/cevi/conveniat-webpage/compare/v1.11.1...v1.11.2) (2026-09-20)


### Bug Fixes

* **go:** resolve a short link to the page's canonical address ([28e235d](https://github.com/cevi/conveniat-webpage/commit/28e235df9618c513246fe557ab58c70c25e31f18))
* **go:** resolve a short link to the page's canonical address ([56c36b0](https://github.com/cevi/conveniat-webpage/commit/56c36b0302f410b558e7c0886d2879f6217ef745))

## [1.11.1](https://github.com/cevi/conveniat-webpage/compare/v1.11.0...v1.11.1) (2026-09-20)


### Bug Fixes

* **go:** send short links off the host they arrived on ([7b168c0](https://github.com/cevi/conveniat-webpage/commit/7b168c01901739c2b7ccd575bb06f642d0b1e24d))
* **go:** send short links off the host they arrived on ([7351612](https://github.com/cevi/conveniat-webpage/commit/7351612ce12a27134b008d6c2def4389586b292c))

## [1.11.0](https://github.com/cevi/conveniat-webpage/compare/v1.10.0...v1.11.0) (2026-09-20)


### Features

* **billing:** download the weekly report on demand ([bddc516](https://github.com/cevi/conveniat-webpage/commit/bddc516a1d4828e759150d1f30e24f63ee638cfa))
* **billing:** download the weekly report on demand ([66ebbc2](https://github.com/cevi/conveniat-webpage/commit/66ebbc228b97befbb6ecc7c24a67785db0a43ee6))


### Bug Fixes

* **admin:** lend an add-on column a login when none is free ([ce34bf4](https://github.com/cevi/conveniat-webpage/commit/ce34bf4d79c73efee0b25857e8a9343efe7dfbde))
* **admin:** show what an add-on group grants in the access overview ([c526689](https://github.com/cevi/conveniat-webpage/commit/c52668970730d7e52d3bab454f0478f10276828e))
* **admin:** show what an add-on group grants in the access overview ([dfc12ab](https://github.com/cevi/conveniat-webpage/commit/dfc12abd6848b56f5bb9f5acd007be960df8c45a))
* **billing:** decode HTML entities in Hof names from Cevi.DB ([d0f61b7](https://github.com/cevi/conveniat-webpage/commit/d0f61b7dd5f022c6d095978925699565aef9ed1c))
* **billing:** decode HTML entities in Hof names from Cevi.DB ([97890cd](https://github.com/cevi/conveniat-webpage/commit/97890cdf1c710115ead21f68611451497756c3b6))
* **billing:** let an expired session through the restricted-person fallback ([68678ad](https://github.com/cevi/conveniat-webpage/commit/68678ad48e50c7d3e35e263f91356115834c3ab9))
* **billing:** report an expired Cevi.DB session instead of a missing question ([08791f9](https://github.com/cevi/conveniat-webpage/commit/08791f92a06560dbba8bf55749e0d25b8181b462))
* **billing:** report an expired Cevi.DB session instead of a missing question ([5a5ecb9](https://github.com/cevi/conveniat-webpage/commit/5a5ecb9dd5c35601d1381dcbb7a225a17db499ec))
* **billing:** stop the sync when the Cevi.DB session is gone ([6aa381a](https://github.com/cevi/conveniat-webpage/commit/6aa381ae65e67673635bc9cb9d05d878fd531244))
* **forms:** drop Finanzen and Relations from the Ressort wish ([41ee0c0](https://github.com/cevi/conveniat-webpage/commit/41ee0c0e5d55de167556248c69bc8cca4f50fe16))
* **forms:** drop Finanzen and Relations from the Ressort wish ([950688b](https://github.com/cevi/conveniat-webpage/commit/950688bdb94dee0d6a908aa98281a43198831412))
* **go:** answer a short link with an HTTP redirect ([a306c5c](https://github.com/cevi/conveniat-webpage/commit/a306c5c218a76865367da46a6ee22885e32c87da))
* **go:** answer a short link with an HTTP redirect ([163bce9](https://github.com/cevi/conveniat-webpage/commit/163bce9fc5f79a01a8ad4bd56b73f82dfd6123e7))
* **payload:** declare access on every collection and global ([1dbecc8](https://github.com/cevi/conveniat-webpage/commit/1dbecc8b8d14b9036824835ab12fc3bc12901156))
* **payload:** declare access on every collection and global ([bf763c6](https://github.com/cevi/conveniat-webpage/commit/bf763c6c8cd522be5d8669d3fb1a687b84a441a0))


### Performance

* **mail:** delete DMARC aggregate reports from the bounce mailbox ([36847e9](https://github.com/cevi/conveniat-webpage/commit/36847e9be89156d64cdb5cc38dbd2013d9c4d55e))
* **mail:** delete DMARC aggregate reports from the bounce mailbox ([0f941a2](https://github.com/cevi/conveniat-webpage/commit/0f941a2ce9a8cb682ace210df4b3e992aa114ca9))

## [1.10.0](https://github.com/cevi/conveniat-webpage/compare/v1.9.3...v1.10.0) (2026-09-20)


### Features

* **admin:** group the admin panel by website, app and back office ([fd0d4da](https://github.com/cevi/conveniat-webpage/commit/fd0d4dab1e771f5c2d31163aecb694f74daba23d))


### Bug Fixes

* **admin:** hide emergency cards and photo contests from editors without write access ([e8ec990](https://github.com/cevi/conveniat-webpage/commit/e8ec9903cfc2931d130a68c09a5a74f0f15cfce7))
* **admin:** only admins and the web core team see the cache actions ([660e0bd](https://github.com/cevi/conveniat-webpage/commit/660e0bdcf8560f26bf95e9ce863f8a7eb3d598b1))

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
