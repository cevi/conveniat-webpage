import { faker } from '@faker-js/faker';
import {
  booleanPointInPolygon,
  bbox as turfBbox,
  point as turfPoint,
  polygon as turfPolygon,
} from '@turf/turf';
import type { RequiredDataFromCollectionSlug } from 'payload';

// Define the perimeter polygon for generating random points and polygons within it
const polygonPerimeter = turfPolygon([
  [
    [8.291_435, 46.501_16],
    [8.303_041, 46.506_344],
    [8.307_581, 46.503_883],
    [8.296_492, 46.498_243],
    [8.291_435, 46.501_16], // Close the polygon
  ],
]);

/**
 * Generates a random point that falls within the specified Turf.js polygon.
 * It repeatedly generates points within the polygon's bounding box until a point
 * is found that is actually inside the polygon.
 * @param polygon The Turf.js polygon within which to generate a point.
 * @returns An array [longitude, latitude] representing the random point.
 */
const generateRandomPointInPolygon = (
  polygon: ReturnType<typeof turfPolygon>,
): [number, number] => {
  const bbox = turfBbox(polygon);
  const [minLng, minLat, maxLng, maxLat] = bbox;

  let randomLng: number;
  let randomLat: number;
  let point: ReturnType<typeof turfPoint> | undefined = undefined;
  let isInside: boolean = false;

  // Keep generating random points within the bounding box until one falls inside the polygon
  while (!isInside || point === undefined) {
    randomLng = faker.location.longitude({ min: minLng, max: maxLng, precision: 7 });
    randomLat = faker.location.latitude({ min: minLat, max: maxLat, precision: 7 });
    point = turfPoint([randomLng, randomLat]);
    isInside = booleanPointInPolygon(point, polygon);
  }

  return point.geometry.coordinates as [number, number];
};

/**
 * Generates coordinates for a nearly rectangular polygon within a given bounding box.
 *
 * @param bbox - An array defining the bounding box: [minLng, minLat, maxLng, maxLat].
 * @returns An array of { latitude: number; longitude: number } points forming the polygon.
 */
const generateRandomPolygonCoordinates = (
  bbox: [number, number, number, number],
): Array<{ latitude: number; longitude: number }> => {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  // 1. Define the dimensions of a slightly smaller inner box to ensure
  //    the generated rectangle and its jitter stay within the bbox.
  const maxRectWidth = (maxLng - minLng) * 0.5;
  const maxRectHeight = (maxLat - minLat) * 0.5;
  const initialRectWidth = faker.number.float({ min: maxRectWidth * 0.5, max: maxRectWidth });
  const initialRectHeight = faker.number.float({ min: maxRectHeight * 0.5, max: maxRectHeight });

  // 2. Determine a valid starting point for the rectangle.
  const startLng = faker.number.float({ min: minLng, max: maxLng - initialRectWidth });
  const startLat = faker.number.float({ min: minLat, max: maxLat - initialRectHeight });

  // 3. Define the four corners of the perfect rectangle.
  const corners = [
    { longitude: startLng, latitude: startLat }, // Bottom-left
    { longitude: startLng + initialRectWidth, latitude: startLat }, // Bottom-right
    { longitude: startLng + initialRectWidth, latitude: startLat + initialRectHeight }, // Top-right
    { longitude: startLng, latitude: startLat + initialRectHeight }, // Top-left
  ];

  // 4. Introduce "jitter" to each corner to make it less perfect.
  const jitterAmount = Math.min(initialRectWidth, initialRectHeight) * 0.1; // Jitter up to 10% of the smaller side

  const jaggedCorners = corners.map((corner) => {
    const lngJitter = faker.number.float({ min: -jitterAmount / 2, max: jitterAmount / 2 });
    const latJitter = faker.number.float({ min: -jitterAmount / 2, max: jitterAmount / 2 });

    return {
      longitude: corner.longitude + lngJitter,
      latitude: corner.latitude + latJitter,
    };
  });

  // 5. Close the polygon by adding the first point to the end.
  jaggedCorners.push({ ...(jaggedCorners[0] as { longitude: number; latitude: number }) });

  return jaggedCorners;
};
const iconMarkerSelectOptions = ['MapPin' as const, 'Tent' as const];
const annotationTypeOptions = ['marker' as const, 'polygon' as const];

/**
 * Creates a single random camp annotation, which can be either a 'marker' or a 'polygon'.
 * The data is generated using Faker.js for realistic-looking mock data.
 * @returns A RequiredDataFromCollectionSlug<'camp-map-annotations'> object.
 */
export const createRandomCampAnnotation =
  (): RequiredDataFromCollectionSlug<'camp-map-annotations'> => {
    const randomAnnotationType = faker.helpers.arrayElement(annotationTypeOptions);
    const bbox = turfBbox(polygonPerimeter); // Use the existing polygon's bounding box for random generation

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

    if (randomAnnotationType === 'marker') {
      const randomCoordinates = generateRandomPointInPolygon(polygonPerimeter);
      return {
        ...baseAnnotation,
        annotationType: 'marker',
        icon: faker.helpers.arrayElement(iconMarkerSelectOptions),
        geometry: { coordinates: randomCoordinates },
      };
    } else {
      const randomPolygonCoords = generateRandomPolygonCoordinates([
        bbox[0],
        bbox[1],
        bbox[2],
        bbox[3],
      ]);
      return {
        ...baseAnnotation,
        annotationType: 'polygon',
        polygonCoordinates: randomPolygonCoords,
      };
    }
  };
