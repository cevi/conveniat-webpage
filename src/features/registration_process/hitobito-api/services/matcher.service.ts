import {
  EXTERNAL_ROLE_TYPE,
  HITOBITO_CONFIG,
} from '@/features/registration_process/hitobito-api/config';
import type { Hitobito } from '@/features/registration_process/hitobito-api/index';
import type { Logger, PersonAttributes } from '@/features/registration_process/hitobito-api/types';
import { verifyUserData } from '@/features/registration_process/hitobito-api/utils';

export interface MatchCandidateParameters {
  candidate: { id: string; label: string };
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    nickname?: string | undefined;
    birthDate?: string | undefined;
  };
}

export interface MatchCandidateResult {
  matched: boolean;
  needsReview: boolean;
  personId: string;
  personLabel: string;
  reason?: string;
  mismatches?: string[];
  addedToSupportGroup?: boolean;
  details?: PersonAttributes;
}

function doesLabelMatch(
  label: string,
  userData: { firstName: string; lastName: string; email: string },
): boolean {
  const labelLower = label.toLowerCase();
  const firstNameMatch = labelLower.includes(userData.firstName.toLowerCase());
  const lastNameMatch = labelLower.includes(userData.lastName.toLowerCase());

  if (!firstNameMatch || !lastNameMatch) return false;

  const emailInLabel = label.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
  if (
    emailInLabel !== undefined &&
    emailInLabel !== '' &&
    userData.email !== '' &&
    emailInLabel.toLowerCase() !== userData.email.toLowerCase()
  ) {
    return false;
  }
  return true;
}

export class MatcherService {
  constructor(
    private readonly hitobito: Hitobito,
    private readonly logger?: Logger,
  ) {}

  async matchCandidate({
    candidate,
    userData,
  }: MatchCandidateParameters): Promise<MatchCandidateResult> {
    this.logger?.info(`Matching candidate ${candidate.id} (${candidate.label})`);

    // 1. Label Check
    if (!doesLabelMatch(candidate.label, userData)) {
      return {
        matched: false,
        needsReview: false,
        personId: candidate.id,
        personLabel: candidate.label,
        reason: 'label_mismatch',
      };
    }

    // 2. Details Check
    let detailsResult = await this.hitobito.people.getDetails({ personId: candidate.id });
    let addedToSupportGroup = false;

    // 403 Handler (Support Group Workaround)
    if (detailsResult.error === 'forbidden') {
      this.logger?.info(`403 Forbidden for ${candidate.id}, attempting support group workaround`);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const endOnString = `${futureDate.getFullYear()}-${(futureDate.getMonth() + 1).toString().padStart(2, '0')}-${futureDate.getDate().toString().padStart(2, '0')}`;

      const added = await this.hitobito.groups.addPerson({
        personId: candidate.id,
        groupId: HITOBITO_CONFIG.supportGroupId,
        roleType: EXTERNAL_ROLE_TYPE,
        options: { endOn: endOnString },
      });
      addedToSupportGroup = added;

      if (added) {
        // Poll and Retry instead of fixed sleep
        let attempts = 0;
        const maxAttempts = 5;
        const delay = 500;

        while (attempts < maxAttempts) {
          attempts++;
          this.logger?.info(`Polling for propagation (attempt ${attempts}/${maxAttempts})...`);
          await new Promise((resolve) => setTimeout(resolve, delay));

          detailsResult = await this.hitobito.people.getDetails({ personId: candidate.id });
          if (detailsResult.success) {
            this.logger?.info(`Propagation successful after ${attempts} attempts`);
            break;
          }
          if (detailsResult.error !== 'forbidden') {
            break; // Stop if it's some other error
          }
        }
      }
    }

    if (!detailsResult.success || !detailsResult.attributes) {
      return {
        matched: true,
        needsReview: true,
        personId: candidate.id,
        personLabel: candidate.label,
        reason: 'no_api_details',
        addedToSupportGroup,
      };
    }

    // 3. Verify Data
    const verification = verifyUserData(userData, detailsResult.attributes);

    if (verification.verified) {
      if (addedToSupportGroup) {
        // Cleanup support group
        const roles = await this.hitobito.groups.getPersonRoles({
          personId: candidate.id,
          groupId: HITOBITO_CONFIG.supportGroupId,
        });
        for (const role of roles) {
          await this.hitobito.groups.removeRole({ roleId: String(role.id) });
        }
      }
      return {
        matched: true,
        needsReview: false,
        personId: candidate.id,
        personLabel: candidate.label,
        details: detailsResult.attributes,
      };
    }

    // Mismatch logic
    const { matchDetails } = verification;
    if (matchDetails.nameMatch && matchDetails.birthdayMatch && matchDetails.nicknameMatch) {
      return {
        matched: true,
        needsReview: true,
        personId: candidate.id,
        personLabel: candidate.label,
        reason: 'data_mismatch',
        mismatches: verification.mismatches,
        addedToSupportGroup,
        details: detailsResult.attributes,
      };
    }

    // Not a match
    if (addedToSupportGroup) {
      const roles = await this.hitobito.groups.getPersonRoles({
        personId: candidate.id,
        groupId: HITOBITO_CONFIG.supportGroupId,
      });
      for (const role of roles) {
        await this.hitobito.groups.removeRole({ roleId: String(role.id) });
      }
    }

    return {
      matched: false,
      needsReview: false,
      personId: candidate.id,
      personLabel: candidate.label,
      reason: 'significant_mismatch',
      mismatches: verification.mismatches,
      details: detailsResult.attributes,
    };
  }
}
