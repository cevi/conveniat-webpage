import { faker } from '@faker-js/faker';
import type { RequiredDataFromCollectionSlug } from 'payload';

const ceviAbteilungName = [
  'Cevi Aatal',
  'Cevi Aarburg',
  'Cevi Affeltrangen-Braunau-Märwil',
  'Cevi Altstetten-Albisrieden',
  'Cevi Amriswil',
  'Cevi Andelfingen',
  'Cevi Baar Ten Sing',
  'Cevi Basel-Stadt',
  'Cevi Bonstetten-Hedingen',
  'Cevi Bremgarten',
  'Cevi Brittnau',
  'Cevi Bubikon-Wolfhausen',
  'Cevi Buchs-Rohr Aarau',
  'Cevi Bülach',
  'Cevi Bussnang',
  'Cevi Dägerlen',
  'Cevi Davos',
  'Cevi Derendingen',
  'Cevi Dinhard',
  'Cevi Dübendorf',
  'Cevi Dürnten',
  'Cevi Effretikon',
  'Cevi Egg',
  'Cevi Entfelden',
  'Cevi Erlinsbach',
  'Cevi Fislisbach',
  'Cevi Fislisbach-Mellingen-Rohrdorf',
  'Cevi Flaachtal',
  'Cevi Frauenfeld',
  'Cevi Fraubrunnen',
  'Cevi Gebenstorf',
  'Cevi Gossau',
  'Cevi Gotthelf-Neubad',
  'Cevi Gränichen',
  'Cevi Gretzenbach',
  'Cevi Herblingen',
  'Cevi Herisau',
  'Cevi Herrliberg Erlenbach',
  'Cevi Hettlingen-Henggart',
  'Cevi Hilterfingen Sigriswil',
  'Cevi Hinterthurgau',
  'Cevi Hirzel-Schönenberg-Hütten',
  'Cevi Horw',
  'Cevi Illnau',
  'Cevi Kerzers',
  'Cevi Klingnau - Döttingen - Kleindöttingen',
  'Cevi Konolfingen',
  'Cevi Männedorf-Uetikon-Oetwil',
  'Cevi Mönchaltorf',
  'Cevi Möriken',
  'Cevi Mörschwil',
  'Cevi Murgenthal',
  'Cevi Niederhasli-Niederglatt',
  'Cevi Nussbaumen',
  'Cevi Oberrieden-Horgen',
  'Cevi Obertoggenburg',
  'Cevi Oberwinterthur',
  'Cevi Oftringen-Rothrist',
  'Cevi Olten',
  'Cevi Pfäffikon-Fehraltorf-Hittnau-Russikon',
  'Cevi Rapperswil-Jona',
  'Cevi Reinach AG',
  'Cevi Rheinfelden',
  'Cevi Rorschach',
  'Cevi Rüti',
  'Cevi Samedan-Oberengadin',
  'Cevi Schaffhausen-Breite',
  'Cevi Scharans',
  'Cevi Schlatt',
  'Cevi Schönenwerd-Niedergösgen',
  'Cevi Schwamendingen',
  'Cevi Seen',
  'Cevi Seengen',
  'Cevi Seuzach',
  'Cevi Stäfa-Hombrechtikon',
  'Cevi Staufen',
  'Cevi Steffisburg',
  'Cevi Stettfurt',
  'Cevi Stammertal',
  'Cevi Strengelbach',
  'Cevi Suhr-Hunzenschwil',
  'Cevi Teufen AR',
  'Cevi Thalwil-Gattikon-Langnau',
  'Cevi Titus',
  'Cevi Töss',
  'Cevi Trimbach',
  'Cevi Urdorf',
  'Cevi Uster',
  'Cevi Veltheim',
  'Cevi Volketswil-Schwerzenbach',
  'Cevi Wädenswil',
  'Cevi Wädenswil-Au',
  'Cevi Weinfelden',
  'Cevi Weiningen-Geroldswil',
  'Cevi Werdenberg',
  'Cevi Wetzikon',
  'Cevi Wiesendangen-Elsau-Hegi',
  'Cevi Wil',
  'Cevi Windisch',
  'Cevi Wülflingen',
];

