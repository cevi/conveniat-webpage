export const youtubeLinkValidaiton = (value: string | undefined | null) => {
  if (value === undefined || value === null || value === '') return 'Link is required.';

  // check against regex
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S+)?$/;

  if (!youtubeRegex.test(value)) {
    return 'Please enter a valid YouTube URL.';
  }

  return true; // Validation passed
};
