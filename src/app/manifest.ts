import { cachedManifestGenerator } from '@/utils/generate-manifest';
import { isBuildTimePreRendering } from '@/utils/is-pre-rendering';
import type { MetadataRoute } from 'next';

const manifestGenerator = async (): Promise<MetadataRoute.Manifest> => {
  if (await isBuildTimePreRendering()) return {}; // bail out, don't cache anything at build time
  return cachedManifestGenerator();
};

export default manifestGenerator;