const pois: [number, number][] = [
  [8.297_876_500_673_118, 46.500_531_597_975_8],
  [8.297_645_567_061_222, 46.500_421_921_620_074],
  [8.297_900_448_100_417, 46.500_307_306_792_415],
  [8.300_621_517_560_138, 46.499_014_481_248_004],
  [8.304_413_909_752_574, 46.501_130_985_034_955],
  [8.301_382_782_517_871, 46.501_758_352_341_87],
  [8.300_655_824_579_778, 46.501_446_601_201_6],
  [8.300_000_222_311_365, 46.501_218_909_226_32],
  [8.300_809_491_171_943, 46.500_378_814_276_32],
  [8.300_244_961_683_939, 46.500_099_065_859_956],
  [8.302_938_582_516_98, 46.498_891_128_303_9],
  [8.304_222_138_644_83, 46.503_417_214_606_29],
  [8.304_218_486_370_996, 46.504_284_439_136_39],
  [8.304_765_240_229_97, 46.504_543_152_555_39],
  [8.305_347_341_297_207, 46.504_822_744_996_24],
  [8.296_318_108_711_311, 46.501_960_295_441_84],
  [8.297_279_476_033_154, 46.501_049_581_786_77],
  [8.301_329_399_879_997, 46.503_124_962_058_266],
  [8.299_203_495_465_653, 46.500_849_853_019_8],
  [8.294_072_222_232_206, 46.498_720_511_445_725],
  [8.293_571_338_902_69, 46.498_866_294_983_316],
];

const playGroundPolygons: [number, number][][] = [
  [
    [8.302_765_111_928_684, 46.505_298_667_112_7],
    [8.303_798_088_497_949, 46.504_339_295_061_065],
    [8.302_996_673_704_474, 46.503_925_706_609_89],
    [8.301_914_048_528_18, 46.504_858_262_315_58],
  ],
  [
    [8.306_467_484_606_118, 46.505_752_950_484_37],
    [8.307_722_404_705_35, 46.506_460_129_563_8],
    [8.308_621_517_107_401, 46.506_009_365_083_86],
    [8.307_240_750_470_573, 46.505_012_084_688_836],
  ],
  [
    [8.307_599_394_727_227, 46.506_675_736_354_02],
    [8.307_897_559_755_151, 46.506_538_835_286_406],
    [8.308_749_019_263_438, 46.506_073_880_560_57],
    [8.309_766_468_775_878, 46.506_757_386_000_004],
    [8.308_895_216_986_018, 46.507_302_544_946_46],
  ],
  [
    [8.304_201_037_396_886, 46.504_065_529_555_9],
    [8.306_559_053_407_613, 46.505_219_116_944_73],
    [8.306_716_939_727_742, 46.505_206_996_003_79],
    [8.307_230_961_072_483, 46.504_730_075_516_93],
    [8.307_192_098_044_554, 46.504_606_666_469_506],
    [8.304_803_239_893_117, 46.503_500_626_689_046],
  ],
  [
    [8.304_171_286_881_312, 46.503_192_537_445_02],
    [8.303_611_113_608_07, 46.503_749_840_283_29],
    [8.302_240_403_117_839, 46.503_043_496_431_61],
    [8.302_722_426_622_854, 46.502_541_370_705_21],
  ],
  [
    [8.302_664_241_702_326, 46.502_527_259_395_01],
    [8.302_208_212_438_599, 46.503_007_356_913_61],
    [8.301_097_949_768_296, 46.502_440_918_348_71],
    [8.301_501_937_324_577, 46.502_001_242_926_91],
  ],
];

