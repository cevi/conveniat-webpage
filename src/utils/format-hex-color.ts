export const formatHexColor = (color: string | null | undefined): string | undefined => {
  if (color === null || color === undefined || color === '') return undefined;
  return color.startsWith('#') ? color : `#${color}`;
};
