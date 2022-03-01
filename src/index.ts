import dotenv from "dotenv";
import path from "path";
import os from "os";
import multer from "multer";
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
import { Blob } from "buffer";
import { isCryptoKey } from "util/types";
import { writeLog } from "./logs";
import { brotliCompressSync } from "zlib";

if(process.env.TEST_USER === undefined || process.env.TEST_PASSWD === undefined) throw new Error("No test user or password");

// const apiKeyAuth = require('api-key-auth');
const app = express();
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({storage: storage});

app.use(express.json({ limit: "50mb", type: "application/binary" }));
app.use(express.raw({limit: "50mb", type: "application/binary"}));
app.use(helmet());
app.use(bodyParser.json());
app.use(cors());
app.use(morgan('combined'));

//if maintenance is true, deny all requests with 503 Service Unavailable
app.use((req, res, next) => {
    if(process.env.MAINTENANCE) return res.status(503).send("Service Unavailable");
    next();
});

//renew the dotenv file every hour
setInterval(() => {
    dotenv.config({path: path.join(__dirname, "../.env")});
}, 60 * 1000);


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
                    
                    if(Sessions[session].user?.authenticated) return endRes(res, 403, "Session already has a user logged in", undefined, writeLog("Diese Sitzung wird bereits von einem anderen User benutzt", "WAR", "getUN", auth.username!)); //Check if user is already logged in
                    if(checkAlreadyLoggedIn(auth.username as string)) return endRes(res, 403, "The User is already logged in from another session!", undefined, writeLog("User ist bereits von einem anderen Client angemeldet", "WAR", "getUN", auth.username!));  //Check if the user is already logged in from another session
                    Sessions[session].user = {username: auth.username as string, authenticated: true};
                    console.log(Sessions[session]);
                    Sessions[session].date = new Date(); //Update session date to keep it alive
                    return endRes(res, 200, "Successfully logged in", undefined, writeLog("User erfolgreich angemeldet", "VER", "getUN", auth.username!));
                }
            });
    }
    else if(auth.type === "Logout")
    {
        let session = Sessions.findIndex(session => session.id === auth.SessionID);
        if(session === -1) return endRes(res, 404, "Session not found or expired", undefined, writeLog("Session nicht gefunden oder abgelaufen", "VER", "getUN", auth.username!));
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
    let data = JSON.parse(req.headers.data as string) as {ITNr: string, User: "User" | "Check"};
    if(!SessionUser(auth.username, auth.SessionID)) return endRes(res, 404, "Invalid Sesison/Username-Combo");
    RefreshSession(auth.SessionID);
    if(!data.ITNr) return endRes(res, 400, "No ITNr");
    //Check if data.ITNr is a path, check, if the path exists and is a pdf
    let p;

    data.User == "User" ? p = path.join(__dirname, "..", "pdf", data.ITNr, "output.pdf") : p = path.join(__dirname, "..", "pdf", data.ITNr, "Checkliste.pdf");
    if(!fs.existsSync(p)) return endRes(res, 404, "File not found");
    const file = fs.createReadStream(p);
    const stat = fs.statSync(p);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", `attachment; filename=${data.ITNr}.pdf`);
    file.pipe(res);
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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/CustomPDF", upload.single("file"), async (req, res) => {
    if(!req.headers.auth) return endRes(res, 400, "No auth header");
    // if(!req.headers.data) return endRes(res, 400, "No data header");
    if(!req.file) return endRes(res, 400, "No file");
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    let data = JSON.parse(req.headers.data as string) as {ITNr: string, pdf: string, User: "User" | "Check"};
    if(!SessionUser(auth.username, auth.SessionID)) return endRes(res, 404, "Invalid Sesison/Username-Combo");
    RefreshSession(auth.SessionID);
    if(!data.ITNr) return endRes(res, 400, "No ITNr");
    
    const file = req.file.buffer;
    const type = req.file.mimetype;
    const name = req.file.originalname;
    const size = req.file.size;
    console.log(file, type, name, size);
    if(data.User == "User")
    {
        if(!fs.existsSync(path.join(__dirname, "..", "pdf", data.ITNr))) fs.mkdirSync(path.join(__dirname, "..", "pdf", data.ITNr), {recursive: true});
    
        fs.writeFileSync(path.join(__dirname, "..", "pdf", data.ITNr, "output.pdf"), file, {encoding: "binary", flag: "w"});

        writeLog(auth.username+" hat eine User-PDF für "+data.ITNr+" überschrieben", "INF", "setPD", auth.username);
        endRes(res, 200, `UserPDF ${name} hochgeladen!`);
    }
    else if(data.User == "Check")
    {
        if(!fs.existsSync(path.join(__dirname, "..", "pdf", data.ITNr))) fs.mkdirSync(path.join(__dirname, "..", "pdf", data.ITNr), {recursive: true});
    
        fs.writeFileSync(path.join(__dirname, "..", "pdf", data.ITNr, "Checkliste.pdf"), file, {encoding: "binary", flag: "w"});

        writeLog(auth.username+" hat eine Checkliste für "+data.ITNr+" überschrieben", "INF", "setPD", auth.username);
        endRes(res, 200, `UserPDF ${name} hochgeladen!`);
    }
    
});

