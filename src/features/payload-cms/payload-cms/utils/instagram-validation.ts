export const instagramLinkValidation = (value: string | undefined | null): true | string => {
  if (value === undefined || value === null || value === '') return 'Link is required.';

  // check against regex
  const instagramRegex =
    /^(https?:\/\/)?(www\.)?(instagram\.com\/([a-zA-Z0-9_-]*)\/p\/|instagr\.am\/p\/)([a-zA-Z0-9_-]{11})(\S+)?$/;

  if (!instagramRegex.test(value)) {
    return 'Please enter a valid Instagram URL.';
  }

  return true; // Validation passed
};