const campSides: [number, number][][] = [
  [
    [8.301_851_433_876_22, 46.504_805_553_864_48],
    [8.302_402_883_913_107, 46.504_335_008_163_46],
    [8.301_968_240_200_127, 46.504_097_091_522_915],
    [8.301_358_444_161_881, 46.504_560_037_349_144],
  ],
  [
    [8.301_958_576_956_979, 46.504_104_427_764_94],
    [8.301_358_444_161_881, 46.504_560_037_349_144],
    [8.300_871_088_687_186, 46.504_302_415_045_57],
    [8.301_428_043_716_244, 46.503_811_730_767_34],
  ],
  [
    [8.301_968_240_200_127, 46.504_097_091_522_915],
    [8.302_402_883_913_107, 46.504_335_008_163_46],
    [8.302_990_279_720_671, 46.503_928_511_383_63],
    [8.302_491_022_720_773, 46.503_654_905_260_09],
  ],
  [
    [8.301_968_240_200_127, 46.504_097_091_522_915],
    [8.302_491_022_720_773, 46.503_654_905_260_09],
    [8.301_951_084_037_373, 46.503_385_626_296_4],
    [8.301_428_043_716_244, 46.503_811_730_767_34],
  ],
  [
    [8.301_428_043_716_244, 46.503_811_730_767_34],
    [8.300_871_088_687_186, 46.504_302_415_045_57],
    [8.300_325_074_330_843, 46.504_017_093_207_34],
    [8.300_813_068_043_855, 46.503_583_219_126_03],
  ],
  [
    [8.300_813_068_043_855, 46.503_583_219_126_03],
    [8.301_428_043_716_244, 46.503_811_730_767_34],
    [8.301_951_084_037_373, 46.503_385_626_296_4],
    [8.301_358_181_208_963, 46.503_080_564_009_31],
  ],
  [
    [8.300_813_068_043_855, 46.503_583_219_126_03],
    [8.300_207_951_248_957, 46.503_242_060_700_5],
    [8.299_556_377_028_681, 46.503_640_988_500_51],
    [8.300_325_074_330_843, 46.504_017_093_207_34],
  ],
  [
    [8.300_813_068_043_855, 46.503_583_219_126_03],
    [8.301_358_181_208_963, 46.503_080_564_009_31],
    [8.300_741_743_384_5, 46.502_759_595_934_8],
    [8.300_207_951_248_957, 46.503_242_060_700_5],
  ],
  [
    [8.300_207_951_248_957, 46.503_242_060_700_5],
    [8.299_556_377_028_681, 46.503_640_988_500_51],
    [8.298_875_715_211_123, 46.503_308_435_841_19],
    [8.299_387_574_699_375, 46.502_910_570_095_27],
  ],
  [
    [8.299_387_574_699_375, 46.502_910_570_095_27],
    [8.300_049_186_916_173, 46.502_411_059_295_93],
    [8.300_741_743_384_5, 46.502_759_595_934_8],
    [8.300_207_951_248_957, 46.503_242_060_700_5],
  ],
  [
    [8.299_387_574_699_375, 46.502_910_570_095_27],
    [8.298_900_291_733_02, 46.502_576_986_972_76],
    [8.298_310_186_356_606, 46.503_013_533_152_81],
    [8.298_875_715_211_123, 46.503_308_435_841_19],
  ],
  [
    [8.298_900_291_733_02, 46.502_576_986_972_76],
    [8.299_387_574_699_375, 46.502_910_570_095_27],
    [8.300_049_186_916_173, 46.502_411_059_295_93],
    [8.299_426_429_874_321, 46.502_089_389_468_814],
  ],
  [
    [8.298_900_291_733_02, 46.502_576_986_972_76],
    [8.298_310_186_356_606, 46.503_013_533_152_81],
    [8.297_737_273_677_635, 46.502_724_525_322_4],
    [8.298_218_321_381_402, 46.502_288_806_958_62],
  ],
  [
    [8.298_900_291_733_02, 46.502_576_986_972_76],
    [8.299_426_429_874_321, 46.502_089_389_468_814],
    [8.298_783_761_494_592, 46.501_745_418_517_324],
    [8.298_218_321_381_402, 46.502_288_806_958_62],
  ],
  [
    [8.298_218_321_381_402, 46.502_288_806_958_62],
    [8.297_737_273_677_635, 46.502_724_525_322_4],
    [8.297_152_761_597_644, 46.502_427_674_162_82],
    [8.297_576_223_673_609, 46.501_980_501_338_97],
  ],
  [
    [8.297_576_223_673_609, 46.501_980_501_338_97],
    [8.298_218_321_381_402, 46.502_288_806_958_62],
    [8.298_783_761_494_592, 46.501_745_418_517_324],
    [8.298_118_518_980_273, 46.501_425_398_989_7],
  ],
  [
    [8.297_576_223_673_609, 46.501_980_501_338_97],
    [8.296_776_520_344_883, 46.501_506_892_166_17],
    [8.296_249_987_675_443, 46.501_970_695_952_004],
    [8.297_152_761_597_644, 46.502_427_674_162_82],
  ],
  [
    [8.296_776_520_344_883, 46.501_506_892_166_17],
    [8.297_239_466_386_795, 46.501_015_817_893_06],
    [8.298_118_518_980_273, 46.501_425_398_989_7],
    [8.297_576_223_673_609, 46.501_980_501_338_97],
    [8.298_118_518_980_273, 46.501_425_398_989_7],
    [8.297_576_223_673_609, 46.501_980_501_338_97],
  ],
  [
    [8.296_210_893_642_531, 46.501_909_986_350_235],
    [8.295_758_976_048_75, 46.501_566_545_128_96],
    [8.295_404_488_457_358, 46.501_384_231_128],
    [8.295_712_235_081_68, 46.501_081_307_440_984],
    [8.296_645_523_279_746, 46.501_513_609_323_64],
  ],
  [
    [8.295_712_235_081_68, 46.501_081_307_440_984],
    [8.296_014_154_130_368, 46.500_763_011_289_3],
    [8.296_941_980_971_363, 46.501_203_059_696_64],
    [8.296_645_523_279_746, 46.501_513_609_323_64],
  ],
  [
    [8.296_014_154_130_368, 46.500_763_011_289_3],
    [8.296_941_980_971_363, 46.501_203_059_696_64],
    [8.297_183_853_096_897, 46.500_969_999_432_31],
    [8.296_317_106_307_562, 46.500_510_222_648_26],
  ],
  [
    [8.295_864_851_903_675, 46.500_920_412_738_715],
    [8.295_023_398_085_755, 46.500_577_786_327_37],
    [8.295_478_823_616_374, 46.500_084_909_777_01],
    [8.296_317_106_307_562, 46.500_510_222_648_26],
    [8.296_014_154_130_368, 46.500_763_011_289_3],
  ],
  [
    [8.295_023_398_085_755, 46.500_577_786_327_37],
    [8.294_617_213_400_658, 46.501_008_627_910_22],
    [8.295_404_488_457_358, 46.501_384_231_128],
    [8.295_740_169_478_531, 46.501_051_857_979_66],
    [8.295_864_851_903_675, 46.500_920_412_738_715],
  ],
  [
    [8.295_023_398_085_755, 46.500_577_786_327_37],
    [8.293_758_838_322_933, 46.500_016_931_987_29],
    [8.293_489_126_778_12, 46.500_608_605_967_514],
    [8.294_617_213_400_658, 46.501_008_627_910_22],
  ],
  [
    [8.293_758_838_322_933, 46.500_016_931_987_29],
    [8.294_073_063_565_609, 46.499_417_214_497_19],
    [8.295_478_823_616_374, 46.500_084_909_777_01],
    [8.295_023_398_085_755, 46.500_577_786_327_37],
  ],
];

