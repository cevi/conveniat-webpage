import { SerializedQuoteNode } from "@payloadcms/richtext-lexical";
import { JSXConverters } from "@payloadcms/richtext-lexical/react";

export const QuoteJSXConverter: JSXConverters<SerializedQuoteNode> = {
    quote: ({ node, nodesToJSX }) => {
        return (
        <blockquote className="max-w-2xl text-left font-body text-base font-normal text-gray-400 border-l-4 border-gray-400 pl-4 my-4">
            {nodesToJSX({
                nodes: node.children,
            })}
        </blockquote>
        );
    },
};
