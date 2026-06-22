export interface StoragePort {
  fetchPdf(filename: string): Promise<Buffer>;
}
