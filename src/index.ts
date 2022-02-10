import dotenv from "dotenv";
import path from "path";
import os from "os";
import md5 from "md5";
dotenv.config({path: path.join(__dirname, "../.env")});

import express, { Request, Response } from 'express';
import fs from 'fs';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import {checkUser, getUserInfo} from "./ad";
import {decrypt, encrypt, generateKey} from "./crypto";
import {IAuthRequest, ICheckRequest, IEntryDevices, IGetEntriesRequest, Item} from "./interface";
import {checkAlreadyLoggedIn, Sessions, checkUser as SessionUser, RefreshSession} from "./session";
import { editEntry, getEntries, getEntry } from "./sql";
import {IRecordSet} from "mssql";

import https from "http2";
import spdy from "spdy";
import { setData, SetMonitors } from "./logic";
import { FillPDF } from "./pdf";

if(process.env.TEST_USER === undefined || process.env.TEST_PASSWD === undefined) throw new Error("No test user or password");

// const apiKeyAuth = require('api-key-auth');
const app = express();

app.use(express.json());
app.use(helmet());
app.use(bodyParser.json());
app.use(cors());
app.use(morgan('combined'));

// const getSecret = (keyId:string, done:any) => {
//     if (!apiKeys.has(keyId)) {
//       return done(new Error('Unknown api key'));
//     }
//     const clientApp = apiKeys.get(keyId);
//     done(null, clientApp.secret, {
//       id: clientApp.id,
//       name: clientApp.name
//     });
//   }
  
// app.use(apiKeyAuth({ getSecret }));

app.get('/protected', (req:any, res) => {
    res.send(`Hello ${req.credentials.name}`);
  });

app.get("/", (req, res) => {
    console.log("GET");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`Du hier nix im Backend rumkruschdeln! Du nur machen mit Oberfläche! Du machen mit <a href='https://${req.headers.hostname || req.headers.host}:3000'>Frontend</a> die Arbeit!<br>Sonst <h1 style='color: red;'>Grande Problema!<h1>`);
});

app.get("/auth", async (req, res) => {
    if(req.headers.auth === undefined) return endRes(res, 400, "No auth header");
    let auth = JSON.parse(req.headers.auth as string) as IAuthRequest;
    
    if(auth.type === "RequestKey") return assignNewKey(res); //
    else if(auth.type === "AuthUser") {
        if(auth.username === undefined || auth.password === undefined) return endRes(res, 401, "No username or password"); //Check if username and password are set
            let session = Sessions.findIndex(session => session.id === auth.SessionID); 
            if(session === -1) return endRes(res, 404, "Session not found"); //Check if session is found
            checkUser(auth.username, auth.password, async (value, err) => {
                if(err) return endRes(res, 401, err);
                if(value) {
                    
                    if(Sessions[session].user?.authenticated) return endRes(res, 403, "Session already has a user logged in"); //Check if user is already logged in
                    if(checkAlreadyLoggedIn(auth.username as string)) return endRes(res, 403, "The User is already logged in from another session!");  //Check if the user is already logged in from another session
                    Sessions[session].user = {username: auth.username as string, authenticated: true};
                    console.log(Sessions[session]);
                    Sessions[session].date = new Date(); //Update session date to keep it alive
                    return endRes(res, 200, "Successfully logged in");
                }
            });
    }
    else if(auth.type === "Logout")
    {
        let session = Sessions.findIndex(session => session.id === auth.SessionID);
        if(session === -1) return endRes(res, 404, "Session not found or expired");
        Sessions.splice(session, 1);
        return endRes(res, 200, "Successfully logged out");
    }
    else return endRes(res, 401, "Invalid auth type");

});

app.get("/users", async(req, res) => {
    console.log(Sessions);
    endRes(res, 200, "");
});

app.get("/getUser", async(req, res) =>
{
    getUserInfo("Markus.Loeffler***REMOVED***.com", (user, err) =>
    {
        if(err) return endRes(res, 500, JSON.stringify(err));
        endRes(res, 200, JSON.stringify(user));
    });
});

// app.get("/pdf", express.static(path.join("..", "pdf")));

