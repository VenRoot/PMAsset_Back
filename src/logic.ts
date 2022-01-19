import { Response } from "express";
import { Item } from "./interface";
import {addEntry, deleteEntry, editEntry, query} from "./sql";

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


export const SetMonitors = async (ITMon: string[], ITPC: string, res: Response, autoAktiv: boolean) =>
{
    const result = await query(`UPDATE dbo.PC SET EQUIPMENT = '${JSON.stringify(ITMon)}' WHERE [ITNR] = '${ITPC}'`).catch(err => {
        console.error(err);
        res.status(500).send(JSON.stringify(err));
    });
    if(!result) {res.status(404).end(JSON.stringify({message: "No entries found", status: 404})); return null}

    if(autoAktiv)
    {
        const result = await query(`UPDATE dbo.PC SET STATUS = 'Aktiv' WHERE [ITNR] = '${ITPC}'`).catch(err => {
            console.error(err);
            res.status(500).send(JSON.stringify(err));
        });
        if(!result) {res.status(404).end(JSON.stringify({message: "No entries found", status: 404})); return null}
    }

    res.status(200).end(JSON.stringify({message: "Entries changed", status: 200}));
};