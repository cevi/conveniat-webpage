import { FormBlock } from "@/payload-cms/components/form"

export const ShowForm: React.FC<any> = async ({...block}) => {
    return (
        <div>
            <FormBlock {...block}/>
        </div>
    )
}