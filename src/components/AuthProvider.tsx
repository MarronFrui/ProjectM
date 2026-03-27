import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import supabase from '../supabase';


type Todo = { id: string; title: string; completed: boolean };
type TodosContextType = { todos: Todo[] };

const TodosContext = createContext<TodosContextType>({ todos: [] });

export function TodosProvider({ children }: { children: ReactNode }) {
    const [todos, setTodos] = useState<Todo[]>([]);

    useEffect(() => {
        async function fetchTodos() {
            const { data, error } = await supabase.from("todos").select();
            if (error) {
                console.error("Failed to fetch todos:", error);
                return;
            }
            if (data) setTodos(data);
        }
        fetchTodos();
    }, []);

    return <TodosContext.Provider value={{ todos }}>{children}</TodosContext.Provider>;
}

export const useTodos = () => useContext(TodosContext);