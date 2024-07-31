

type IncludeProps = { url: string, func?: string }

export default async function Include({ url, func }: IncludeProps) {
    let content = ''

    try {
        const res = await fetch(url)

    }
    catch (e: any) {
        return <div className='error'>
            <strong>Error fetching ${url}</strong>
            {e.getMessage()}
        </div>
    }


    return <>{content}</>

}