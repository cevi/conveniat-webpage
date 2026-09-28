# Changelog

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
