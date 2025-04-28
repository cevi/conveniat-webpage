export const youtubeLinkValidation = (value: string | undefined | null): true | string => {
  if (value === undefined || value === null || value === '') return 'Link is required.';

  // check against regex
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S+)?$/;

  const youtubeShortsRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S+)?$/;

  if (!youtubeRegex.test(value) && !youtubeShortsRegex.test(value)) {
    return 'Please enter a valid YouTube URL.';
  }

  return true; // Validation passed
};
