export interface HitobitoNextAuthUser {
  uuid: string;
  group_ids: number[];
  email: string;
  name: string;
  nickname: string;
  hof?: number | undefined;
  quartier?: number | undefined;
}
