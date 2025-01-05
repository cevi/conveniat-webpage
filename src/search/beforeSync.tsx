import { BeforeSync, DocToSync } from "node_modules/@payloadcms/plugin-search/dist/types";

export const beforeSyncWithSearch: BeforeSync = async ({originalDoc, searchDoc, payload}) => {
    const {
        doc: { relationTo: collection },
    } = searchDoc;

    const { seo, content, slugUrl, blogH1 } = originalDoc;
    const modifiedDoc: DocToSync = {
        ...searchDoc,
        seo: {
            ...seo,
            slugUrl: seo?.slugURL || slugUrl,
        },
        content: {
            ...content,
            blogH1: content?.blogH1 || blogH1
        }
    };

    return modifiedDoc;
}