import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { loadContentDB, ContentItem } from "../../config";

interface ContentContextValue {
    content: ContentItem[];
    loading: boolean;
    error: Error | null;
}

const ContentContext = createContext<ContentContextValue>({
    content: [],
    loading: true,
    error: null,
});

export function useContent() {
    return useContext(ContentContext);
}

export function ContentProvider({ children }: { children: ReactNode }) {
    const [content, setContent] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        loadContentDB()
            .then((items) => {
                setContent(items);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load content availability", err);
                setError(err);
                setLoading(false);
            });
    }, []);

    return (
        <ContentContext.Provider value={{ content, loading, error }}>
            {children}
        </ContentContext.Provider>
    );
}
