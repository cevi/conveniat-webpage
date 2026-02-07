import type { Logger } from '@/features/registration_process/hitobito-api/client';
import {
  EXTERNAL_ROLE_TYPE,
  HITOBITO_CONFIG,
} from '@/features/registration_process/hitobito-api/config';
import {
  addPersonToGroup,
  removeGroupRole,
} from '@/features/registration_process/hitobito-api/groups';
import type { PersonAttributes } from '@/features/registration_process/hitobito-api/schemas';
import {
  getPersonDetails,
  verifyUserData,
} from '@/features/registration_process/hitobito-api/user-details';
import type { SearchResult } from '@/features/registration_process/hitobito-api/user-search';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    typeof emailInLabel === 'string' &&
    emailInLabel !== '' &&
    typeof userData.email === 'string' &&
    userData.email !== '' &&
    emailInLabel.toLowerCase() !== userData.email.toLowerCase()
  ) {
    return false;
  }
  return true;
}

export async function matchCandidate(
  candidate: SearchResult,
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    nickname?: string | undefined;
    birthDate?: string | undefined;
  }, // Subset of RegistrationInput
  logger?: Logger,
): Promise<MatchCandidateResult> {
  if (logger) logger.info(`Matching candidate ${candidate.id} (${candidate.label})`);

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
  let detailsResult = await getPersonDetails(candidate.id, logger);
  let addedToSupportGroup = false;

  // 403 Handler (Support Group Workaround)
  if (detailsResult.error === 'forbidden') {
    if (logger)
      logger.info(`403 Forbidden for ${candidate.id}, attempting support group workaround`);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const endOnString = `${futureDate.getDate().toString().padStart(2, '0')}.${(futureDate.getMonth() + 1).toString().padStart(2, '0')}.${futureDate.getFullYear()}`;

    try {
      const added = await addPersonToGroup(
        candidate.id,
        HITOBITO_CONFIG.supportGroupId,
        EXTERNAL_ROLE_TYPE,
        endOnString,
        logger,
      );
      addedToSupportGroup = added;

      if (added) {
        // Wait for propagation
        await sleep(2000);

        // Retry
        detailsResult = await getPersonDetails(candidate.id, logger);
      }
    } catch (error) {
      if (logger) logger.warn(`Support group workaround failed: ${String(error)}`);
    }
  }

  if (!detailsResult.success || !detailsResult.attributes) {
    // If we added them, keep them there so reviewer can check?
    // Prototype logic: return match=true, review=true.
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
      await removeGroupRole(candidate.id, HITOBITO_CONFIG.supportGroupId, logger);
      // Wait for removal propagation? Not critical.
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
  // If name & birthday match but email differs -> Review
  const { matchDetails } = verification;
  if (matchDetails.nameMatch && matchDetails.birthdayMatch && matchDetails.nicknameMatch) {
    return {
      matched: true,
      needsReview: true,
      personId: candidate.id,
      personLabel: candidate.label,
      reason: 'data_mismatch',
      mismatches: verification.mismatches,
      addedToSupportGroup, // Keep in support group
      details: detailsResult.attributes,
    };
  }

  // Not a match
  if (addedToSupportGroup) {
    await removeGroupRole(candidate.id, HITOBITO_CONFIG.supportGroupId, logger);
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
