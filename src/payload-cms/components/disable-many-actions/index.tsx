import React from 'react';

/**
 *
 * Due to our custom implementation of the multi-lang publishing feature,
 * we need to disable the default "Publish Many" and "Unpublish Many" actions for
 * the list views. This component is used to disable these actions using
 * CSS (hiding the buttons).
 *
 * Additionally, we delete the "Edit Many" action.
 *
 * We don't need to secure the actions on the backend, as an authenticated user
 * would have anyway the necessary permissions to publish/unpublish documents
 * (i.e., we assume that we can trust the user in that regard).
 *
 */
const DisableManyAction: React.FC = () => {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .unpublish-many__toggle, .publish-many__toggle, .edit-many__toggle
            {
              display: none;
            }
        `,
        }}
      />
    </>
  );
};

export default DisableManyAction;
