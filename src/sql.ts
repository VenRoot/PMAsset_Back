import * as sql from 'mssql';
import * as fs from 'fs';
import * as dotenv from "dotenv";
import {Response} from "express";
import { IGetEntriesRequest, Item, PQuery, PQueryArray } from './interface';
import path from "path";
import { endRes } from '.';

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

export const getEntries = async (res: Response, type: IGetEntriesRequest) => {
    let q = "";
    console.log(type);
    switch(type.type)
    {
        case "PC": q = "SELECT * FROM PC"; break;
        case "Monitor": q = "SELECT * FROM MONITOR"; break;
        case "Phone": q = "SELECT * FROM PHONE"; break;
        case "Konferenz": q= "SELECT * FROM KONFERENZ"; break;
        default: return endRes(res, 400, "Invalid Type");
    }
    const result = await query(q).catch(err => {
        console.error(err);
        res.status(500).send(err);
    });
    if(!result) {res.status(400).end("No entries found"); return null}

    return result.recordset;
};



export const getEntry = async (id: number, res: Response) => {
    const result = await query(`SELECT * FROM entries WHERE id = ${id}`).catch(err => {
        console.error(err);
        res.status(500).send(err);
    });
    if(!result) {res.status(400).end("No entries found"); return null}

    return result.recordset;
};

export const addEntry = async (entry: Item) => {
    console.table(entry);
    switch(entry.kind)
    {
        case "Konferenz":
            query(`INSERT INTO [dbo].[entries] VALUES (@value)`, [{name: "value", value: entry, type: sql.VarChar}]);
            break;
        case "Monitor": 
            query(`INSERT INTO [dbo].[MONITOR] VALUES (@itnr, @sn, @hersteller, @type, @status, @besitzer, @form, @model)`, [
                {name: "itnr", value: entry.it_nr, type: sql.VarChar}, {name: "sn", value: entry.seriennummer, type: sql.VarChar}, {name: "hersteller", value: entry.hersteller, type: sql.VarChar}, {name: "type", value: entry.type, type: sql.VarChar}, {name: "status", value: entry.status, type: sql.VarChar}, {name: "besitzer", value: entry.besitzer, type: sql.VarChar}, {name: "form", value: entry.form, type: sql.VarChar}, {name: "model", value: entry.model, type: sql.VarChar}]);
            break;
        case "PC":
            console.log(`INSERT INTO [dbo].[PC] VALUES ("${entry.it_nr}", "${entry.seriennummer}", "${entry.hersteller}", "${entry.type}", "${entry.status}", "${entry.besitzer || ""}", "${entry.form}", "${entry.passwort}", "${entry.equipment}", "${entry.standort}")`);
            query(`INSERT INTO [dbo].[PC] VALUES (@itnr, @sn, @hersteller, @type, @status, @besitzer, @form, @passwort, @equipment, @standort)`, [
                {name: "itnr", value: entry.it_nr, type: sql.VarChar}, {name: "sn", value: entry.seriennummer, type: sql.VarChar},{name: "hersteller", value: entry.hersteller, type: sql.VarChar}, {name: "type", value: entry.type, type: sql.VarChar}, {name: "status", value: entry.status, type: sql.VarChar}, {name: "besitzer", value: entry.besitzer || "", type: sql.VarChar}, {name: "form", value: entry.form || "", type: sql.VarChar}, {name: "passwort", value: entry.passwort, type: sql.VarChar}, {name: "equipment", value: JSON.stringify(entry.equipment), type: sql.VarChar}, {name: "standort", value: entry.standort, type: sql.VarChar}]);
            break;
        case "Phone": 
            query(`INSERT INTO [dbo].[entries] ([DATA]) VALUES (@value)`, [{name: "value", value: entry, type: sql.VarChar}]);
            break;
    }
};