// Helper function to join names with 'and' before the last one
const joinWithAnd = (names: string[]): string => {
  if (names.length === 0) {
    return '';
  }
  if (names.length === 1) {
    return names[0] ?? '';
  }
  const last = names.at(-1);
  const others = names.slice(0, -1);
  return `${others.join(', ')} and ${last}`;
};

const iconMarkerSelectOptions = [
  'MapPin' as const,
  'Tent' as const,
  'Utensils' as const,
  'Flag' as const,
  'HelpCircle' as const,
  'Recycle' as const,
  'GlassWater' as const,
  'Toilet' as const,
  'Stage' as const,
  'BriefcaseMedical' as const,
];

const getRandomTime = (): string => {
  const hours = faker.number.int({ min: 0, max: 23 });
  const minutes = faker.number.int({ min: 0, max: 59 });
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Creates a single random camp annotation, which can be either a 'marker' or a 'polygon'.
 * The data is generated using Faker.js for realistic-looking mock data.
 * @returns A RequiredDataFromCollectionSlug<'camp-map-annotations'> object.
 */
export const createRandomCampAnnotation = (
  imageIds: string[],
): RequiredDataFromCollectionSlug<'camp-map-annotations'> => {
  // Base annotation structure
  const baseAnnotation = {
    title: faker.lorem.words({ min: 2, max: 4 }),
    description: {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                detail: 0,
                format: 'left' as const,
                mode: 'normal' as const,
                style: '',
                text: faker.lorem.paragraph(),
                version: 1,
              },
            ],
            direction: 'ltr' as const,
            format: 'left' as const,
            indent: 0,
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        format: 'left' as const,
        indent: 0,
        version: 1,
      },
    },
  };

  const randomCoordinates = faker.helpers.arrayElement(pois);
  const randomDayOrUndefined = faker.helpers.arrayElement([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    undefined,
  ]);

  return {
    ...baseAnnotation,
    annotationType: 'marker',
    icon: faker.helpers.arrayElement(iconMarkerSelectOptions),
    color: faker.helpers.arrayElement([
      '#78909c',
      '#fbc02d',
      '#ff8126',
      '#f64955',
      '#f848c7',
      '#b56aff',
      '#16a672',
    ]),
    geometry: { coordinates: randomCoordinates },
    openingHours: [
      {
        ...(randomDayOrUndefined === undefined ? {} : { day: randomDayOrUndefined }),
        time: `${getRandomTime()} - ${getRandomTime()}`,
      },
    ],
    images: imageIds.length > 0 ? faker.helpers.arrayElements(imageIds, { min: 1, max: 3 }) : [],
  };
};

