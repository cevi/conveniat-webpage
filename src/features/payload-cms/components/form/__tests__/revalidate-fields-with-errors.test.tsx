/**
 * @jest-environment jsdom
 */

import { useRevalidateFieldsWithErrors } from '@/features/payload-cms/components/form/hooks/use-revalidate-fields-with-errors';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { useForm } from 'react-hook-form';

/** One required field, checked like a step of the form: with `trigger`, not with a submit. */
const StepWithOneField: React.FC = () => {
  const formMethods = useForm({ mode: 'onSubmit', reValidateMode: 'onChange' });
  useRevalidateFieldsWithErrors(formMethods);
  const { errors } = formMethods.formState;
  return (
    <form>
      <label htmlFor="name">Name</label>
      <input
        id="name"
        {...formMethods.register('name', { required: 'Dieses Feld ist erforderlich.' })}
      />
      <label htmlFor="other">Bemerkung</label>
      <input id="other" {...formMethods.register('other', { required: 'Auch erforderlich.' })} />
      {errors['name'] !== undefined && <p>Dieses Feld ist erforderlich.</p>}
      {errors['other'] !== undefined && <p>Auch erforderlich.</p>}
      <button type="button" onClick={() => void formMethods.trigger(['name'])}>
        Weiter
      </button>
    </form>
  );
};

describe('a field with an error', () => {
  it('loses its message as soon as the answer is valid, without another "Weiter"', async () => {
    render(<StepWithOneField />);
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(await screen.findByText('Dieses Feld ist erforderlich.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Moritz' } });

    await waitFor(() => expect(screen.queryByText('Dieses Feld ist erforderlich.')).toBeNull());
  });

  it('gets no message while the user fills in a field that was never checked', async () => {
    render(<StepWithOneField />);

    fireEvent.change(screen.getByLabelText('Bemerkung'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Bemerkung'), { target: { value: '' } });

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText('Auch erforderlich.')).toBeNull();
  });
});
