import * as sql from 'mssql';
import * as fs from 'fs';
import * as dotenv from "dotenv";
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
    }
};
((async () => {
    console.log(await query("SELECT 1+1;"));
}))();