app.get("/pdf", async(req, res) => {
    if(!req.headers.auth) return endRes(res, 400, "No auth header");
    if(!req.headers.data) return endRes(res, 400, "No data header");
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    let data = JSON.parse(req.headers.data as string) as {ITNr: string};
    if(!SessionUser(auth.username, auth.SessionID)) return endRes(res, 404, "Invalid Sesison/Username-Combo");
    RefreshSession(auth.SessionID);
    if(!data.ITNr) return endRes(res, 400, "No ITNr");
    //Check if data.ITNr is a path, check, if the path exists and is a pdf
    const p = path.join(__dirname, "..", "pdf", data.ITNr, "output.pdf");
    if(!fs.existsSync(p)) return endRes(res, 404, "File not found");

    const file = Buffer.from(fs.readFileSync(p, "binary"), "binary");
    endRes(res, 200, "OK" , file);
});

const hexEncode = function(res:string){
    var hex, i;

    var result = "";
    for (i=0; i<res.length; i++) {
        hex = res.charCodeAt(i).toString(16);
        result += hex+" ";
    }

    return result
}


app.put("/pdf", async(req, res) => {
    if(!req.headers.auth) return endRes(res, 400, "No auth header");
    if(!req.headers.data) return endRes(res, 400, "No data header");
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    let data = JSON.parse(req.headers.data as string) as {ITNr: string, type: IGetEntriesRequest["type"]};
    if(!SessionUser(auth.username, auth.SessionID)) return endRes(res, 404, "Invalid Sesison/Username-Combo");
    RefreshSession(auth.SessionID);
    if(!data.ITNr) return endRes(res, 400, "No ITNr");
    const p = path.join(__dirname, "..", "pdf", data.ITNr, "output.pdf");
    if(fs.existsSync(p)) return endRes(res, 409, "File already exists");
    

    
    const x:any = await getEntry(data.ITNr, {type: data.type}).catch(err => {
        console.log("Fehler: ",err);
        switch(err)
        {
            case 404: return endRes(res, 404, "File not found"); break;
            default: return endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
        }
    });
    if(!x) return endRes(res, 500, "Internal Server Error\n\n");
    fs.mkdirSync(path.join(__dirname, "..", "pdf", data.ITNr));
    const newPC:Item = {
        kind: "PC",
        it_nr: x[0].ITNR,
        seriennummer: x[0].SN,
        hersteller: x[0].HERSTELLER,
        equipment: x[0].EQUIPMENT,
        form: "Ja",
        type: x[0].TYPE,
        passwort: x[0].PASSWORT,
        standort: x[0].STANDORT,
        status: x[0].STATUS,
        besitzer: x[0].BESITZER,
    }
    FillPDF(newPC).catch(err => {
        if(err) endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
    }).then(pdf => {
        endRes(res, 200, "PDF wurde erstellt");
        editEntry(newPC);
        // res.download(pdf!, (err) => 
        // {
            
        //     if(err) return endRes(res, 500, err.message);
        //     endRes(res, 200, "OK");
        // });
        
        //var file = fs.createReadStream(pdf!);
        //var stat = fs.statSync(pdf!);
        //res.setHeader('Content-Length', stat.size);
        //res.setHeader('Content-Type', 'application/pdf');
        //res.setHeader('Content-Disposition', 'attachment; filename='+x[0].ITNR);
        //file.pipe(res);
    })

});

//Bearbeite die PDF, bzw generiere sie mit den neuen Werten
app.post("/pdf", async (req, res) => {

    if(!req.headers.auth) return endRes(res, 400, "No auth header");
    if(!req.headers.data) return endRes(res, 400, "No data header");
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    let data = JSON.parse(req.headers.data as string) as {ITNr: string, type: IGetEntriesRequest["type"]};
    if(!SessionUser(auth.username, auth.SessionID)) return endRes(res, 404, "Invalid Sesison/Username-Combo");
    RefreshSession(auth.SessionID);
    if(!data.ITNr) return endRes(res, 400, "No ITNr");
    const p = path.join(__dirname, "..", "pdf", data.ITNr, "output.pdf");
    if(!fs.existsSync(p)) return endRes(res, 409, "Datei existiert nicht und kann daher nicht bearbeiten werden");

    const x:any = await getEntry(data.ITNr, {type: data.type}).catch(err => {
        console.log("Fehler: ",err);
        switch(err)
        {
            case 404: return endRes(res, 404, "File not found"); break;
            default: return endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
        }
    });
    if(!x) return endRes(res, 500, "Internal Server Error\n\n");
    const newPC:Item = {
        kind: "PC",
        it_nr: x[0].ITNR,
        seriennummer: x[0].SN,
        hersteller: x[0].HERSTELLER,
        equipment: x[0].EQUIPMENT,
        form: "Ja",
        type: x[0].TYPE,
        passwort: x[0].PASSWORT,
        standort: x[0].STANDORT,
        status: x[0].STATUS,
        besitzer: x[0].BESITZER,
    }
    FillPDF(newPC).catch(err => {
        if(err) endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
    }).then(pdf => {
        endRes(res, 200, "PDF wurde neu erstellt, möchten Sie diese anzeigen?");
    });
});