app.use(bodyParser.raw());
// app.use(bodyParser.urlencoded({ extended: true }));
app.put("/pdf", async(req, res) => {
    
    if(!req.headers.auth) return endRes(res, 400, "No auth header");
    if(!req.headers.data) return endRes(res, 400, "No data header");
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    let data = JSON.parse(req.headers.data as string) as {ITNr: string, type: IGetEntriesRequest["type"], own?:boolean, file?: string};

    if(!SessionUser(auth.username, auth.SessionID)) return endRes(res, 404, "Invalid Sesison/Username-Combo");
    RefreshSession(auth.SessionID);
    if(!data.ITNr) return endRes(res, 400, "No ITNr");
    const p = path.join(__dirname, "..", "pdf", data.ITNr, "output.pdf");
    if(fs.existsSync(p)) return endRes(res, 409, "File already exists", undefined, writeLog("PDF für "+data.ITNr+" konnte nicht geschrieben werden, da die Datei bereits existiert", "ERR", "setPC", auth.username));

    
    const x = await getEntry(data.ITNr, {type: data.type}).catch(err => {
        console.log("Fehler: ",err);
        writeLog("Fehler beim Abrufen der Einträge: "+err, "ERR", "setPC", auth.username);
        switch(err)
        {
            case 404: return endRes(res, 404, "Entry not found");
            default: return endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
        }
    });
    if(!x) return endRes(res, 500, "Internal Server Error\n\n");
    if(!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p));

    if(data.own)
    {
        console.log("Bearbeite PDF mit neuen Werten");
        
        //The body is in binary, so we need to parseit in express
        
        endRes(res, 200, "PDF wurde abgelegt", undefined, writeLog("PDF für "+data.ITNr+" wurde abgelegt", "INF", "setPC", auth.username));
        return;
    }

    const newPC:Item = {
        kind: "PC",
        it_nr: x[0].ITNR,
        seriennummer: x[0].SN,
        hersteller: x[0].HERSTELLER,
        equipment: x[0].EQUIPMENT,
        form: x[0].FORM,
        type: x[0].TYPE,
        passwort: x[0].PASSWORT,
        standort: x[0].STANDORT,
        status: x[0].STATUS,
        besitzer: x[0].BESITZER,
    }
    FillPDF(newPC).catch(err => {
        writeLog("Fehler beim Erstellen der PDF: "+err, "ERR", "setPC", auth.username);
        endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
    }).then(() => {
        writeLog("PDF für "+data.ITNr+" wurde erstellt", "INF", "setPC", auth.username);
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
    if(!data.ITNr) return endRes(res, 400, "No ITNr", undefined, writeLog(`Fehler beim Bearbeiten der PDF: Keine ITNr`, "ERR", "setPC", auth.username));
    const p = path.join(__dirname, "..", "pdf", data.ITNr, "output.pdf");
    if(!fs.existsSync(p)) return endRes(res, 409, "Datei existiert nicht und kann daher nicht bearbeiten werden", undefined, writeLog(`Fehler beim Bearbeiten der PDF: PDF für ${data.ITNr} existiert nicht`, "ERR", "setPC", auth.username));

    const x:any = await getEntry(data.ITNr, {type: data.type}).catch(err => {
        console.log("Fehler: ",err);
        switch(err)
        {
            case 404: return endRes(res, 404, "File not found", undefined, writeLog("Der Eintrag, dessen eine PDF angehängt werden sollte, wurde nicht gefunden", "ERR", "setPC", auth.username)); break;
            default: return endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
        }
    });
    if(!x) {
        writeLog(`Fehler beim Bearbeiten der PDF: Eintrag existiert nicht in der DB`, "ERR", "setPC", auth.username);
        return endRes(res, 500, "Internal Server Error\n\n");
    }
    const newPC:Item = {
        kind: "PC",
        it_nr: x[0].ITNR,
        seriennummer: x[0].SN,
        hersteller: x[0].HERSTELLER,
        equipment: x[0].EQUIPMENT,
        form: x[0].FORM,
        type: x[0].TYPE,
        passwort: x[0].PASSWORT,
        standort: x[0].STANDORT,
        status: x[0].STATUS,
        besitzer: x[0].BESITZER,
    }
    FillPDF(newPC).catch(err => {
        writeLog("Fehler beim Bearbeiten der PDF: "+err, "ERR", "setPC", auth.username);
        endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err));
    }).then(pdf => {
        writeLog(`PDF für ${data.ITNr} wurde erstellt`, "INF", "setPC", auth.username);
        endRes(res, 200, "PDF wurde neu erstellt, möchten Sie diese anzeigen?");
    });
});

