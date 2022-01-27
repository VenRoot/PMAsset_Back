import { Response } from "express";
import { endRes } from ".";
import { Item } from "./interface";
import {addEntry, deleteEntry, editEntry, query} from "./sql";

export const setData = async (request: Item, method: "PUT" | "POST" | "DELETE", res: Response, callback = true) => {
    switch(method)
    {
        case "PUT":
            await addEntry(request).catch(err => {
                if(callback) endRes(res, 500, "Internal Server Error: "+JSON.stringify(err));
            }).then(() => {
                if(callback) endRes(res, 200, "Successfully inserted data");
            });
            break;
        case "POST":
            await editEntry(request).catch(err => {
                if(callback) endRes(res, 500, "Internal server error: "+JSON.stringify(err));
            }).then(() => {
                if(callback) endRes(res, 200, "Successfully inserted data");
            });break;
        case "DELETE":
            await deleteEntry(request).catch(err => {
                if(callback) endRes(res, 500, "Internal server error: "+JSON.stringify(err));
            }).then(() => {
               if(callback) endRes(res, 200, "Successfully inserted data");
            });break;
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