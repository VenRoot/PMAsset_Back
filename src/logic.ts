import { Item } from "./interface";
import {addEntry, deleteEntry, editEntry} from "./sql";

export const setData = async (request: Item, method: "PUT" | "POST" | "DELETE") => {
    switch(method)
    {
        case "PUT":
            await addEntry(request); break;
        case "POST":
            await editEntry(request); break;
        case "DELETE":
            await deleteEntry(request); break;
    }
};