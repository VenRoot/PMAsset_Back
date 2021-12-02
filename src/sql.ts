import * as sql from 'mssql';
import * as fs from 'fs';
import * as dotenv from "dotenv";
import {Response} from "express";
import { Item, PQuery, PQueryArray } from './interface';
import path from "path";

dotenv.config({path: path.join(__dirname, "..", '/.env')});

const config: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: "***REMOVED***.***REMOVED***.net",
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || "1433"),
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    beforeConnect: connection => {
        // connection.on("debug", message => console.log(message));
        connection.on("error", err => console.error("Error on Connection"+err));
    }
};

export const getEntries = async (res: Response) => {
    const result = await query(`SELECT * FROM entries`).catch(err => {
        console.error(err);
        res.status(500).send(err);
    });
    if(!result) {res.status(400).end("No entries found"); return null}

    return result.recordsets;
};

export const addEntry = async (_entry: string) => {
    const entry = JSON.parse(_entry) as Item;
    switch(entry.kind)
    {
        case "Konferenz":
            query(`INSERT INTO [dbo].[entries] ([DATA]) VALUES (@value)`, [{name: "value", value: _entry, type: sql.VarChar}]);
            break;
        case "Monitor": 
            query(`INSERT INTO [dbo].[entries] ([DATA]) VALUES (@value)`, [{name: "value", value: _entry, type: sql.VarChar}]);
            break;
        case "PC": 
            query(`INSERT INTO [dbo].[entries] ([DATA]) VALUES (@value)`, [{name: "value", value: _entry, type: sql.VarChar}]);
            break;
        case "Phone": 
            query(`INSERT INTO [dbo].[entries] ([DATA]) VALUES (@value)`, [{name: "value", value: _entry, type: sql.VarChar}]);
            break;
    }
};


//Fix this shit
export const query = async (query: string, prepared?: PQueryArray) => {
    try
    {
        console.log(query);
        
        const pool = new sql.ConnectionPool(config);
        await pool.connect();
        if(prepared == undefined)
        {
            const result = await pool.query(query).catch(async err => {
                console.log(err);
                await pool.close();
                throw err;
            });
            await pool.close();
            return result;
        }
        console.log(`{${[prepared[0].value]}: ${prepared[0].value}}`);
        console.log(1);
        const ps = new sql.PreparedStatement(pool);
        console.log(2);
        ps.input(prepared[0].name, prepared[0].type);
        console.log(3);
        await ps.prepare(query);
        console.log(4);
        const result = await ps.execute({
            [prepared[0].name]: prepared[0].value
        });
        console.log(5);
        await ps.unprepare();
        await pool.close();
    return result;
    }
    catch(e)
    {
        console.log("Error in query: " + e);
        throw e;
    }
};
((async () => {
    console.log(JSON.stringify(await query("SELECT * from entries;")));
    console.log(JSON.stringify(await query("SELECT * from entries WHERE DATA = @value;", [{name: "value", value: "{Hallo}", type: sql.VarChar}])));
}));