app.delete("/pdf", async (req, res) => {
    if(!req.headers.auth) return endRes(res, 400, "No auth header");
    if(!req.headers.data) return endRes(res, 400, "No data header");
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    let data = JSON.parse(req.headers.data as string) as {ITNr: string, type: IGetEntriesRequest["type"]};
    if(!SessionUser(auth.username, auth.SessionID)) return endRes(res, 404, "Invalid Sesison/Username-Combo");
    RefreshSession(auth.SessionID);
    if(!data.ITNr) return endRes(res, 400, "No ITNr");
    const p = path.join(__dirname, "..", "pdf", data.ITNr, "output.pdf");
    if(!fs.existsSync(p)) return endRes(res, 409, "Datei existiert nicht und kann daher nicht gelöscht werden");

    const x:any = await getEntry(data.ITNr, {type: data.type}).catch(err => {
        console.log("Fehler: ",err);
        switch(err)
        {
            case 404: return endRes(res, 404, "File not found"); break;
            default: return endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
        }
    });
    if(!x) return endRes(res, 500, "Internal Server Error\n\n");
    try
    {
        const newPC:Item = {
            kind: "PC",
            it_nr: x[0].ITNR,
            seriennummer: x[0].SN,
            hersteller: x[0].HERSTELLER,
            equipment: JSON.parse(x[0].EQUIPMENT),
            form: "Nein",
            type: x[0].TYPE,
            passwort: x[0].PASSWORT,
            standort: x[0].STANDORT,
            status: x[0].STATUS,
            besitzer: x[0].BESITZER,
        }
        setData(newPC, "POST", res, false).catch(err => {
            if(err) return endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
            fs.unlink(p, err => {
                if(err) return endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
                endRes(res, 200, "PDF wurde gelöscht");
            });
    
        });
    }
    catch(err)
    {
        endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
    }
    
});

app.get("/setMonitors", async (req, res) =>
{
    if(!req.headers.auth) return endRes(res, 400, "No auth header");
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    let data = JSON.parse(req.headers.data as string) as {PCITNr: string, MonITNr: string[]};
    if(!SessionUser(auth.username, auth.SessionID)) return endRes(res, 404, "Invalid Sesison/Username-Combo");
    RefreshSession(auth.SessionID);
    SetMonitors(data.MonITNr, data.PCITNr, res, true);
})

app.get("/refresh", async (req, res) => {
    if(!req.headers.auth) return endRes(res, 400, "No auth header");
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    console.log(Sessions);
    if(!SessionUser(auth.username, auth.SessionID)) return endRes(res, 404, "Invalid Sesison/Username-Combo");
    RefreshSession(auth.SessionID);
    endRes(res, 200, "Successfully refreshed");
});

app.get("/check", async(req, res) => {
    if(req.headers.auth === undefined) return endRes(res, 400, "No auth header");
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    if(auth.username === undefined || auth.SessionID === undefined) return endRes(res, 401, "No username or sessionID");

    if(SessionUser(auth.username, auth.SessionID)) { RefreshSession(auth.SessionID); endRes(res, 200, "User is logged in"); }
    else endRes(res, 404, "User is not logged in");
});

const checkAuth = async (req:Request<{}, any, any, any, Record<string, any>>, res:Response, request:ICheckRequest) => {
    if(req.headers.auth === undefined) return endRes(res, 400, "No auth header");
    if(request.username === undefined || request.SessionID === undefined) return endRes(res, 401, "No username or sessionID");
    let session = Sessions.findIndex(session => session.id === request.SessionID);
    if(session === -1) return endRes(res, 404, "Session not found");
    if(!Sessions[session].user?.authenticated) return endRes(res, 403, "User not authenticated");
    if(Sessions[session].user?.username !== request.username) return endRes(res, 403, "User not authenticated");

    return true;
};

