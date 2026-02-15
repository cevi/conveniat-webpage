export interface HitobitoProfile {
  id: number;
  payloadUuid: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  roles: {
    group_id: number;
    group_name: string;
    role_name: string;
    role_class: string;
  }[];
}
