import { FormBlock } from '@/components/form';

// @ts-ignore
export const ShowForm: React.FC<any> = async ({ ...block }) => {
  return (
    <div>
      <FormBlock {...block} />
    </div>
  );
};
