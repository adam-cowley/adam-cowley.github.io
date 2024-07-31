

type IncludeProps = { url: string, func?: string }

export default async function Include({ url, }: IncludeProps) {
    let content = ''

    try {
        const res = await fetch(url)

        content = await res.text()
    }
    catch (e: any) {
        return <div className='error'>
            <strong>Error fetching ${url}</strong>
            {e.getMessage()}
        </div>
    }


    return <>{content}</>

}