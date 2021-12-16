import dotenv from "dotenv";
import path from "path";
import os from "os";
dotenv.config({path: path.join(__dirname, "../.env")});

import express, { Request, Response } from 'express';
import fs from 'fs';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import {checkUser} from "./ad";
import {decrypt, encrypt, generateKey} from "./crypto";
import {IAuthRequest, ICheckRequest, IEntryDevices, Item} from "./interface";
import {checkAlreadyLoggedIn, Sessions, checkUser as SessionUser, RefreshSession} from "./session";
import { getEntries } from "./sql";
import {IRecordSet} from "mssql";

import https from "https";
import { setData } from "./logic";

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
    console.log("Auth: ", auth);
    
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
    let request = JSON.parse(req.headers.req as string) as ICheckRequest;
    if(!(await checkAuth(req, res, request))) return;

    RefreshSession(request.SessionID);
    let result = await getEntries(res);
    //Check if result is type of IRecordSet
    if(result != null) endRes(res, 200, JSON.stringify(result));
});

app.get("/getEntry", async (req, res) => {
    let request = JSON.parse(req.headers.req as string) as ICheckRequest;
    if(!(await checkAuth(req, res, request))) return;

    RefreshSession(request.SessionID);
    let result = await getEntries(res);
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
    console.log(req, res);

});

app.put("/", (req, res) => {
    console.log("Put");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.json({
        message: "Hello World",
        status: 200
    });
    console.log(req, res);

});

app.delete("/", (req, res) => {
    console.log("Delete");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.json({
        message: "Hello World",
        status: 200
    });
    console.log(req, res);
});

// Change device data
app.post("/setData", async (req, res) => {
    const auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    const request = JSON.parse(req.headers.device as string) as Item;
    if((await checkAuth(req, res, auth))) return;

    RefreshSession(auth.SessionID);
    setData(request, "POST");
    endRes(res, 200, "Successfully changed data");

});

// Insert device data
app.put("/setData", async(req, res) => {
    if(req.headers.auth === undefined) return endRes(res, 400, "No auth header");
    if(req.headers.device === undefined) return endRes(res, 400, "No req header");
    const auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    const request = JSON.parse(req.headers.device as string).device as Item;
    console.table(auth);
    console.table(request);
    console.log(JSON.stringify(request));
    if(!(await checkAuth(req, res, auth))) return;

    RefreshSession(auth.SessionID);
    console.log("Refreshed");
    
    if(request.kind == "PC") setData(request, "PUT");
    else if(request.kind == "Monitor") setData(request, "PUT");
    else return endRes(res, 400, "Invalid kind");
    endRes(res, 200, "Successfully changed data");
});

// Delete device data
app.delete("/setData", async(req, res) => {
    const auth = JSON.parse(req.headers.auth as string) as ICheckRequest;
    const request = JSON.parse(req.headers.device as string) as Item;
    if((await checkAuth(req, res, auth))) return;

    RefreshSession(auth.SessionID);
    setData(request, "DELETE");
    endRes(res, 200, "Successfully changed data");

});

const credentials: https.ServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '..', 'keys', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'keys', 'cert.pem')),
    maxVersion: 'TLSv1.3',
    minVersion: 'TLSv1.3'
};

https.createServer(credentials, app).listen(5000, "0.0.0.0", () => {
    console.log("Server is running on port 5000");
});

const endRes = (res:Response, status:number, message:string) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        message: message,
        status: status
    }));
}

const assignNewKey = async (res:Response) => {
    let key = generateKey();
    while(Sessions.find(session => session.id === key)) key = generateKey();    
    Sessions.push({id: key, date: new Date()});
    return endRes(res, 200, key);
};