export const generateCampSites = (): RequiredDataFromCollectionSlug<'camp-map-annotations'>[] => {
  return campSides.map((coordinates, index) => {
    const selectedAbteilungen = faker.helpers.arrayElements(ceviAbteilungName, { min: 3, max: 5 });
    const abteilungenText = joinWithAnd(selectedAbteilungen);
    return {
      title: `Quartier ${index + 1}`,
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 'left' as const,
                  mode: 'normal' as const,
                  style: '',
                  text: `Quartier der Abteilungen ${abteilungenText}.`,
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              format: 'left' as const,
              indent: 0,
              version: 1,
            },
          ],
          direction: 'ltr' as const,
          format: 'left' as const,
          indent: 0,
          version: 1,
        },
      },
      annotationType: 'polygon',
      icon: faker.helpers.arrayElement(iconMarkerSelectOptions),
      color: faker.helpers.arrayElement(['#f848c7', '#b56aff']),
      polygonCoordinates: coordinates.map((coordinate) => ({
        longitude: coordinate[0],
        latitude: coordinate[1],
      })),
    };
  });
};

export const generatePlaygroundPolygons =
  (): RequiredDataFromCollectionSlug<'camp-map-annotations'>[] => {
    return playGroundPolygons.map((coordinates, index) => {
      return {
        title: `Playground Area ${index + 1}`,
        description: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    detail: 0,
                    format: 'left' as const,
                    mode: 'normal' as const,
                    style: '',
                    text: faker.lorem.paragraph(),
                    version: 1,
                  },
                ],
                direction: 'ltr' as const,
                format: 'left' as const,
                indent: 0,
                version: 1,
              },
            ],
            direction: 'ltr' as const,
            format: 'left' as const,
            indent: 0,
            version: 1,
          },
        },
        annotationType: 'polygon',
        icon: faker.helpers.arrayElement(iconMarkerSelectOptions),
        color: '#16a672',
        polygonCoordinates: coordinates.map((coordinate) => ({
          longitude: coordinate[0],
          latitude: coordinate[1],
        })),
      };
    });
  };