app.get("/getEntries", async (req, res) => {
    let request = JSON.parse(req.headers.req as string) as IGetEntriesRequest;
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    if(!(await checkAuth(req, res, auth))) return;
    if(request.type == undefined) return endRes(res, 400, "No type");
    RefreshSession(auth.SessionID);
    let result = await getEntries(res, request);
    //Check if result is type of IRecordSet
    if(result != null) endRes(res, 200, JSON.stringify(result));
});

app.get("/getEntry", async (req, res) => {
    let request = JSON.parse(req.headers.req as string) as IGetEntriesRequest;
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    if(!(await checkAuth(req, res, auth))) return endRes(res, 401, "User not authenticated");
    if(request.type == undefined) return endRes(res, 400, "No type");

    RefreshSession(auth.SessionID);
    let result = await getEntries(res, request);
    //Check if result is type of IRecordSet
    if(result != null) endRes(res, 200, JSON.stringify(result));
});

// app.get("/getSession", (req, res) => {
//     console.log(Sessions);
//     return endRes(res, 200, JSON.stringify(Sessions));
// });

app.post("/", (req, res) => {
    console.log("Post");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.json({
        message: "Hello World",
        status: 200
    });

});

app.put("/", (req, res) => {
    console.log("Put");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.json({
        message: "Hello World",
        status: 200
    });

});

app.delete("/", (req, res) => {
    console.log("Delete");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.json({
        message: "Hello World",
        status: 200
    });
});

// Change device data
app.post("/setData", async (req, res) => {
    console.log("SETDATA");
    if(req.headers.auth === undefined) return endRes(res, 400, "No auth header");
    if(req.headers.device === undefined) return endRes(res, 400, "No req header");
    const auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    const request = JSON.parse(req.headers.device as string) as Item;
    if(request === undefined) return endRes(res, 400, "No request");
    console.table(request);
    if(!(await checkAuth(req, res, auth))) return endRes(res, 401, "User not authenticated");

    RefreshSession(auth.SessionID);
    setData(request, "POST", res);
});

// Insert device data
app.put("/setData", async(req, res) => {    
    if(req.headers.auth === undefined) return endRes(res, 400, "No auth header");
    if(req.headers.device === undefined) return endRes(res, 400, "No req header");
    const auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    const request = JSON.parse(req.headers.device as string).device as Item;
    if(request === undefined) return endRes(res, 400, "No request");
    console.table(auth);
    console.table(request);
    if(!(await checkAuth(req, res, auth))) return;

    RefreshSession(auth.SessionID);
    console.log("Refreshed");
    
    if(["PC", "Monitor", "Phone", "Konferenz"].includes(request.kind)) setData(request, "PUT", res);
    else return endRes(res, 400, "Invalid kind");
    endRes(res, 200, "Successfully inserted data");
});

// Delete device data
app.delete("/setData", async(req, res) => {
    const auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    const request = JSON.parse(req.headers.device as string) as Item;
    if(!(await checkAuth(req, res, auth))) return endRes(res, 401, "User not authenticated");

    RefreshSession(auth.SessionID);
    setData(request, "DELETE", res);

});

const credentials: spdy.ServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '..', 'keys', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'keys', 'cert.pem')),
    maxVersion: 'TLSv1.3',
    minVersion: 'TLSv1.3',
    spdy: {
        protocols: ["h2", "spdy/2", "spdy/3"]
    }
};


spdy.createServer(credentials, app).listen(5000, "0.0.0.0", () => {
    console.log("Server is running on port 5000");
});

export const endRes = (res:Response, status:number, message:string, pdf?:Buffer) => {
    // console.log(status, message, pdf);
    
    if(pdf) 
    {
        console.log(pdf.length);
        res.charset = "UTF-8";
        res.type("pdf");
        res.writeHead(status, { "Content-Type": "binary", "Content-Length": pdf.length, 'Content-Transfer-Encoding': 'binary' });	
        res.write(pdf, "binary");
        res.end(undefined, "binary")
        return;
    }
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({message, status}));
    
}

const assignNewKey = async (res:Response) => {
    let key = generateKey();
    while(Sessions.find(session => session.id === key)) key = generateKey();    
    Sessions.push({id: key, date: new Date()});
    return endRes(res, 200, key);
};


process.on("uncaughtException", (err) => {
    console.log("uncaughtException: ", err);
    //Write to error log
    fs.appendFileSync(path.join(__dirname, '..', 'logs', 'error.log'), `${new Date()}: ${err}\n`);
    
});