import { CacheEntry, InternalCacheHandler } from '../types.cjs';

export abstract class BaseCacheHandler implements InternalCacheHandler {
  abstract name: string;
  abstract get(key: string): Promise<{ value: Buffer; metadata?: Partial<CacheEntry> } | undefined>;
  abstract set(key: string, value: Buffer, metadata: CacheEntry): Promise<void>;
  abstract invalidateTags(tags: string[]): Promise<void>;

  /**
   * Standardizes the serialization of metadata + content into a single Buffer.
   * Format: [4 bytes Length][Metadata JSON][Value Buffer]
   */
  protected serialize(value: Buffer, metadata: CacheEntry): Buffer {
    const metadataJson = JSON.stringify(metadata);
    const metadataBuffer = Buffer.from(metadataJson, 'utf8');

    const totalLength = 4 + metadataBuffer.length + value.length;
    const finalBuffer = Buffer.allocUnsafe(totalLength);

    finalBuffer.writeUInt32BE(metadataBuffer.length, 0);
    metadataBuffer.copy(finalBuffer, 4);
    value.copy(finalBuffer, 4 + metadataBuffer.length);

    return finalBuffer;
  }

  /**
   * Standardizes the deserialization of the buffer back into components.
   */
  protected deserialize(rawData: Buffer): { value: Buffer; metadata: CacheEntry } | undefined {
    if (rawData.length < 4) return undefined;

    try {
      const metaLength = rawData.readUInt32BE(0);
      const metaString = rawData.toString('utf8', 4, 4 + metaLength);

      const metadata = JSON.parse(metaString) as CacheEntry;

      // Basic validation
      if (!metadata || typeof metadata !== 'object') {
        console.error(`[${this.name}] Invalid metadata format`);
        return undefined;
      }

      const value = rawData.subarray(4 + metaLength);

      return { value, metadata };
    } catch (error) {
      console.error(`[${this.name}] Deserialization failed`, error);
      return undefined;
    }
  }
}