export const editEntry = async (entry: Item) => {
    switch(entry.kind)
    {
        case "Konferenz":
            query(`INSERT INTO [dbo].[entries] ([DATA]) VALUES (@value)`, [{name: "value", value: entry, type: sql.VarChar}]);
            break;
        case "Monitor":
            //Modify data in DB with new values
            query(`UPDATE [dbo].[MONITOR] SET [itnr] = @itnr, [sn] = @sn, [hersteller] = @hersteller, [type] = @type, [status] = @status, [besitzer] = @besitzer, [form] = @form, [model] = @model WHERE [itnr] = @itnr`, [
                {name: "itnr", value: entry.it_nr, type: sql.VarChar}, {name: "sn", value: entry.seriennummer, type: sql.VarChar}, {name: "hersteller", value: entry.hersteller, type: sql.VarChar}, {name: "type", value: entry.type, type: sql.VarChar}, {name: "status", value: entry.status, type: sql.VarChar}, {name: "besitzer", value: entry.besitzer, type: sql.VarChar}, {name: "form", value: entry.form, type: sql.VarChar}, {name: "model", value: entry.model, type: sql.VarChar}]);
            break;
        case "PC":
            //Modify data in DB with new values
            query(`UPDATE [dbo].[PC] SET [ITNR] = @itnr, [SN] = @sn, [HERSTELLER] = @hersteller, [TYPE] = @type, [STATUS] = @status, [BESITZER] = @besitzer, [FORM] = @form, [PASSWORT] = @passwort, [EQUIPMENT] = @equipment, [STANDORT] = @standort WHERE [ITNR] = @itnr`, [
                {name: "itnr", value: entry.it_nr, type: sql.VarChar}, {name: "sn", value: entry.seriennummer, type: sql.VarChar}, {name: "hersteller", value: entry.hersteller, type: sql.VarChar}, {name: "type", value: entry.type, type: sql.VarChar}, {name: "status", value: entry.status, type: sql.VarChar}, {name: "besitzer", value: entry.besitzer, type: sql.VarChar}, {name: "form", value: entry.form, type: sql.VarChar}, {name: "passwort", value: entry.passwort, type: sql.VarChar}, {name: "equipment", value: JSON.stringify(entry.equipment), type: sql.VarChar}, {name: "standort", value: entry.standort, type: sql.VarChar}]);
            break;
        case "Phone": 
            query(`INSERT INTO [dbo].[entries] ([DATA]) VALUES (@value)`, [{name: "value", value: entry, type: sql.VarChar}]);
            break;
    }
}

export const deleteEntry = async (entry: Item) => {
    switch(entry.kind)
    {
        case "Konferenz":
            query(`DELETE FROM [dbo].[entries] ([DATA]) VALUES (@value)`, [{name: "value", value: entry, type: sql.VarChar}]);
            break;
        case "Monitor": 
            query(`DELETE FROM [dbo].[MONITOR] WHERE ITNR = @itnr AND SN = @sn`, [
                {name: "itnr", value: entry.it_nr, type: sql.VarChar}, {name: "sn", value: entry.seriennummer, type: sql.VarChar}]);
            break;
        case "PC":
            //Delete data from DB
            query(`DELETE FROM [dbo].[PC] WHERE ITNR = @itnr AND SN = @sn`, [
                {name: "itnr", value: entry.it_nr, type: sql.VarChar}, {name: "sn", value: entry.seriennummer, type: sql.VarChar}]);
            break;
        case "Phone": 
            query(`DELETE FROM [dbo].[entries] ([DATA]) VALUES (@value)`, [{name: "value", value: entry, type: sql.VarChar}]);
            break;
    }
};

//
export const query = async (query: string, prepared?: PQueryArray[]) => {
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
        console.log(1);
        const ps = new sql.PreparedStatement(pool);
        console.log(2);
        prepared.forEach(p => ps.input(p.name, p.type));
        // @ts-ignore
        const obj = {}; prepared.forEach(p => obj[p.name] = p.value);
        console.log(ps.statement, JSON.stringify(ps.parameters), prepared.length, query, JSON.stringify(obj));
        console.log(3);
        await ps.prepare(query);
        console.log(4);
        
        
        
        
        console.log(prepared.length, query, JSON.stringify(obj));
        const result = await ps.execute(obj);
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
