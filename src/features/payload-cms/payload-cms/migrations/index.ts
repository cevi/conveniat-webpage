import * as migration_20261031_090000_clear_payload_jobs_preferences from './20261031_090000_clear_payload_jobs_preferences';
import * as migration_20261031_090100_migrate_legacy_hoefe from './20261031_090100_migrate_legacy_hoefe';
import * as migration_20261031_090200_localize_form_placeholders from './20261031_090200_localize_form_placeholders';
import * as migration_20261031_090300_group_file_download_files from './20261031_090300_group_file_download_files';
import * as migration_20261031_090400_backfill_bill_payments from './20261031_090400_backfill_bill_payments';
import * as migration_20261102_090000_localize_form_version_placeholders from './20261102_090000_localize_form_version_placeholders';
import * as migration_20261103_090000_announcement_channel_internal_name from './20261103_090000_announcement_channel_internal_name';
import * as migration_20261103_120000_bill_payments_point_to_bills from './20261103_120000_bill_payments_point_to_bills';

export const migrations = [
  {
    up: migration_20261031_090000_clear_payload_jobs_preferences.up,
    down: migration_20261031_090000_clear_payload_jobs_preferences.down,
    name: '20261031_090000_clear_payload_jobs_preferences',
  },
  {
    up: migration_20261031_090100_migrate_legacy_hoefe.up,
    down: migration_20261031_090100_migrate_legacy_hoefe.down,
    name: '20261031_090100_migrate_legacy_hoefe',
  },
  {
    up: migration_20261031_090200_localize_form_placeholders.up,
    down: migration_20261031_090200_localize_form_placeholders.down,
    name: '20261031_090200_localize_form_placeholders',
  },
  {
    up: migration_20261031_090300_group_file_download_files.up,
    down: migration_20261031_090300_group_file_download_files.down,
    name: '20261031_090300_group_file_download_files',
  },
  {
    up: migration_20261031_090400_backfill_bill_payments.up,
    down: migration_20261031_090400_backfill_bill_payments.down,
    name: '20261031_090400_backfill_bill_payments',
  },
  {
    up: migration_20261102_090000_localize_form_version_placeholders.up,
    down: migration_20261102_090000_localize_form_version_placeholders.down,
    name: '20261102_090000_localize_form_version_placeholders',
  },
  {
    up: migration_20261103_090000_announcement_channel_internal_name.up,
    down: migration_20261103_090000_announcement_channel_internal_name.down,
    name: '20261103_090000_announcement_channel_internal_name',
  },
  {
    up: migration_20261103_120000_bill_payments_point_to_bills.up,
    down: migration_20261103_120000_bill_payments_point_to_bills.down,
    name: '20261103_120000_bill_payments_point_to_bills',
  },
];
