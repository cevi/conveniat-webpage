export interface HitobitoNextAuthUser {
  cevi_db_uuid: number;
  groups: { id: number; name: string; role_class: string; role_name: string }[];
  email: string;
  name: string;
  nickname: string;
}
