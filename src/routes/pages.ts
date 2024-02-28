import { page } from "$app/stores";

// typescript type for page structure
type Page = {
    name: string;
    path: string;
}

type PageNested = Page & {
    subpages?: Page[];
}

const pageStructure: PageNested[] = [
    {
        name: "Monkey",
        path: "/monkey",
        subpages: [
            {
                name: "Getting Started",
                path: "getting-started",
            }
        ]
    },
    {
        name: "MIDI Connect",
        path: "/midi-connect",
    },
    {
        name: "About",
        path: "/about",
    },
]

type PageStructure = {
    pages: Page[];
    subpages: (Page | null)[][];
}

export const pageStructureFormatted = (): PageStructure => {
    let numPages = pageStructure.length
    
    // first index is a list of top level pages, the following indexes is subpages where the index in the array is the index of the parent page
    let formattedPages: PageStructure = {
        pages: [],
        subpages: []
    }

    formattedPages.pages  = pageStructure.map(page => {
        return {
            name: page.name,
            path: page.path
        }
    })

    pageStructure.forEach((page, index) => {
        page.subpages?.forEach((subpage, subIndex) => {
            // create array if doesn't exist
            if (!formattedPages.subpages[subIndex]) {
                formattedPages.subpages[subIndex] = new Array(numPages)
            }

            formattedPages.subpages[subIndex][index] = {
                name: subpage.name,
                path: `${page.path}/${subpage.path}`
            }
        })
    })

    return formattedPages
}