function toBuffer(ab:ArrayBuffer):Buffer {
    const buf = Buffer.alloc(ab.byteLength);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}

app.delete("/pdf", async (req, res) => {
    if(!req.headers.auth) return endRes(res, 400, "No auth header");
    if(!req.headers.data) return endRes(res, 400, "No data header");
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    let data = JSON.parse(req.headers.data as string) as {ITNr: string, type: IGetEntriesRequest["type"], User: "User" | "Check"};
    if(!SessionUser(auth.username, auth.SessionID)) return endRes(res, 404, "Invalid Sesison/Username-Combo");
    RefreshSession(auth.SessionID);
    if(!data.ITNr) return endRes(res, 400, "No ITNr");
    let p: string;
    
    data.User == "User" ? p = path.join(__dirname, "..", "pdf", data.ITNr, "output.pdf") : p = path.join(__dirname, "..", "pdf", data.ITNr, "Checkliste.pdf");
    if(!fs.existsSync(p)) return endRes(res, 409, "Datei existiert nicht und kann daher nicht gelöscht werden", undefined, writeLog(`Fehler beim Löschen der PDF: PDF für ${data.ITNr} existiert nicht`, "ERR", "setPC", auth.username));

    const x:any = await getEntry(data.ITNr, {type: data.type}).catch(err => {
        console.log("Fehler: ",err);
        switch(err)
        {
            case 404: return endRes(res, 404, "File not found", undefined, writeLog("Der Eintrag für das Gerät wurde nicht gefunden", "ERR", "setPC", auth.username));
            default: return endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err), undefined, writeLog("Fehler beim Löschen der PDF: "+err, "ERR", "setPC", auth.username));
        }
    });
    if(!x) return endRes(res, 500, "Internal Server Error\n\n", undefined, writeLog("Fehler beim Löschen der PDF: Eintrag existiert nicht in der DB", "ERR", "setPC", auth.username));
    try
    {
        const newPC:Item = {
            kind: "PC",
            it_nr: x[0].ITNR,
            seriennummer: x[0].SN,
            hersteller: x[0].HERSTELLER,
            equipment: JSON.parse(x[0].EQUIPMENT),
            form: x[0].FORM,
            type: x[0].TYPE,
            passwort: x[0].PASSWORT,
            standort: x[0].STANDORT,
            status: x[0].STATUS,
            besitzer: x[0].BESITZER,
        }
        setData(newPC, "POST", res, false).catch(err => {
            if(err) return endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err), undefined, writeLog("Fehler beim Löschen der PDF: "+err, "ERR", "setPC", auth.username));
            fs.unlink(p, err => {
                if(err) return endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err), undefined, writeLog("Fehler beim Löschen der PDF: "+err, "ERR", "setPC", auth.username));
                endRes(res, 200, "PDF wurde gelöscht");
            });
    
        });
    }
    catch(err)
    {
        endRes(res, 500, "Internal Server Error\n\n"+JSON.stringify(err), undefined, writeLog("Fehler beim Löschen der PDF: "+err, "ERR", "setPC", auth.username));
    }
    
});

app.get("/setMonitors", async (req, res) =>
{
    if(!req.headers.auth) return endRes(res, 400, "No auth header");
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    let data = JSON.parse(req.headers.data as string) as {PCITNr: string, MonITNr: string[]};
    if(!SessionUser(auth.username, auth.SessionID)) return endRes(res, 404, "Invalid Sesison/Username-Combo", undefined, writeLog("Invalid Sesison/Username-Combo", "ERR", "setMn", auth.username));
    RefreshSession(auth.SessionID);
    SetMonitors(data.MonITNr, data.PCITNr, res, true);
    writeLog(`Monitor ${data.MonITNr} wurde ${data.PCITNr} zugeordnet`, "INF", "setMn", auth.username);
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
    if(request.type == undefined) return endRes(res, 400, "No type", undefined, writeLog("Kein Typ angegeben", "ERR", "getPC", auth.username));
    RefreshSession(auth.SessionID);
    let result = await getEntries(res, request);
    
    if(result != null) 
    {
        //@ts-ignore
        endRes(res, 200, JSON.stringify(result));
    }
});

app.get("/getEntry", async (req, res) => {
    let request = JSON.parse(req.headers.req as string) as IGetEntriesRequest;
    let auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    if(!(await checkAuth(req, res, auth))) return endRes(res, 401, "User not authenticated", undefined, writeLog("User not authenticated", "ERR", "getPC", auth.username));
    if(request.type == undefined) return endRes(res, 400, "No type", undefined, writeLog("Kein Typ angegeben", "ERR", "getPC", auth.username));

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
    const request = JSON.parse(req.headers.device as string) as Item;
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

export const endRes = (res:Response, status:number, message:string, comrpess = false, Log?: Function) => {
    comrpess = false;
    if(comrpess)
    {
        res.setHeader("Content-Encoding", "br");
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(brotliCompressSync(JSON.stringify({message, status})));
    }
    else
    {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({message, status}));
    }
    
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