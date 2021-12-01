import * as sql from 'mssql';
import * as fs from 'fs';
import * as dotenv from "dotenv";
import {Response} from "express";
import { PQuery } from './interface';
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
    if(!result) return res.status(400).send("No entries found");

    return result.recordset[0].DATA as string;
};

export const query = async (query: string, prepared: PQuery[] = []) => {
    try
    {
        const pool = new sql.ConnectionPool(config);
        await pool.connect();
        if(prepared.length == 0)
        {
            const result = await pool.query(query).catch(async err => {
                console.log(err);
                await pool.close();
                throw err;
            });
            await pool.close();
            return result;
        }
        const ps = new sql.PreparedStatement(pool);
        for(let i = 0; i < prepared.length; i++) ps.input(prepared[i].value, prepared[i].type);
        await ps.prepare(query);
        const result = await ps.execute(prepared);
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
}))();

